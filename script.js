// ============================================================
// TEMPEL DI SINI: Project URL dan publishable key dari Supabase
// (Dashboard Supabase → Project Settings → API).
// Publishable key aman terlihat publik KARENA RLS aktif.
// JANGAN PERNAH menaruh secret key / service_role key di sini.
// ============================================================
const SUPABASE_URL = 'https://rmsxkurleufkqleagpzl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_l7s9WCBOI3k0S5tF2gJVMA_8z-hIKST';

const $ = (id) => document.getElementById(id);

if (!SUPABASE_URL.startsWith('https://')) {
  $('pesan-masuk').textContent =
    'Project URL dan publishable key belum ditempel di script.js. Lihat langkahnya di materi Bab 6.';
  throw new Error('Supabase belum dikonfigurasi');
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let semuaTugas = [];
let filterAktif = 'semua';

// ---------- Login dengan magic link ----------
$('form-masuk').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('isian-email').value.trim();
  $('pesan-masuk').textContent = 'Mengirim link…';
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });
  $('pesan-masuk').textContent = error
    ? 'Gagal mengirim link: ' + error.message
    : 'Cek emailmu, lalu klik link untuk masuk.';
});

$('tombol-keluar').addEventListener('click', () => db.auth.signOut());

db.auth.onAuthStateChange((_event, session) => tampilkan(session));
db.auth.getSession().then(({ data }) => tampilkan(data.session));

function tampilkan(session) {
  const masuk = !!session;
  $('layar-masuk').hidden = masuk;
  $('layar-todo').hidden = !masuk;
  $('tombol-keluar').hidden = !masuk;
  if (masuk) {
    $('nama-pengguna').textContent = session.user.email;
    muatTugas();
  } else {
    semuaTugas = [];
  }
}

// ---------- Data todo (RLS memastikan hanya milikmu yang terlihat) ----------
async function muatTugas() {
  const { data, error } = await db.from('todos').select('*').order('dibuat_pada', { ascending: true });
  if (error) return alert('Gagal memuat tugas: ' + error.message);
  semuaTugas = data;
  gambar();
}

$('form-tambah').addEventListener('submit', async (e) => {
  e.preventDefault();
  const judul = $('isian-tugas').value.trim();
  if (!judul) return;
  const { error } = await db.from('todos').insert({ judul });
  if (error) return alert('Gagal menambah: ' + error.message);
  $('isian-tugas').value = '';
  muatTugas();
});

async function ubahSelesai(id, selesai) {
  const { error } = await db.from('todos').update({ selesai }).eq('id', id);
  if (error) alert('Gagal mengubah: ' + error.message);
  muatTugas();
}

async function hapus(id) {
  const { error } = await db.from('todos').delete().eq('id', id);
  if (error) alert('Gagal menghapus: ' + error.message);
  muatTugas();
}

// ---------- Filter & tampilan ----------
document.querySelectorAll('.chip').forEach((chip) =>
  chip.addEventListener('click', () => {
    filterAktif = chip.dataset.filter;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('aktif', c === chip));
    gambar();
  })
);

function gambar() {
  const daftar = $('daftar');
  daftar.innerHTML = '';
  const terlihat = semuaTugas.filter((t) =>
    filterAktif === 'aktif' ? !t.selesai : filterAktif === 'selesai' ? t.selesai : true
  );
  for (const t of terlihat) {
    const li = document.createElement('li');
    li.className = t.selesai ? 'selesai' : '';
    const cek = document.createElement('input');
    cek.type = 'checkbox';
    cek.checked = t.selesai;
    cek.setAttribute('aria-label', 'Tandai selesai');
    cek.addEventListener('change', () => ubahSelesai(t.id, cek.checked));
    const teks = document.createElement('span');
    teks.textContent = t.judul; // textContent: aman dari isian berbahaya
    const tombolHapus = document.createElement('button');
    tombolHapus.className = 'hapus';
    tombolHapus.textContent = '×';
    tombolHapus.setAttribute('aria-label', 'Hapus tugas');
    tombolHapus.addEventListener('click', () => hapus(t.id));
    li.append(cek, teks, tombolHapus);
    daftar.append(li);
  }
  $('kosong').hidden = terlihat.length > 0;
}
