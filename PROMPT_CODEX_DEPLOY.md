# PROMPT CODEX — DEPLOY ENGLISH QUEST WORLD TERUS KE GITHUB PAGES

Saya melampirkan `English_Quest_Codex_GitHub_Deploy.zip` yang mengandungi **website game sebenar, lengkap dengan grafik dan kod sumber**. Anda (Codex) perlu terus mengekstrak, menguji, push ke GitHub dan **DEPLOY** menggunakan GitHub Actions. Jangan hanya memberi tutorial; lakukan tindakan terus jika mendapat akses dan kebenaran yang diperlukan.

## 1. Hasil yang wajib dikekalkan

Nama: **ENGLISH QUEST WORLD — Learn • Play • Explore**.

Home mesti memaparkan **peta kartun English Quest yang dibekalkan** dengan avatar boleh bergerak bebas pada laluan, kawalan joystick pada telefon dan keyboard pada komputer, klik/ketik bangunan untuk pergi ke stesen, serta pintu masuk Quest. Jangan menukar Home kepada UI kad biasa atau gambar statik tanpa kawalan.

Menu navigasi 8 bahagian mesti lengkap, berfungsi dan jelas pada desktop/tablet/Android:
1. Home
2. Topics
3. Games
4. Rewards
5. Profile
6. Teacher Dashboard
7. Login
8. Settings

Kandungan soalan sudah disediakan: **01 Free Time (20), 02 The Old House (20), 03 Get Dressed (20), 04 The Robot (20), 05 At The Beach (20)**. Jumlah 100 soalan. Pastikan setiap Quest boleh dimainkan, markah topik hingga 20, markah maksimum 100, dan best score dikekalkan apabila ulang main. Sijil dibenarkan hanya setelah semua lima Quest selesai. Tiada urutan topik wajib.

Antaramuka mestilah ceria dan mudah diakses murid Tahun 2 bermasalah pendengaran, visual-first, tiada audio wajib dan tiada had masa. Kekalkan imej dalam `assets/` — enam fail WebP termasuk `world-map.webp`.

## 2. Tindakan teknikal

1. Ekstrak ZIP. Jangan tinggalkan folder induk tambahan dalam repositori: fail `index.html`, `portal.css`, `portal.js`, `style.css`, `app.js`, `questions.js`, `assets/`, `.github/`, `.nojekyll` dan `scripts/` mesti di **root** repo.
2. Pastikan `.github/workflows/deploy-pages.yml` tidak tertinggal (folder tersembunyi). Ia deploy `index.html`, CSS, JS dan `assets` ke Pages. Jangan mengubahnya tanpa sebab.
3. Jalankan `node scripts/verify-project.mjs` — perlu lulus **5 topik, 100 soalan, aset lengkap**. Jalankan juga `node --check app.js`, `node --check portal.js`, `node --check questions.js`.
4. Dengan akaun GitHub yang diizinkan, cari repositori English Quest sahaja. Jika belum wujud, cipta repo **public** bernama `English-Quest-World` (atau nama tersedia yang paling sesuai). **Jangan overwrite repo yang tidak berkaitan.** Push ke `main`.
5. Di GitHub `Settings > Pages`, tetapkan **Source: GitHub Actions**; pastikan workflow boleh dijalankan. Pantau Actions hingga deployment `success`. Jika gagal, baiki, push pembetulan dan jalankan semula.
6. Buka URL GitHub Pages sebenar daripada hasil deployment. Semak HTML/CSS/JS/semua enam WebP dimuat tanpa ralat 404 dan jalankan ujian desktop dan mobile (sekurang-kurangnya 390×844 dan 1280×800).
7. Uji: lapan menu boleh dibuka melalui drawer; Home berpeta, avatar boleh berjalan, hotspot kelima-lima bangunan berfungsi; Topics VISIT menghala ke stesen; Games PLAY membuka kuiz sebenar; setiap topik 20 soalan; Rewards/Certificate; Profile/Login setempat; Settings; Teacher Dashboard mod demo.
8. Jika ada pepijat jelas, buat perubahan minimum tanpa merosakkan artwork/reka bentuk dan deploy semula.

## 3. Batas keselamatan dan data — WAJIB

- Ini ialah **versi demo berfungsi dengan localStorage**. **Google Sheets belum disambungkan.** Jangan dakwa ia sudah menyegerakkan rekod ke Google Sheets.
- **Teacher Dashboard hanyalah pratonton data setempat**, bukan dashboard sekolah dan bukan login guru sebenar. Jangan menambah kata laluan atau PIN palsu pada JS public atau menyamarkan frontend-only gate sebagai keselamatan.
- **Login murid ialah profil peranti**, bukan autentikasi identiti sebenar. Pastikan label ini jelas.
- Jangan upload token, API key, data murid sebenar, atau sebarang rahsia dalam repo public.
- Jangan tambah Agentic AI, analytics tracking atau backend baharu tanpa arahan.

## 4. Sahkan dan pulangkan hasil

Selesaikan deployment dalam sesi anda. Dalam jawapan akhir, laporkan:
- URL repository GitHub **yang sebenar**.
- URL website GitHub Pages LIVE **yang telah disahkan** (jangan reka URL).
- Branch/commit SHA dan status GitHub Actions.
- Keputusan ujian bagi 8 menu, 5 topik × 20 soalan, kawalan avatar, skrin telefon, markah, sijil dan aset.
- Pembaikan yang dilakukan.
- Nota jelas: Google Sheets dan login guru sebenar belum disambungkan.

Jika akses GitHub/Auth/Pages tidak tersedia, nyatakan halangan khusus dan tepat tanpa mendakwa deployment berjaya.
