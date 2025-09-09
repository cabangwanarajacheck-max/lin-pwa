// =============================
// 🚀 Init Aplikasi
// =============================

import { openDB } from "./db.js";
import { loadData } from "./features.js";
import { loadChatHistory } from "./chat.js";
import { playScene } from "./scenes.js";
import { requestNotifPermission, checkDailyRecap } from "./features.js";
import { send } from "./scenes.js";
import { initLive2D } from "./live2d.js";

window.addEventListener("DOMContentLoaded", async () => {
  // 1. DB & Data
  await openDB();
  await loadData();

  // 2. Chat history
  loadChatHistory();

  // 3. Scene awal
  playScene("intro");

  // 4. Live2D model
  initLive2D();

  // 5. Input & tombol
  const sendBtn = document.getElementById("sendBtn");
  const textInput = document.getElementById("text");
  if (sendBtn) sendBtn.onclick = send;
  if (textInput) {
    textInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
  }

  // 6. Notifikasi & Recap harian
  requestNotifPermission();
  checkDailyRecap();
});
