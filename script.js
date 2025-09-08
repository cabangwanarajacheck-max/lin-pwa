// =============================
// 🔴 IndexedDB Setup + Fallback
// =============================
const DB_NAME = "linDB";
const DB_VERSION = 2; // versi dinaikkan biar objectStore lengkap
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      console.warn("IndexedDB tidak tersedia, fallback ke localStorage");
      resolve(null);
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      db = e.target.result;

      if (!db.objectStoreNames.contains("reminders")) {
        db.createObjectStore("reminders", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("notes")) {
        db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("schedules")) {
        db.createObjectStore("schedules", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("moods")) {
        db.createObjectStore("moods", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains("pet")) {
        db.createObjectStore("pet", { keyPath: "id" });
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    req.onerror = (e) => {
      console.error("DB error:", e);
      reject(e);
    };
  });
}

function dbGetAll(store) {
  return new Promise((resolve) => {
    if (!db) { // fallback localStorage
      if (store === "pet") {
        const p = JSON.parse(localStorage.getItem("pet") || '{"streak":0,"lastActive":""}');
        resolve([p]);
      } else {
        resolve(JSON.parse(localStorage.getItem(store) || "[]"));
      }
      return;
    }
    const tx = db.transaction(store, "readonly");
    const os = tx.objectStore(store);
    const req = os.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

function dbSetAll(store, data) {
  return new Promise((resolve) => {
    if (!db) { // fallback localStorage
      if (store === "pet") {
        localStorage.setItem("pet", JSON.stringify(data[0] || { streak: 0, lastActive: "" }));
      } else {
        localStorage.setItem(store, JSON.stringify(data));
      }
      resolve();
      return;
    }
    const tx = db.transaction(store, "readwrite");
    const os = tx.objectStore(store);
    os.clear();
    (data || []).forEach((item) => os.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// =============================
// 🔴 Variabel Global
// =============================
let reminders = [];
let notes = [];
let schedules = [];
let moods = [];
let pet = { streak: 0, lastActive: "" };
let pendingAction = null;
let gameNumber = null;

// =============================
// 💾 Load & Save
// =============================
async function loadData() {
  reminders = await dbGetAll("reminders");
  notes = await dbGetAll("notes");
  schedules = await dbGetAll("schedules");
  moods = await dbGetAll("moods");
  pet = (await dbGetAll("pet"))[0] || { streak: 0, lastActive: "" };
  renderCards();
}

async function saveData() {
  await dbSetAll("reminders", reminders);
  await dbSetAll("notes", notes);
  await dbSetAll("schedules", schedules);
  await dbSetAll("moods", moods);
  await dbSetAll("pet", [pet]);
  renderCards();
}

// =============================
// 📦 Render Cards
// =============================
function renderCards() {
  const rBox = document.getElementById("reminderCards");
  const nBox = document.getElementById("noteCards");
  const sBox = document.getElementById("scheduleCards");
  const mBox = document.getElementById("moodCards");
  const pBox = document.getElementById("petCard");

  rBox.innerHTML = reminders.map((r, i) =>
    `<div class="card"><h3>Rutinitas #${i+1}</h3><p>${escapeHtml(r.text || "")}</p></div>`
  ).join("");

  nBox.innerHTML = notes.map((n, i) =>
    `<div class="card"><h3>Catatan #${i+1}</h3><p>${escapeHtml(n.text || "")}</p></div>`
  ).join("");

  sBox.innerHTML = schedules.map((s, i) =>
    `<div class="card"><h3>Jadwal #${i+1}</h3><p>${escapeHtml(s.text || "")}</p></div>`
  ).join("");

  mBox.innerHTML = moods.map((m, i) =>
    `<div class="card"><h3>Mood #${i+1}</h3><p>${escapeHtml(m.text || "")}</p></div>`
  ).join("");

  pBox.innerHTML = `<div class="card"><h3>Virtual Pet 🐾</h3><p>Streak: ${pet.streak || 0} hari</p></div>`;
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c])
  );
}

// =============================
// 📦 Export / Import JSON
// =============================
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

if (exportBtn) {
  exportBtn.onclick = async () => {
    const data = { reminders, notes, schedules, moods, pet };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lin-data.json"; a.click();
    URL.revokeObjectURL(url);
    addMsg("lin", "Hmph, aku udah siapin file backup kamu. Jangan hilangin, ya 🙄");
  };
}

if (importBtn) {
  importBtn.onclick = () => importFile?.click();
}
if (importFile) {
  importFile.onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text || "{}");
      reminders = Array.isArray(data.reminders) ? data.reminders : [];
      notes = Array.isArray(data.notes) ? data.notes : [];
      schedules = Array.isArray(data.schedules) ? data.schedules : [];
      moods = Array.isArray(data.moods) ? data.moods : [];
      pet = data.pet && typeof data.pet === "object" ? data.pet : { streak:0, lastActive:"" };
      await saveData();
      addMsg("lin", "Udah aku impor. Jangan bikin berantakan lagi, ngerti?! 😤");
      showNotification("Import Berhasil", "Data kamu sudah dipulihkan.");
    } catch (err) {
      console.error(err);
      addMsg("lin", "File-nya apaan sih? Itu bukan JSON yang bener 🙄");
    } finally {
      e.target.value = "";
    }
  };
}

// =============================
// 🌗 Theme Toggle
// =============================
function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("theme", next); } catch {}
}
const themeBtn = document.getElementById("themeToggle");
if (themeBtn) themeBtn.onclick = toggleTheme;
(function initTheme(){
  const saved = (localStorage.getItem("theme") || "light");
  document.documentElement.setAttribute("data-theme", saved);
})();

// =============================
// 🔔 Browser Notifications
// =============================
function requestNotifPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") Notification.requestPermission();
}
function showNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg) reg.showNotification(title, { body, icon: "icon-192.png" });
      else new Notification(title, { body, icon: "icon-192.png" });
    });
  } else {
    new Notification(title, { body, icon: "icon-192.png" });
  }
}

// =============================
// 📝 Ringkasan Harian
// =============================
function makeRecap(when) {
  return [
    `Recap ${when}:`,
    `📌 Rutinitas: ${reminders.length}`,
    `📒 Catatan: ${notes.length}`,
    `📅 Jadwal: ${schedules.length}`,
    `📊 Mood tercatat: ${moods.length}`,
    `🐾 Streak: ${pet.streak || 0}`
  ].join("\n");
}

let lastRecapKey = "";
function checkDailyRecap() {
  const now = new Date();
  const h = now.getHours();
  const keyDate = now.toISOString().slice(0,10);
  if (h === 7) {
    const key = keyDate + "|pagi";
    if (lastRecapKey !== key) {
      lastRecapKey = key;
      const msg = makeRecap("pagi");
      addMsg("lin", `Heh, bangun! ${msg}`);
      showNotification("Recap Pagi", "Jangan malas, cek rutinitas & jadwalmu!");
    }
  } else if (h === 21) {
    const key = keyDate + "|malam";
    if (lastRecapKey !== key) {
      lastRecapKey = key;
      const msg = makeRecap("malam");
      addMsg("lin", `Udahan mainnya. ${msg}`);
      showNotification("Recap Malam", "Saatnya review hari ini.");
    }
  }
}
setInterval(checkDailyRecap, 60000);

// =============================
// 💬 Chat Message
// =============================
function addMsg(sender, text) {
  const chat = document.getElementById("chat");
  const row = document.createElement("div");
  row.className = "msg-row " + sender;

  const avatar = document.createElement("div");
  avatar.className = "avatar " + sender;
  avatar.textContent = sender === "lin" ? "L" : "U";

  const msg = document.createElement("div");
  msg.className = "msg";
  msg.textContent = text;

  row.appendChild(avatar);
  row.appendChild(msg);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

// =============================
// 🎮 Scene Manager
// =============================
function playScene(id) {
  if (typeof id === "function") { id(); return; }
  const scene = scenes[id];
  if (!scene) return;
  addMsg("lin", scene.text);
  if (scene.choices && scene.choices.length > 0) {
    const chat = document.getElementById("chat");
    const btnRow = document.createElement("div");
    btnRow.className = "choice-row";
    scene.choices.forEach((c) => {
      const btn = document.createElement("button");
      btn.textContent = c.label;
      btn.onclick = () => {
        addMsg("user", c.label);
        chat.removeChild(btnRow);
        playScene(c.next);
      };
      btnRow.appendChild(btn);
    });
    chat.appendChild(btnRow);
    chat.scrollTop = chat.scrollHeight;
  }
}

// =============================
// 📝 Input Handler
// =============================
function send() {
  const input = document.getElementById("text");
  const text = input.value.trim();
  if (!text) return;
  addMsg("user", text);
  input.value = "";

  if (pendingAction) {
    handlePendingAction(text);
  } else {
    addMsg("lin", "Hei! Jangan ngetik sembarangan, pilih aja 🙄");
  }
}

async function handlePendingAction(text) {
  if (pendingAction === "add_reminder") {
    reminders.push({ text, time: null, done: false });
    await saveData();
    addMsg("lin", `Udah aku catet: "${text}". Jangan males ngerjain ya 😤`);
    showNotification("Rutinitas dibuat", text);
  } else if (pendingAction === "add_note") {
    notes.push({ text, createdAt: new Date().toISOString() });
    await saveData();
    addMsg("lin", `Catatan "${text}" udah aku simpen 🙄`);
    showNotification("Catatan disimpan", text);
  } else if (pendingAction === "add_schedule") {
    schedules.push({ text, date: null, done: false });
    await saveData();
    addMsg("lin", `Jadwal "${text}" udah aku atur... jangan telat! 😒`);
    showNotification("Jadwal dibuat", text);
  } else if (pendingAction === "add_mood") {
    moods.push({ text, date: new Date().toISOString() });
    await saveData();
    addMsg("lin", `Mood kamu "${text}" udah aku catet. Jangan pura-pura kuat 🙄`);
  } else if (pendingAction === "game_tebak") {
    const guess = parseInt(text, 10);
    if (isNaN(guess)) {
      addMsg("lin", "Itu bukan angka, dasar bego! 😤");
      return;
    } else if (guess === gameNumber) {
      addMsg("lin", `...Hmph, iya benar ${guess}. Jangan senyum-senyum gitu! 🙈`);
      pendingAction = null;
      hideInput();
      playScene("intro");
      return;
    } else {
      addMsg("lin", `Salah! Bukan ${guess}. Coba lagi kalau berani 😏`);
      return;
    }
  }

  pendingAction = null;
  hideInput();
  playScene("intro");
}

// =============================
// 🎭 Show/Hide Input
// =============================
function showInput(placeholder = "Ketik di sini...") {
  const box = document.getElementById("input");
  const text = document.getElementById("text");
  box.classList.remove("hidden");
  text.placeholder = placeholder;
  text.focus();
}
function hideInput() {
  document.getElementById("input").classList.add("hidden");
  document.getElementById("text").value = "";
}

// =============================
// 📚 Scene Definitions
// =============================
const scenes = {
  intro: {
    text: "Hei! Mau ngapain hari ini? Jangan manja sama aku 🙄",
    choices: [
      { label: "Rutinitas", next: "menu_rutinitas" },
      { label: "Catatan", next: "menu_catatan" },
      { label: "Jadwal", next: "menu_jadwal" },
      { label: "Mood", next: "menu_mood" },
      { label: "Game", next: "menu_game" },
      { label: "Quotes/Jokes", next: "menu_fun" }
    ]
  },

  // === Rutinitas ===
  menu_rutinitas: {
    text: "Rutinitas ya? Mau bikin baru atau lihat daftar?",
    choices: [
      { label: "Tambah rutinitas", next: "add_rutinitas_step1" },
      { label: "Lihat semua", next: () => {
          if (!reminders.length) addMsg("lin", "Rutinitas kamu kosong, payah 🙄");
          else addMsg("lin", "Rutinitas:\n" + reminders.map((r,i)=>`${i+1}. ${r.text}`).join("\n"));
          playScene("intro");
        }},
      { label: "Balik", next: "intro" }
    ]
  },
  add_rutinitas_step1: {
    text: "Hah?! Emang kamu bisa disiplin? 😤",
    choices: [
      { label: "Tentu aja bisa!", next: "add_rutinitas_step2" },
      { label: "Kayaknya nggak deh 😅", next: "add_rutinitas_step2" }
    ]
  },
  add_rutinitas_step2: {
    text: "Hmph, bodo amat! Kalau kamu serius...",
    choices: [
      { label: "Aku serius kok 🙄", next: () => {
          addMsg("lin", "Ya udah, coba tulis rutinitasmu di bawah 🙄");
          pendingAction = "add_reminder";
          showInput("contoh: jam 7 pagi bangun");
        }}
    ]
  },

  // === Catatan ===
  menu_catatan: {
    text: "Catatan? Jangan-jangan kamu tulis nama aku ya 😏",
    choices: [
      { label: "Tambah catatan", next: "add_catatan_step1" },
      { label: "Lihat catatan", next: () => {
          if (!notes.length) addMsg("lin", "Catatanmu kosong 🙄");
          else addMsg("lin", "Catatan:\n" + notes.map((n,i)=>`${i+1}. ${n.text}`).join("\n"));
          playScene("intro");
        }},
      { label: "Balik", next: "intro" }
    ]
  },
  add_catatan_step1: {
    text: "Catatan? Jangan-jangan isinya nama aku lagi 😏",
    choices: [
      { label: "Iya dong 😳", next: "add_catatan_step2" },
      { label: "Bukan lah!", next: "add_catatan_step2" }
    ]
  },
  add_catatan_step2: {
    text: "Dasar aneh... yaudah deh.",
    choices: [
      { label: "Aku tulis sekarang!", next: () => {
          addMsg("lin", "Tulis catatanmu di bawah, jangan aneh-aneh 😒");
          pendingAction = "add_note";
          showInput("contoh: beli kopi");
        }}
    ]
  },

  // === Jadwal ===
  menu_jadwal: {
    text: "Jadwal? Jangan-jangan kamu sering telat ya 🙄",
    choices: [
      { label: "Tambah jadwal", next: "add_jadwal_step1" },
      { label: "Lihat jadwal", next: () => {
          if (!schedules.length) addMsg("lin", "Jadwalmu kosong 🙄");
          else addMsg("lin", "Jadwal:\n" + schedules.map((s,i)=>`${i+1}. ${s.text}`).join("\n"));
          playScene("intro");
        }},
      { label: "Balik", next: "intro" }
    ]
  },
  add_jadwal_step1: {
    text: "Yakin bisa patuh sama jadwal? Jangan PHP ya 😒",
    choices: [
      { label: "Pasti bisa!", next: "add_jadwal_step2" },
      { label: "Hmm... coba aja dulu", next: "add_jadwal_step2" }
    ]
  },
  add_jadwal_step2: {
    text: "Baiklah... aku kasih kesempatan.",
    choices: [
      { label: "Oke, aku tulis!", next: () => {
          addMsg("lin", "Tulis jadwalmu di bawah, jangan telat! 😤");
          pendingAction = "add_schedule";
          showInput("contoh: Rapat jam 9 pagi");
        }}
    ]
  },

  // === Mood ===
  menu_mood: {
    text: "Mood kamu hari ini gimana? Jangan jawab 'b aja' 😒",
    choices: [
      { label: "Isi mood sekarang", next: "add_mood_step1" },
      { label: "Lihat mood", next: () => {
          if (!moods.length) addMsg("lin", "Moodmu belum ada 🙄");
          else addMsg("lin", "Mood:\n" + moods.map((m,i)=>`${i+1}. ${m.text}`).join("\n"));
          playScene("intro");
        }},
      { label: "Balik", next: "intro" }
    ]
  },
  add_mood_step1: {
    text: "Jangan bohong soal perasaanmu, aku bisa tau kok 😏",
    choices: [
      { label: "Serius, aku jujur!", next: "add_mood_step2" },
      { label: "Eh, ketahuan ya 😅", next: "add_mood_step2" }
    ]
  },
  add_mood_step2: {
    text: "Ya udah... coba tulis moodmu sekarang.",
    choices: [
      { label: "Oke!", next: () => {
          addMsg("lin", "Tulis mood kamu di bawah ya 🙄");
          pendingAction = "add_mood";
          showInput("contoh: Senang, sedih, capek");
        }}
    ]
  },

  // === Game ===
  menu_game: {
    text: "Mau main apa sih sama aku? 😒",
    choices: [
      { label: "Tebak Angka", next: "game_tebak_start" },
      { label: "Balik", next: "intro" }
    ]
  },
  game_tebak_start: {
    text: "Aku udah milih angka 1 sampai 10... coba tebak kalau berani! 🙄",
    choices: [
      { label: "Mulai tebak!", next: () => {
          gameNumber = Math.floor(Math.random() * 10) + 1;
          pendingAction = "game_tebak";
          showInput("Tebak angkanya (1-10)...");
        }}
    ]
  },

  // === Fun ===
  menu_fun: {
    text: "Heh, kamu nyari hiburan dariku? Dasar aneh 😤",
    choices: [
      { label: "Kutipan semangat", next: () => showQuote("quote") },
      { label: "Jokes receh", next: () => showQuote("joke") },
      { label: "Balik", next: "intro" }
    ]
  }
};

// =============================
// 😂 Quotes & Jokes
// =============================
const quotes = [
  "Kamu lebih kuat dari yang kamu kira 🙄",
  "Jangan males, nanti aku yang repot 😤",
  "Sekali gagal nggak berarti kamu pecundang selamanya, ngerti?!"
];

const jokes = [
  "Kenapa laptop nggak bisa tidur? ... Karena masih ada *task manager*! 🤭",
  "Tahu nggak bedanya kamu sama kopi? ... Kopi bikin melek, kalau kamu bikin deg-degan 🙈",
  "Aku bukan kalkulator... tapi aku bisa hitung perasaanmu kok 🙄"
];

function showQuote(type) {
  const arr = type === "quote" ? quotes : jokes;
  const item = arr[Math.floor(Math.random() * arr.length)];
  addMsg("lin", item);
  playScene("intro");
}

// =============================
// 🚀 Init
// =============================
window.onload = async () => {
  await openDB();
  await loadData();
  playScene("intro");

  const sendBtn = document.getElementById("sendBtn");
  const textInput = document.getElementById("text");
  if (sendBtn) sendBtn.onclick = send;
  if (textInput) textInput.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });

  requestNotifPermission();
  checkDailyRecap();
};

// =============================
// 🎨 Live2D / PIXI Setup
// =============================
const app = new PIXI.Application({
  view: document.getElementById("linCanvas"),
  autoStart: true,
  transparent: true,
  resizeTo: window,
});

// 🔧 Resize handler
function resizeCanvas(model) {
  if (!app || !model) return;
  app.renderer.resize(window.innerWidth, window.innerHeight);

  // Posisi tengah bawah layar
  model.x = app.renderer.width / 2;
  model.y = app.renderer.height;

  if (window.innerWidth <= 768) {
    // 📱 HP → zoom in, setengah badan
    model.scale.set(1.5);
  } else {
    // 💻 Desktop → auto fit biar full body kelihatan
    const scale = Math.min(
      window.innerWidth / model.width * 0.8,   // fit lebar
      window.innerHeight / model.height * 0.8 // fit tinggi
    );
    model.scale.set(scale);
  }
}

(async () => {
  const model = await PIXI.live2d.Live2DModel.from("models/hiyori/hiyori_pro_t11.model3.json");
  app.stage.addChild(model);

  // Anchor ke bawah tengah
  model.anchor.set(1.4, 1.13);

  // 🚀 Resize awal + event listener
  resizeCanvas(model);
  window.addEventListener("resize", () => resizeCanvas(model));

  // 📌 Random idle motion tiap 10–15 detik
  function playRandomIdle() {
    const motions = ["Idle", "TapBody", "Happy"];
    const random = motions[Math.floor(Math.random() * motions.length)];
    model.motion(random);
  }
  setInterval(playRandomIdle, 10000 + Math.random() * 5000);

  // 📌 Eye tracking
  app.stage.interactive = true;
  app.stage.on("pointermove", e => {
    const pos = e.data.global;
    model.focus(pos.x, pos.y);
  });

  // 📌 Drag & drop
  model.interactive = true;
  model.buttonMode = true;
  let dragging = false;
  let offset = { x: 0, y: 0 };

  model.on("pointerdown", e => {
    dragging = true;
    offset.x = e.data.global.x - model.x;
    offset.y = e.data.global.y - model.y;
  });

  app.stage.on("pointermove", e => {
    if (dragging) {
      model.x = e.data.global.x - offset.x;
      model.y = e.data.global.y - offset.y;
    }
  });

  app.stage.on("pointerupoutside", () => dragging = false);
  app.stage.on("pointerup", () => dragging = false);

  // 📌 HitAreas
  model.on("hit", hitAreas => {
    if (hitAreas.includes("Head")) model.motion("TapHead");
    if (hitAreas.includes("Body")) model.motion("TapBody");
  });

  // 📌 Klik kiri / kanan untuk mood
  model.on("pointerdown", e => {
    const pos = e.data.global;
    if (pos.x < model.x) {
      model.motion("Angry");
    } else if (pos.x > model.x + model.width) {
      model.motion("Happy");
    }
  });

  // 📌 Reaksi tombol Kirim
  document.getElementById("sendBtn").addEventListener("click", () => {
    const inputVal = document.getElementById("text").value.toLowerCase();
    if (inputVal.includes("marah") || inputVal.includes("kesal")) {
      model.motion("Angry");
    } else if (inputVal.includes("senang") || inputVal.includes("happy")) {
      model.motion("Happy");
    } else {
      model.motion("TapBody");
    }
  });
})();