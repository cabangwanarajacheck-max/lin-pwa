// =============================
// 📦 Import dependencies
// =============================
import { dbGetAll, dbSetAll } from "./db.js";
import { addMsg } from "./chat.js";
import { setBackgroundForFeature } from "./background.js";  // ✅ dipindah ke atas

// =============================
// 🔴 Variabel Global
// =============================
let reminders = [];
let notes = [];
let schedules = [];
let moods = [];
let pet = { id: "main", streak: 0, lastActive: "" };

// =============================
// 💾 Load & Save
// =============================
async function loadData() {
  reminders = await dbGetAll("reminders");
  notes = await dbGetAll("notes");
  schedules = await dbGetAll("schedules");
  moods = await dbGetAll("moods");
 pet = (await dbGetAll("pet"))[0] || { id: "main", streak: 0, lastActive: "" }; // ✅ fallback dengan id
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
    ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;" }[c])
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
      pet = data.pet && typeof data.pet === "object" 
  ? { id: "main", ...data.pet } 
  : { id: "main", streak: 0, lastActive: "" };
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
// 🎨 Feature Navigation
// =============================
function openSchedule() {
  setBackgroundForFeature("schedule");
  addMsg("lin", "Jadwal? Jangan-jangan kamu sering telat ya 🙄");
  renderCards(); // opsional
}

function openNotes() {
  setBackgroundForFeature("notes");
  addMsg("lin", "Catatan baru? Jangan sampai lupa disimpan ya ✍️");
  renderCards(); // opsional
}

function openReminders() {
  setBackgroundForFeature("reminders");
  addMsg("lin", "Mau aku ingetin apa kali ini?");
  renderCards(); // opsional
}

function openMoods() {
  setBackgroundForFeature("moods");
  addMsg("lin", "Hah? Hari ini kamu lagi bete?");
  renderCards(); // opsional
}

function openSettings() {
  setBackgroundForFeature("settings");
  addMsg("lin", "Oke, ayo kita ubah pengaturan dulu ⚙️");
}

// =============================
// 📦 Export
// =============================
export { 
  reminders, 
  notes, 
  schedules, 
  moods, 
  pet, 
  loadData, 
  saveData, 
  requestNotifPermission, 
  checkDailyRecap,
  showNotification,
  openSchedule,
  openNotes,
  openReminders,
  openMoods,
  openSettings
};