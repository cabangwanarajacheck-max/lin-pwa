// =============================
// 📝 Input Handler
// =============================
import { addMsg, clearChatHistory } from "./chat.js";
import { reminders, notes, schedules, moods, saveData, showNotification } from "./features.js";
import { setBackground, preloadBackgrounds } from "./background.js";

// 🔴 Variabel Global
let pendingAction = null;
let gameNumber = null;

// =============================
// 📤 Kirim Pesan User
// =============================
function send() {
  const input = document.getElementById("text");
  const text = input.value.trim();
  if (!text) return;
  addMsg("user", text);
  input.value = "";

  if (text === "/clear") {
    clearChatHistory();
    return;
  }

  if (pendingAction) {
    handlePendingAction(text);
  } else {
    addMsg("lin", "Hei! Jangan ngetik sembarangan, pilih aja 🙄");
  }
}

// =============================
// ⚡ Handle Pending Action
// =============================
async function handlePendingAction(text) {
  if (pendingAction === "add_reminder") {
    reminders.push({ id: Date.now(), text, time: null, done: false });
    await saveData();
    addMsg("lin", `Udah aku catet: "${text}". Jangan males ngerjain ya 😤`);
    showNotification("Rutinitas dibuat", text);
    addMsg("lin", "Sekarang balik ke menu, biar aku nggak repot 🙄");
  } 
  else if (pendingAction === "add_note") {
    notes.push({ id: Date.now(), text, createdAt: new Date().toISOString() });
    await saveData();
    addMsg("lin", `Catatan "${text}" udah aku simpen 🙄`);
    showNotification("Catatan disimpan", text);
    addMsg("lin", "Balik ke menu sekarang, jangan ngelantur 🙄");
  } 
  else if (pendingAction === "add_schedule") {
    schedules.push({ id: Date.now(), text, date: null, done: false });
    await saveData();
    addMsg("lin", `Jadwal "${text}" udah aku atur... jangan telat! 😒`);
    showNotification("Jadwal dibuat", text);
    addMsg("lin", "Balik ke menu biar rapi! 😤");
  } 
  else if (pendingAction === "add_mood") {
    moods.push({ id: Date.now(), text, date: new Date().toISOString() });
    await saveData();
    addMsg("lin", `Mood kamu "${text}" udah aku catet. Jangan pura-pura kuat 🙄`);
    addMsg("lin", "Sekarang kita balik ke menu lagi 🙄");
  } 
  else if (pendingAction === "game_tebak") {
    const guess = parseInt(text, 10);
    if (isNaN(guess)) {
      addMsg("lin", "Itu bukan angka, dasar bego! 😤");
      return;
    } else if (guess === gameNumber) {
      addMsg("lin", `...Hmph, iya benar ${guess}. Jangan senyum-senyum gitu! 🙈`);
    } else {
      addMsg("lin", `Salah! Bukan ${guess}. Coba lagi kalau berani 😏`);
      return;
    }
  }

  // reset state setelah action selesai
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
// 🎮 Scene Manager
// =============================
function playScene(id) {
  if (typeof id === "function") { 
    id(); 
    return; 
  }
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
        playScene(typeof c.next === "function" ? c.next() : c.next);
      };
      btnRow.appendChild(btn);
    });

    chat.appendChild(btnRow);
    chat.scrollTop = chat.scrollHeight;
  }
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
          return "intro";
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
          return "intro";
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
          return "intro";
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
          return "intro";
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
  return "intro";
}

// =============================
// 🎨 Background Scenes
// =============================
preloadBackgrounds([
  "autdoor-01.jpg",
  "room-01.jpg",
  "room-02.jpg",
  "room-03.jpg",
  "room-04.jpg",
  "Office-01.jpg"
]);

export function introScene() {
  setBackground("room-01.jpg");
  addMsg("lin", "Hei, kamu telat datang ke kelas lagi ya?");
}

export function outdoorScene() {
  setBackground("autdoor-01.jpg");
  addMsg("lin", "Hmph, akhirnya bisa keluar juga.");
}

// =============================
// 📦 Export
// =============================
export { send, playScene, scenes, showQuote };
