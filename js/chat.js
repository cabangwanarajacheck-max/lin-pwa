// =============================
// 💬 Chat History (VN Mode)
// =============================
import { playScene } from "./scenes.js";

let chatHistory = [];
let username = localStorage.getItem("username") || "";

// 🔹 Onboarding Modal
window.addEventListener("DOMContentLoaded", () => {
  if (!username) {
    const modal = document.getElementById("nameModal");
    const input = document.getElementById("nameInput");
    const btn = document.getElementById("nameOkBtn");

    modal.classList.remove("hidden");

    btn.onclick = () => {
      const val = input.value.trim();
      if (val) {
        username = val;
        localStorage.setItem("username", username);
        modal.classList.add("hidden");
        addMsg("lin", `Hmph... baiklah, ${username} 🙄`);
      } else {
        alert("Isi nama dulu dong! 😤");
      }
    };
  }
});

function addMsg(sender, text) {
  const vnName = document.getElementById("vnName");
  const vnText = document.getElementById("vnText");

  vnName.textContent = sender === "lin" ? "Lin" : username;
  vnText.textContent = text;

  // simpan ke history
  chatHistory.push({ sender, text });
  try {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  } catch {}
}

function loadChatHistory() {
  try {
    chatHistory = JSON.parse(localStorage.getItem("chatHistory") || "[]");
  } catch {
    chatHistory = [];
  }

  // tampilkan dialog terakhir saja
  if (chatHistory.length > 0) {
    const last = chatHistory[chatHistory.length - 1];
    addMsg(last.sender, last.text);
  }
}

function clearChatHistory() {
  if (confirm("Yakin mau hapus semua riwayat chat?")) {
    chatHistory = [];
    localStorage.removeItem("chatHistory");
    addMsg("lin", "Aku udah hapus semua chat. Jangan ngelantur lagi ya 🙄");
    playScene("intro");
  }
}

// 🔹 Tambah tombol hapus chat di topbar
window.addEventListener("DOMContentLoaded", () => {
  const actions = document.getElementById("actions");
  if (actions) {
    const clearBtn = document.createElement("button");
    clearBtn.id = "clearChatBtn";
    clearBtn.textContent = "🗑️ Clear Chat";
    clearBtn.title = "Hapus semua riwayat chat";
    clearBtn.onclick = clearChatHistory;
    actions.appendChild(clearBtn);
  }
});

export { addMsg, loadChatHistory, clearChatHistory };
