# ENGLISH QUEST WORLD — Interactive Website

Website permainan Bahasa Inggeris Tahun 2 (termasuk murid bermasalah pendengaran), untuk diterbitkan menggunakan **GitHub Pages**. Ini ialah versi permainan 2D yang boleh dimainkan, bukan mockup grafik atau Agentic AI.

## Ciri yang tersedia

- **Home:** peta English Quest kartun, avatar bergerak dalam empat arah, joystick sentuh, WASD/anak panah, ketik bangunan untuk auto-jalan, masuk ke stesen.
- **Topics:** lima topik bebas dipilih (Free Time; The Old House; Get Dressed; The Robot; At The Beach).
- **Games:** 20 soalan setiap topik; **100 soalan keseluruhan**; pembetulan jawapan, markah dan ulang main.
- **Rewards:** bintang, lencana topik dan sijil selepas lima topik lengkap.
- **Profile:** nama dan kelas bagi profil setempat.
- **Teacher Dashboard:** **pratonton demo setempat** bagi profil dan markah dalam pelayar ini; eksport CSV setempat. **Bukan dashboard kelas sekolah secara langsung.**
- **Login:** profil murid setempat berdasarkan ID yang ditaip; **bukan pengesahan akaun atau login guru yang selamat.**
- **Settings:** bunyi pilihan, kurangkan animasi, panduan dan reset markah.

Semua kawalan dan maklum balas penting bersifat visual; audio tidak wajib dan tiada had masa.

## Had penting

**Google Sheets belum disambungkan.** Semua rekod murid/markah disimpan dalam `localStorage` pada pelayar dan peranti yang sama. Mod ini **tidak sesuai untuk rekod rasmi** murid atau laporan kelas berpusat. Jangan gunakan nama penuh/ID sebenar murid untuk ujian di peranti awam atau kongsi data murid dalam repositori public.

Kebenaran Teacher Dashboard pada masa kini bukan access control: ia sekadar mod pratonton. Authenticated teacher view + rekod merentas peranti memerlukan backend berautentikasi (contohnya Google Apps Script dengan kawalan akses, yang mesti diuji dan diluluskan secara berasingan).

## Struktur direktori (letak di root repo)

```text
index.html
style.css
portal.css
app.js
portal.js
questions.js
assets/
  world-map.webp
  station-01.webp
  station-02.webp
  station-03.webp
  station-04.webp
  station-05.webp
scripts/verify-project.mjs
.github/workflows/deploy-pages.yml
.nojekyll
PROMPT_CODEX_DEPLOY.md
README.md
DEPLOY_CHECKLIST.md
```

## Jalankan dan semak

1. Ekstrak ZIP ke direktori kerja.
2. Jalankan `node scripts/verify-project.mjs` dan `node --check app.js && node --check portal.js && node --check questions.js`.
3. Buka `index.html` dalam pelayar moden atau hidangkan menerusi pelayan tempatan (`python -m http.server 8000`).
4. Test menu dan permainan di desktop serta telefon Android.

Tiada `npm install`, build tool atau API key diperlukan.

## Deploy GitHub Pages

Projek menyertakan `.github/workflows/deploy-pages.yml` untuk publish static site ke GitHub Pages apabila branch `main` menerima push. Dalam GitHub `Settings > Pages`, pilih **Source: GitHub Actions**. Ikuti `PROMPT_CODEX_DEPLOY.md` untuk tugaskan Codex membuat semua langkah deployment dan mengesahkan URL.

Jangan push kandungan ke dalam subfolder tambahan: `index.html` mesti berada di root repo.
