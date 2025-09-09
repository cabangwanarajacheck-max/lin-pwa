// live2d.js (REPLACE isi file dengan ini)

// =============================
// 🎨 Live2D / PIXI Setup (versi perbaikan)
// =============================

export async function initLive2D(app) {
  if (!app) throw new Error("initLive2D requires a PIXI.Application instance");
  if (!document.getElementById("linCanvas")) console.warn("Warning: #linCanvas not found in DOM");

  // fungsi resize
  const resizeCanvas = (app, model) => {
    if (!app || !model) return;
    // resize renderer ke window size (aman walau resizeTo sudah dipakai)
    try {
      app.renderer.resize(window.innerWidth, window.innerHeight);
    } catch (e) {
      // jika ada error renderer, jangan crash
      console.warn("PIXI resize error:", e);
    }

 // anchor & posisi
    model.anchor.set(0.5, 1);
    model.x = app.renderer.width / 2;
    model.y = app.renderer.height;

   // scale adaptif: mobile -> zoom in
    if (window.innerWidth <= - 768) {
      model.scale.set(1);
    } else {
      const scale = Math.min(
        (window.innerWidth / model.width) * 1,
        (window.innerHeight / model.height) * 1
      );
      model.scale.set(scale);
    }
  };

  try {

    // load model (asynchronous)
    const model = await PIXI.live2d.Live2DModel.from("models/hiyori/hiyori_pro_t11.model3.json");

    // tambahkan ke stage
    app.stage.addChild(model);

    // initial resize + listener yang memakai app & model dari closure
    resizeCanvas(app, model);
    // ✅ auto resize realtime tanpa refresh
const resizeHandler = () => {
  requestAnimationFrame(() => resizeCanvas(app, model));
};
window.addEventListener("resize", resizeHandler);

// ✅ juga cek tiap frame untuk jaga-jaga
app.ticker.add(() => {
  resizeCanvas(app, model);
});

   // tiap frame update posisi (supaya auto adjust)
    app.ticker.add(() => resizeCanvas(app, model));

    // Random idle motion
    setInterval(() => {
      const motions = ["Idle", "TapBody", "Happy"];
      const random = motions[Math.floor(Math.random() * motions.length)];
      try { model.motion(random); } catch (e) {}
    }, 10000 + Math.random() * 5000);

    // Interaksi / eye tracking
    app.stage.interactive = true;
    app.stage.on("pointermove", e => {
      const pos = e.data.global;
      try { model.focus(pos.x, pos.y); } catch (e) {}
    });

    // Drag & drop
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

    app.stage.on("pointerupoutside", () => (dragging = false));
    app.stage.on("pointerup", () => (dragging = false));

    // Hit areas
    model.on("hit", hitAreas => {
      if (hitAreas.includes("Head")) model.motion("TapHead");
      if (hitAreas.includes("Body")) model.motion("TapBody");
    });

    // click left/right
    model.on("pointerdown", e => {
      const pos = e.data.global;
      if (pos.x < model.x) model.motion("Angry");
      else if (pos.x > model.x + model.width) model.motion("Happy");
    });

    // reaksi tombol Kirim (jika ada)
    document.getElementById("sendBtn")?.addEventListener("click", () => {
      const inputVal = (document.getElementById("text")?.value || "").toLowerCase();
      if (inputVal.includes("marah") || inputVal.includes("kesal")) model.motion("Angry");
      else if (inputVal.includes("senang") || inputVal.includes("happy")) model.motion("Happy");
      else model.motion("TapBody");
    });

    console.log("Live2D initialized (model):", model);
    return model; // kembaliin model kalau mau dipakai di main.js
  } catch (err) {
    console.error("initLive2D failed:", err);
    throw err;
  }
}

 