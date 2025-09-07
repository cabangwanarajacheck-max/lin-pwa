// =============================
// 📦 Helper: Notifikasi Browser
// =============================
function showNotification(title, body) {
  if (Notification.permission === "granted" && navigator.serviceWorker) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) {
        reg.showNotification(title, {
          body: body,
          icon: "icon-192.png"
        });
      }
    });
  }
}

function getAllData() {
  return {
    meta: { app: "LinTsundere", version: 1, exportedAt: new Date().toISOString() },
    reminders, notes, schedules, alarms
  };
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

function exportData() {
  const data = getAllData();
  const filename = "lin-data-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  download(filename, JSON.stringify(data, null, 2));
  addMsg("lin", "nih, data kamu udah aku export. Simpen baik-baik ya 😤");
}

async function importDataFromJSON(json) {
  try {
    const incoming = typeof json === "string" ? JSON.parse(json) : json;

    // payload bisa langsung punya field, atau nested di .data
    const src = (incoming && (incoming.reminders || incoming.notes || incoming.schedules || incoming.alarms))
  ? incoming
  : (incoming && incoming.data) || null;

    if (!src) throw new Error("Format JSON tidak dikenal.");

    const arr = v => Array.isArray(v) ? v : [];

    // Normalisasi bentuk jika ada yang masih string
    reminders = arr(src.reminders).map(x => typeof x === "string" ? { text:x, time:null, repeat:null, done:false } : x);
    notes     = arr(src.notes).map(x => typeof x === "string" ? { text:x, createdAt:new Date().toISOString() } : x);
    schedules = arr(src.schedules).map(x => typeof x === "string" ? { text:x, date:new Date().toISOString().split("T")[0], status:"pending" } : x);
    alarms    = arr(src.alarms).map(x => typeof x === "string" ? { id:"a-"+Date.now(), text:x, time:null, repeat:null, status:"active", createdAt:new Date().toISOString() } : x);

    await saveData();
    addMsg("lin", `import selesai. ${reminders.length} rutinitas, ${notes.length} note, ${schedules.length} jadwal, ${alarms.length} alarm. Jangan ngaco lagi ya 🙄`);
  } catch (err) {
    console.error(err);
    addMsg("lin", "format JSON-nya bikin aku pusing... benerin dulu! 😒");
  }
}

// ==================================
// 📦 IndexedDB Wrapper (Key-Value)
// ==================================
const DB_NAME = "linDB";
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("kv")) {
        db.createObjectStore("kv", { keyPath: "key" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return dbPromise;
}

async function idbSet(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readwrite");
      const store = tx.objectStore("kv");
      store.put({ key, value });
      tx.oncomplete = () => resolve(true);
      tx.onerror = e => reject(e.target.error);
    });
  } catch (e) {
    console.warn("IndexedDB gagal, fallback localStorage", e);
    localStorage.setItem(key, JSON.stringify(value));
  }
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("kv", "readonly");
      const store = tx.objectStore("kv");
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result?.value);
      req.onerror = e => reject(e.target.error);
    });
  } catch (e) {
    console.warn("IndexedDB gagal, fallback localStorage", e);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
}

// =======================
// 🎨 Preferensi Tema
// =======================
async function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  await idbSet("theme", theme);
}

async function loadTheme() {
  let theme = await idbGet("theme");
  if (theme) {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

// =======================
// 📊 State Awal Data
// =======================
let reminders = [];
let notes = [];
let schedules = [];
let alarms = [];
let moods = [];
let currentGame = null;
let suitMode = false; // status game suit
let breathInterval = null;

// =======================
// 📥 Muat Data Pertama
// =======================
async function loadData() {
  reminders = (await idbGet("reminders")) || [];
  notes     = (await idbGet("notes")) || [];
  schedules = (await idbGet("schedules")) || [];
  alarms    = (await idbGet("alarms")) || [];
  moods     = (await idbGet("moods")) || [];

  // 🔄 Migrasi dari localStorage lama → IndexedDB
  if (!reminders.length && localStorage.getItem("reminders")) {
    reminders = JSON.parse(localStorage.getItem("reminders") || "[]");
    notes     = JSON.parse(localStorage.getItem("notes") || "[]");
    schedules = JSON.parse(localStorage.getItem("schedules") || "[]");
    alarms    = JSON.parse(localStorage.getItem("alarms") || "[]");
    migrateData();
    await saveData();
    localStorage.clear();
  }
}

// 💾 Simpan Data ke IndexedDB
async function saveData() {
  await idbSet("reminders", reminders);
  await idbSet("notes", notes);
  await idbSet("schedules", schedules);
  await idbSet("alarms", alarms);
  await idbSet("moods", moods);
renderCards();
}

// Fungsi filter global
function filterCards(keyword) {
  keyword = keyword.toLowerCase();

  // ambil semua .card di tiap container
  document.querySelectorAll('#reminderCards .card, #noteCards .card, #scheduleCards .card, #alarmCards .card')
    .forEach(card => {
      let text = card.innerText.toLowerCase();
      if(text.includes(keyword)){
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
}

// =======================
// 🔍 Search Chat
// =======================
function filterChat(keyword){
  keyword = keyword.toLowerCase();
  document.querySelectorAll('#chat .msg').forEach(msg => {
    let text = msg.innerText.toLowerCase();
    if(text.includes(keyword)){
      msg.parentElement.style.display = ""; // tampilkan pesan
    } else {
      msg.parentElement.style.display = "none"; // sembunyikan pesan
    }
  });
}

document.getElementById("chatSearchInput").addEventListener("input", function(e){
  filterChat(e.target.value);
});

// Listener search
document.getElementById("searchInput").addEventListener("input", function(e){
  filterCards(e.target.value);
});

// =======================
// 🎬 Onboarding Modal
// =======================
async function checkOnboard() {
  let done = await idbGet("onboardDone");
  if (!done) {
    document.getElementById("onboard").classList.remove("hidden");
  }
}
document.getElementById("startBtn").addEventListener("click", async () => {
  document.getElementById("onboard").classList.add("hidden");
  await idbSet("onboardDone", true);
});

// =======================
// 🔄 Migrasi Struktur Data
// =======================
function migrateData() {
  reminders = reminders.map(r => typeof r === "string" ? { text: r, time: null, repeat: null, done: false } : r);
  notes     = notes.map(n => typeof n === "string" ? { text: n, createdAt: new Date().toISOString() } : n);
  schedules = schedules.map(s => typeof s === "string" ? { text: s, date: new Date().toISOString().split("T")[0], status: "pending" } : s);
  alarms    = alarms.map(a => typeof a === "string" ? { id: "a-" + Date.now(), text: a, time: null, repeat: null, status: "active", createdAt: new Date().toISOString() } : a);
}

// =======================
// 💬 UI Chat + TTS
// =======================
let chat = document.getElementById("chat");

function addMsg(sender, text) {
  let wrapper = document.createElement("div");
  wrapper.className = "msg-row " + sender;

  let ava = document.createElement("div");
  ava.className = "avatar " + sender;
  ava.textContent = sender === "lin" ? "L" : "U";

  let div = document.createElement("div");
  div.className = "msg";
  div.innerText = text;

  if (sender === "user") {
    wrapper.appendChild(div);
    wrapper.appendChild(ava);
  } else {
    wrapper.appendChild(ava);
    wrapper.appendChild(div);
  }

  chat.appendChild(wrapper);
  scrollBottom();

  if (sender === "lin") { speakSoft(text); }
}

// 🔊 Text-to-Speech
function speakSoft(text) {
  let utter = new SpeechSynthesisUtterance(text);
  utter.lang = "id-ID";
  utter.pitch = 1.1;
  utter.rate = 0.95;
  let voices = speechSynthesis.getVoices();
  let voice = voices.find(v =>
    v.lang.includes("id") && (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("perempuan"))
  );
  if (voice) utter.voice = voice;
  speechSynthesis.speak(utter);
}

// =======================
// 🧹 Helper Command
// =======================
function cleanCommand(msg) {
  return msg
    .replace(/\blin\b/g, "")
    .replace(/\bbantuin\b/g, "")
    .replace(/\btolong\b/g, "")
    .replace(/\bbuka\b/g, "")
    .trim();
}

// 🚀 Kirim Pesan
function send() {
  let input = document.getElementById("text");
  let text = input.value.trim();
  if (!text) return;
  addMsg("user", text);
  input.value = "";
  handleInput(cleanCommand(text.toLowerCase()));
}

// Event Input (Enter / Ctrl+Enter)
document.getElementById("text").addEventListener("keypress", function (e) {
  if (e.key === "Enter") { send(); }
});

document.getElementById("text").addEventListener("keydown", function (e) {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { send(); }
});

document.getElementById("sendBtn").addEventListener("click", send);

// =======================
// 🎨 Theme Toggle
// =======================
document.getElementById("themeToggle").addEventListener("click", async () => {
  let current = document.documentElement.getAttribute("data-theme");
  let next = current === "dark" ? "light" : "dark";
  await applyTheme(next);
});

// =======================
// 📜 Utils Tambahan
// =======================

// Scroll halus
function scrollBottom() {
  chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
}

// Format list item
function formatList(arr, label) {
  if (arr.length) {
    return label + ":\n" + arr.map((item, i) => {
      if (typeof item === "string") return (i + 1) + ". " + item;
      let waktu = item.time ? ` - ${item.time}` : "";
      return (i + 1) + ". " + item.text + waktu;
    }).join("\n");
  } else {
    return label + " kosong 😒";
  }
}

function renderCards() {
  // Reminder cards
  const rBox = document.getElementById("reminderCards");
  rBox.innerHTML = reminders.map((r, i) => `
    <div class="card ${r.done ? "done" : "pending"}">
      <h3>Rutinitas #${i+1}</h3>
      <p>${r.text}</p>
      <p>${r.time || "tanpa jam"}</p>
      <p>Status: ${r.done ? "✅ selesai" : "⏳ pending"}</p>
      <button onclick="markDone('reminder', ${i})">
        ${r.done ? "↩️ Batal" : "✅ Selesai"}
      </button>
    </div>
  `).join("");

  // Note cards
  const nBox = document.getElementById("noteCards");
  nBox.innerHTML = notes.map((n, i) => `
    <div class="card">
      <h3>Note #${i+1}</h3>
      <p>${n.text}</p>
    </div>
  `).join("");

  // Schedule cards
  const sBox = document.getElementById("scheduleCards");
  sBox.innerHTML = schedules.map((s, i) => `
    <div class="card ${s.status}">
      <h3>Jadwal #${i+1}</h3>
      <p>${s.text}</p>
      <p>${s.date}</p>
      <p>Status: ${s.status}</p>
      <button onclick="markDone('schedule', ${i})">
        ${s.status === "done" ? "↩️ Batal" : "✅ Selesai"}
      </button>
    </div>
  `).join("");

  // Alarm cards
  const aBox = document.getElementById("alarmCards");
  aBox.innerHTML = alarms.map((a, i) => `
    <div class="card ${a.status}">
      <h3>Alarm #${i+1}</h3>
      <p>${a.text}</p>
      <p>${a.time}</p>
      <p>Status: ${a.status}</p>
      <button onclick="markDone('alarm', ${i})">
        ${a.status === "done" ? "↩️ Batal" : "✅ Selesai"}
      </button>
    </div>
  `).join("");

// Mood cards
const mBox = document.getElementById("moodCards");
mBox.innerHTML = moods.slice(-7).map((m, i) => `
  <div class="card">
    <h3>Mood #${moods.length - 6 + i}</h3>
    <p>Skor: ${m.score} / 5</p>
    <p>${m.note || "(tanpa catatan)"}</p>
    <p>${new Date(m.date).toLocaleDateString("id-ID")}</p>
  </div>
`).join("") + `
  <div class="card">
    <h3>+ Tambah Mood</h3>
    <div class="mood-scale">
      ${[1,2,3,4,5].map(v=>`
        <button class="mood-btn" onclick="addMood(${v})">${v}</button>
      `).join("")}
    </div>
    <input type="text" id="moodNote" placeholder="Catatan singkat..." style="margin-top:6px;width:100%;padding:6px;border-radius:6px;border:1px solid #ccc;">
    <canvas id="moodChart"></canvas>
  </div>
`;

// Render grafik
if (document.getElementById("moodChart")) {
  let ctx = document.getElementById("moodChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: moods.slice(-7).map(m => new Date(m.date).toLocaleDateString("id-ID")),
      datasets: [{
        label: "Mood (1-5)",
        data: moods.slice(-7).map(m => m.score),
        borderColor: "#e91e63",
        backgroundColor: "rgba(233,30,99,0.2)",
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      scales: {
        y: { min: 1, max: 5, ticks: { stepSize: 1 } }
      }
    }
  });
}
}

function markDone(type, index) {
  if (type === "reminder" && reminders[index]) {
    reminders[index].done = !reminders[index].done;
  }
  if (type === "schedule" && schedules[index]) {
    schedules[index].status = (schedules[index].status === "done") ? "pending" : "done";
  }
  if (type === "alarm" && alarms[index]) {
    alarms[index].status = (alarms[index].status === "done") ? "active" : "done";
  }
  saveData();
  renderCards();
}

function addMood(score) {
  let note = document.getElementById("moodNote").value.trim();
  moods.push({
    score,
    note,
    date: new Date().toISOString()
  });
  saveData();
  addMsg("lin", `hmm.. jadi mood kamu hari ini ${score}/5 ya? Catet nih 🙄`);
}

function startBreath() {
  document.getElementById("breathModal").classList.remove("hidden");
  let circle = document.getElementById("breathCircle");
  let text = document.getElementById("breathText");

  let step = 0;
  breathInterval = setInterval(() => {
    step = (step + 1) % 3;
    if (step === 0) { 
      text.textContent = "Tarik napas (4 detik)...";
      circle.style.transform = "scale(1.5)";
    }
    else if (step === 1) {
      text.textContent = "Tahan (4 detik)...";
      circle.style.transform = "scale(1.5)";
    }
    else if (step === 2) {
      text.textContent = "Buang napas (6 detik)...";
      circle.style.transform = "scale(1)";
    }
  }, 4000);
}

function closeBreath() {
  document.getElementById("breathModal").classList.add("hidden");
  clearInterval(breathInterval);
}

// Parsing waktu natural
function parseTime(text) {
  text = text.toLowerCase();
  let now = new Date();

  // 1️⃣ Format "1 menit lagi" / "10 menit lagi" / "2 jam lagi"
  let m = text.match(/(\d+)\s*menit lagi/);
  if (m) {
    now.setMinutes(now.getMinutes() + parseInt(m[1]));
    return now.toTimeString().slice(0,5);
  }
  m = text.match(/(\d+)\s*jam lagi/);
  if (m) {
    now.setHours(now.getHours() + parseInt(m[1]));
    return now.toTimeString().slice(0,5);
  }

  // 2️⃣ Format "jam setengah 4" (berarti 03:30)
  let half = text.match(/setengah\s*(\d{1,2})/);
  if (half) {
    let h = parseInt(half[1]) - 1; // setengah 4 = jam 3 lewat 30
    if (text.includes("sore") || text.includes("malam") || text.includes("siang")) {
      if (h < 12) h += 12;
    }
    return ("0" + h).slice(-2) + ":30";
  }

  // 3️⃣ Format "jam 12 30an siang"
  let fuzzy = text.match(/jam\s*(\d{1,2})\s*(\d{2})/);
  if (fuzzy) {
    let h = parseInt(fuzzy[1]);
    let mnt = parseInt(fuzzy[2]);
    if (text.includes("siang") || text.includes("sore") || text.includes("malam")) {
      if (h < 12) h += 12;
    }
    return ("0" + h).slice(-2) + ":" + ("0" + mnt).slice(-2);
  }

  // 4️⃣ Format standar lama: "jam 7", "jam 7.30", "19:45"
  let match = text.match(/jam\s*(\d{1,2})([:.](\d{2}))?/);
  if (match) {
    let hour = parseInt(match[1]);
    let minute = match[3] ? parseInt(match[3]) : 0;
    if (text.includes("pagi")) {
      if (hour === 12) hour = 0;
    } else if (text.includes("siang") || text.includes("sore") || text.includes("malam")) {
      if (hour < 12) hour += 12;
    }
    if (hour > 23) hour = 23;
    if (minute > 59) minute = 59;
    return ("0" + hour).slice(-2) + ":" + ("0" + minute).slice(-2);
  }

  return null;
}
// Parsing repeat
function parseRepeat(text) {
  text = text.toLowerCase();
  if (text.includes("tiap hari")) return "daily";
  let days = [];
  let daftarHari = ["minggu","senin","selasa","rabu","kamis","jumat","sabtu"];
  daftarHari.forEach(h => { if (text.includes(h)) days.push(h); });
  return days.length ? days : null;
}

// Bersihin teks alarm
function cleanTextForAlarm(text) {
  let cleaned = text.toLowerCase();
  cleaned = cleaned.replace(/\b(note|rutinitas|jadwal|alarm)\b/g, "");
  cleaned = cleaned.replace(/\b(jam|pagi|siang|sore|malam|tiap|hari|senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned || "aktivitasmu";
}

// =======================
// ⏰ Alarm System
// =======================
function addAlarm(text) {
  let time = parseTime(text);
  let core = cleanTextForAlarm(text);
  let repeat = parseRepeat(text) || null;
  if (time) {
    alarms.push({
      id: "a-" + Date.now(),
      text: core,
      time: time,
      repeat: repeat,
      status: "active",
      createdAt: new Date().toISOString()
    });
    saveData();
  }
}

// Cek alarm tiap menit
setInterval(() => {
  let now = new Date();
  let hh = ("0" + now.getHours()).slice(-2);
  let mm = ("0" + now.getMinutes()).slice(-2);
  let current = hh + ":" + mm;
  let day = ["minggu","senin","selasa","rabu","kamis","jumat","sabtu"][now.getDay()];

  alarms.forEach(a => {
    let matchHari = false;
    if (a.repeat === "daily") matchHari = true;
    else if (Array.isArray(a.repeat)) matchHari = a.repeat.includes(day);
    else matchHari = true;

    if (matchHari && a.time === current && a.status === "active") {
      addMsg("lin", `Hei! sekarang jam ${a.time}, waktunya ${a.text}! 😤`);
      showNotification("Lin Tsundere ⏰", `Hei! Waktunya ${a.text}! Jangan males!`);
      if (a.repeat) a.status = "active"; else a.status = "done";
      saveData();
    }
  });
}, 60000);

// =======================
// 🎮 Command Handler
// =======================
function handleInput(msg) {
  // Slash command cepat
  if (msg.startsWith("/export")) { exportData(); return; }
  if (msg.startsWith("/import")) {
    document.getElementById("importFile").click();
    addMsg("lin", "pilih file JSON-mu ya.");
    return;
  }

// Latihan Napas
if (msg.startsWith("/napas") || msg.includes("latihan napas")) {
  startBreath();
  addMsg("lin", "ayo, ikutin aku napas 4-4-6 biar tenang 😌");
  return;
}

// =======================
// 🎮 Mini Game: Suit
// =======================
if (msg.startsWith("/suit")) {
  suitMode = true;
  addMsg("lin", "oke, ayo main suit! Pilih: batu, gunting, atau kertas ✊✌️🖐️");
  return;
}

if (suitMode) {
  let choices = ["batu", "gunting", "kertas"];
  if (choices.includes(msg)) {
    suitMode = false; // reset setelah 1 ronde
    let linChoice = choices[Math.floor(Math.random() * 3)];

    let result = "";
    if (msg === linChoice) {
      result = "seri 🙄";
    } else if (
      (msg === "batu" && linChoice === "gunting") ||
      (msg === "gunting" && linChoice === "kertas") ||
      (msg === "kertas" && linChoice === "batu")
    ) {
      result = "ya ampun... kamu menang 😤";
    } else {
      result = "haha, aku menang 😎";
    }

    addMsg("lin", `kamu pilih **${msg}**, aku pilih **${linChoice}** → ${result}`);
    return;
  } else {
    addMsg("lin", "pilihannya cuma batu, gunting, atau kertas ya 😒");
    return;
  }
}

  // =======================
  // 🎮 Mini Game: Tebak Angka
  // =======================
  if (msg.startsWith("/game")) {
    currentGame = {
      answer: Math.floor(Math.random() * 10) + 1, // angka 1–10 random
      tries: 0
    };
    addMsg("lin", "udah aku pikirin angka 1–10. Coba tebak kalau berani 😏");
    return;
  }

  if (currentGame) {
    let guess = parseInt(msg); // cek input user angka
    if (!isNaN(guess)) {
      currentGame.tries++;
      if (guess === currentGame.answer) {
        addMsg("lin", `huh... kamu bisa nebak juga? Angkaku memang ${guess}. 🎉 (percobaan ke-${currentGame.tries})`);
        currentGame = null; // reset game
      } else if (guess < currentGame.answer) {
        addMsg("lin", "salah~ angkamu terlalu kecil 😒");
      } else {
        addMsg("lin", "hehe, kebesaran itu 🙄");
      }
      return; // biar nggak lanjut ke handler lain
    }
  }

  
   // Rutinitas
  if (msg.includes("rutinitas")) {
}

// Slash command cepat
if (msg.startsWith("/export")) { exportData(); return; }
if (msg.startsWith("/import")) {
  document.getElementById("importFile").click();
  addMsg("lin", "pilih file JSON-mu ya.");
  return;
}
  // Rutinitas
  if (msg.includes("rutinitas")) {
    let time = parseTime(msg);
    let repeat = parseRepeat(msg);
    let core = cleanTextForAlarm(msg);
    reminders.push({ text: core, time, repeat, done: false });
    saveData();
    addMsg("lin", `udah aku masukin rutinitas: "${core}" jam ${time||"tanpa jam"} 😤`);
  }

  // Note
  else if (msg.includes("note")) {
    let core = msg.replace("note", "").trim();
    notes.push({ text: core, createdAt: new Date().toISOString() });
    saveData();
    addMsg("lin", `udah aku catet di note: "${core}" 📝`);
  }

  // Jadwal
  else if (msg.includes("jadwal")) {
    if (msg.includes("apa") || msg.includes("ada") || msg.includes("lihat")) {
      addMsg("lin", formatList(schedules, "jadwalmu"));
    } else {
      let core = msg.replace("jadwal", "").trim();
      schedules.push({ text: core, date: new Date().toISOString().split("T")[0], status:"pending" });
      saveData();
      addMsg("lin", `oke, aku masukin ke jadwalmu: "${core}" 📅`);
    }
  }

  // Alarm
  else if (msg.includes("alarm")) {
    if (msg.includes("lihat")) {
      if (alarms.length) {
        let list = "alarm aktif:\n" + alarms.map((a,i)=>{
          let repeatInfo = a.repeat==="daily"?"tiap hari": Array.isArray(a.repeat)?a.repeat.join(", "):"sekali";
          return (i+1)+". "+a.time+" "+a.text+" ("+repeatInfo+", "+a.status+")";
        }).join("\n");
        addMsg("lin", list);
      } else addMsg("lin", "nggak ada alarm yang aktif 😑");
    } else {
      addAlarm(msg);
      addMsg("lin", "oke alarmnya udah aku set ⏰");
    }
  }

  // Hapus data
  else if (msg.includes("hapus")) {
    let targetArr = null;
    if (msg.includes("rutinitas")) targetArr = reminders;
    else if (msg.includes("note")) targetArr = notes;
    else if (msg.includes("jadwal")) targetArr = schedules;
    else if (msg.includes("alarm")) targetArr = alarms;

    if (targetArr) {
      if (msg.includes("semua")) {
        targetArr.length = 0;
        saveData();
        addMsg("lin", "semua data udah aku hapus. puas? 😒");
      }
      else if (msg.includes("terakhir")) {
        let removed = targetArr.pop();
        saveData();
        if (removed&&text) addMsg("lin", `${removed.text} udah aku hapus 🙄`);
      }
      else if (msg.match(/ke-\d+/)) {
        let index = parseInt(msg.match(/ke-(\d+)/)[1]) - 1;
        if (targetArr[index]) {
          let removed = targetArr.splice(index,1)[0];
          saveData();
          if (removed&&text) addMsg("lin", `udah aku hapus: "${removed.text}" 🙄`);
        }
      }
    }
  }

  // Edit data
  else if (msg.includes("edit") && msg.match(/ke-\d+/) && msg.includes("jadi")) {
    let index = parseInt(msg.match(/ke-(\d+)/)[1]) - 1;
    let newText = msg.split("jadi")[1].trim();
    if (msg.includes("rutinitas") && reminders[index]) {
      reminders[index].text = newText;
      saveData();
      addMsg("lin", `rutinitas ke-${index+1} udah aku ganti jadi "${newText}" 😤`);
    }
    else if (msg.includes("note") && notes[index]) {
      notes[index].text = newText;
      saveData();
      addMsg("lin", `note ke-${index+1} udah aku ganti jadi "${newText}" 🙄`);
    }
    else if (msg.includes("jadwal") && schedules[index]) {
      schedules[index].text = newText;
      saveData();
      addMsg("lin", `jadwal ke-${index+1} udah aku ganti jadi "${newText}" 😏`);
    }
    else if (msg.includes("alarm") && alarms[index]) {
      alarms[index].text = newText;
      saveData();
      addMsg("lin", `alarm ke-${index+1} udah aku ganti jadi "${newText}" ⏰`);
    }
  }

  // Help
  else if (msg.includes("fitur") || msg.includes("help")) {
    addMsg("lin", "fiturku: rutinitas, note, jadwal, alarm, hapus/edit data, notifikasi, tema, onboarding 😤");
  }

  // Fallback
  else {
    let replies = [
      "huh? aku nggak ngerti maksudmu 😒",
      "jelasin yang bener dong...",
      "apaan sih, bikin ribet aja 🙄"
    ];
    addMsg("lin", replies[Math.floor(Math.random()*replies.length)]);
  }
}

// =======================
// 🚀 Init Pertama
// =======================
(async function init(){
  document.getElementById("text").focus();
  await loadData();
  await loadTheme();
  await checkOnboard();

  
 document.getElementById("exportBtn").addEventListener("click", exportData);

document.getElementById("importBtn").addEventListener("click", () => {
  document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", function () {
  const file = (this.files || [])[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    importDataFromJSON(e.target.result);
    this.value = ""; // reset input
  };
  reader.readAsText(file);
});

  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }

  addMsg("lin", "Huh? Jadi kamu yang udah instal aku? Jangan bikin aku nyesel ya 😤");
})();

speechSynthesis.onvoiceschanged = () => {
  speechSynthesis.getVoices();
};