const featureBackgrounds = {
  home: "autdoor-01.jpg",
  schedule: "room-01.jpg",
  notes: "room-02.jpg",
  reminders: "room-03.jpg",
  moods: "room-04.jpg",
  settings: "office-01.jpg"  // ✅ fix typo
};

// 🔹 Fungsi utama ganti background
export function setBackground(name) {
  const bg = document.getElementById("bgCanvas");
  if (!bg) return;

  console.log("🔵 Ganti background ke:", "bg/" + name);

  bg.style.transition = "opacity 0.6s ease";
  bg.style.opacity = 0;

  setTimeout(() => {
    bg.src = "bg/" + name;
    bg.onload = () => {
      console.log("✅ Background loaded:", bg.src);
      bg.style.opacity = 1;
    };
    bg.onerror = () => {
      console.error("❌ Background gagal load:", bg.src);
    };
  }, 600);
}

// 🔹 Ganti background berdasarkan fitur
export function setBackgroundForFeature(feature) {
  const bg = featureBackgrounds[feature];
  if (bg) setBackground(bg);
}

// 🔹 Preload semua background
export function preloadBackgrounds(files) {
  files.forEach(name => {
    const img = new Image();
    img.src = "bg/" + name;
  });
}
