@echo off
REM === Script otomatis push semua file ke GitHub ===

REM Masuk ke folder project (ganti sesuai lokasi repo kamu)
cd /d C:\Users\NamaKamu\lin-pwa

echo 🔄 Menambahkan semua file...
git add .

echo 📝 Membuat commit...
git commit -m "Update semua file project Lin"

echo 🚀 Push ke GitHub...
git push origin main

echo ✅ Selesai! Perubahan sudah terkirim ke GitHub.
pause
