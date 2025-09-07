const sharp = require("sharp");

sharp("icon-192.png")
  .resize(32, 32)
  .toFile("favicon.ico")
  .then(() => console.log("favicon.ico berhasil dibuat!"))
  .catch(err => console.error(err));
