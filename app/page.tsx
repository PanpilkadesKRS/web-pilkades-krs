'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ==========================================
// MASTER DAFTAR MENU APLIKASI
// ==========================================
const MASTER_MENU = [
  'Dashboard',
  'Tahapan Pilkades',
  'Real Count',
  'Daftar Pemilih',
  'Tugas Coklit',
  'Coklit',
  'Data Bermasalah',
  'DPS',
  'DPT',
  'DPT/Tambahan',
  'TMS',
  'Kandidat',
  'TPS',
  'Peta TPS',
  'Saksi',
  'KPPS',
  'Hari H',
  'Aktivitas Login',
  'Pengaturan',
];

// Generate otomatis daftar TPS 01 sampai 15
const DAFTAR_RT = Array.from({ length: 3 }, (_, i) =>
  String(i + 1).padStart(3, '0')
);
const DAFTAR_RW = Array.from({ length: 6 }, (_, i) =>
  String(i + 1).padStart(3, '0')
);

const BATAS_ONLINE_MENIT = 2;

const UKURAN_HALAMAN_DAFTAR_PEMILIH = 50;

const DAFTAR_DUSUN = ['I', 'II', 'III'];

// Tanggal Hari H Pilkades (dipakai buat hitung umur otomatis)
const TANGGAL_DPS = new Date(2026, 7, 8, 23, 59, 59); // 8 Agustus 2026
const TANGGAL_DPT = new Date(2026, 8, 4, 23, 59, 59); // 4 September 2026
const TANGGAL_HARI_H = new Date(2026, 8, 20); // 20 September 2026

const STATUS_TMS_LIST = ['Pindah', 'Meninggal', 'Tidak Dikenal'];

const DAFTAR_RAGAM_DISABILITAS = [
  'Fisik',
  'Intelektual',
  'Mental',
  'Sensorik Wicara',
  'Sensorik Rungu',
  'Sensorik Netra',
];

function hitungUmurHariH(tanggalLahir: string | null) {
  if (!tanggalLahir) return null;
  const lahir = new Date(tanggalLahir);
  if (isNaN(lahir.getTime())) return null;

  let umur = TANGGAL_HARI_H.getFullYear() - lahir.getFullYear();
  const belumUlangTahun =
    TANGGAL_HARI_H.getMonth() < lahir.getMonth() ||
    (TANGGAL_HARI_H.getMonth() === lahir.getMonth() &&
      TANGGAL_HARI_H.getDate() < lahir.getDate());
  if (belumUlangTahun) umur -= 1;
  return umur;
}

function hitungCountdown(waktuSekarang: Date) {
  const now = waktuSekarang.getTime();

  let target: Date;
  let label: string;
  let warna: 'emerald' | 'indigo' | 'red';

  if (now < TANGGAL_DPS.getTime()) {
    target = TANGGAL_DPS;
    label = 'Menuju Penetapan DPS';
    warna = 'emerald';
  } else if (now < TANGGAL_DPT.getTime()) {
    target = TANGGAL_DPT;
    label = 'Menuju Penetapan DPT';
    warna = 'indigo';
  } else if (now < TANGGAL_HARI_H.getTime()) {
    target = TANGGAL_HARI_H;
    label = 'Menuju Hari Pencoblosan';
    warna = 'red';
  } else {
    return null; // semua tahapan sudah lewat
  }

  const selisih = target.getTime() - now;
  const hari = Math.floor(selisih / (1000 * 60 * 60 * 24));
  const jam = Math.floor((selisih % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const menit = Math.floor((selisih % (1000 * 60 * 60)) / (1000 * 60));
  const detik = Math.floor((selisih % (1000 * 60)) / 1000);

  return { label, hari, jam, menit, detik, warna, target };
}

function isTMS(item: any) {
  return STATUS_TMS_LIST.includes(item?.status_coklit);
}

function getDeviceId() {
  let deviceId = localStorage.getItem('deviceIdPilkades');
  if (!deviceId) {
    deviceId = 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('deviceIdPilkades', deviceId);
  }
  return deviceId;
}

    // ==========================================
// DATA TAHAPAN PILKADES
// ==========================================
const DATA_TAHAPAN_PILKADES = [
  { tipe: 'kategori', kode: 'A', label: 'PERSIAPAN' },
  { tipe: 'item', no: 1, teks: 'Persetujuan biaya pemilihan dari Bupati', mulai: new Date(2026, 5, 12), selesai: new Date(2026, 6, 11), keterangan: '30 hari' },

  { tipe: 'kategori', kode: 'B', label: 'PENCALONAN' },
  { tipe: 'item', no: 2, teks: 'Pengumuman Pembentukan PPDP', mulai: new Date(2026, 6, 12), selesai: new Date(2026, 6, 12), keterangan: '1 hari' },
  { tipe: 'item', no: 3, teks: 'Pembentukan PPDP', mulai: new Date(2026, 6, 13), selesai: new Date(2026, 6, 15), keterangan: '3 hari' },
  { tipe: 'item', no: 4, teks: 'Penetapan dan Pembekalan PPDP', mulai: new Date(2026, 6, 16), selesai: new Date(2026, 6, 16), keterangan: '1 hari' },
  { tipe: 'item', no: 5, teks: 'Pelaksanaan Data Pemilih', mulai: new Date(2026, 6, 17), selesai: new Date(2026, 7, 5), keterangan: '20 hari' },
  { tipe: 'item', no: 6, teks: 'Penyusunan DPS hasil Pemutakhiran Data Pemilih dan TPS sementara', mulai: new Date(2026, 7, 6), selesai: new Date(2026, 7, 8), keterangan: '3 hari' },
  { tipe: 'item', no: 7, teks: 'Pengumuman DPS', mulai: new Date(2026, 7, 9), selesai: new Date(2026, 7, 11), keterangan: '3 hari' },
  { tipe: 'item', no: 8, teks: 'Usulan perbaikan Daftar Pemilih Sementara', mulai: new Date(2026, 7, 12), selesai: new Date(2026, 7, 26), keterangan: '15 hari' },
  { tipe: 'item', no: 9, teks: 'Pengumuman pendaftaran calon kepala desa', mulai: new Date(2026, 6, 25), selesai: new Date(2026, 6, 25), keterangan: '1 hari' },
  { tipe: 'item', no: 10, teks: 'Pendaftaran bakal calon kepala desa', mulai: new Date(2026, 6, 26), selesai: new Date(2026, 7, 2), keterangan: '8 hari' },
  { tipe: 'item', no: 11, teks: 'Perpanjangan pendaftaran Bakal Calon Kepala Desa jika bakal calon kades hanya 1 orang', mulai: new Date(2026, 7, 3), selesai: new Date(2026, 7, 17), keterangan: '15 hari' },
  { tipe: 'item', no: 12, teks: 'Penelitian keabsahan administrasi kelengkapan persyaratan dan klarifikasi bakal calon kepala desa', mulai: new Date(2026, 7, 3), selesai: new Date(2026, 7, 22), keterangan: '20 hari' },
  { tipe: 'item', no: 13, teks: 'Pelaporan bakal calon kepala Desa lebih dari 5 kepada panitia Kabupaten', mulai: new Date(2026, 7, 11), selesai: new Date(2026, 7, 15), keterangan: '5 hari' },
  { tipe: 'item', no: 14, teks: 'Perpanjangan pendaftaran Bakal Calon Kepala Desa lanjutan jika bakal calon kades hanya 1 orang', mulai: new Date(2026, 7, 18), selesai: new Date(2026, 7, 27), keterangan: '10 hari' },
  { tipe: 'item', no: 15, teks: 'Pelaksanaan seleksi bakal calon kepala desa lebih dari 5 calon', mulai: new Date(2026, 7, 16), selesai: new Date(2026, 7, 22), keterangan: '7 hari' },
  { tipe: 'item', no: 16, teks: 'Pengumuman hasil administrasi bakal calon kepala Desa', mulai: new Date(2026, 7, 23), selesai: new Date(2026, 7, 23), keterangan: '1 hari' },
  { tipe: 'item', no: 17, teks: 'Tanggapan masukan masyarakat dan penyelesaian pengaduan hasil administrasi bakal calon kepala Desa', mulai: new Date(2026, 7, 24), selesai: new Date(2026, 7, 26), keterangan: '3 hari' },
  { tipe: 'item', no: 18, teks: 'Penetapan calon kepala desa dan penetapan nomor urut cakades', mulai: new Date(2026, 7, 27), selesai: new Date(2026, 7, 27), keterangan: '1 hari' },
  { tipe: 'item', no: 19, teks: 'Pengumuman nomor urut calon kepala desa', mulai: new Date(2026, 7, 28), selesai: new Date(2026, 7, 30), keterangan: '3 hari' },
  { tipe: 'item', no: 20, teks: 'Pencatatan Daftar Pemilih Tambahan', mulai: new Date(2026, 7, 29), selesai: new Date(2026, 7, 31), keterangan: '3 hari' },
  { tipe: 'item', no: 21, teks: 'Pengumuman Daftar Pemilih Tambahan', mulai: new Date(2026, 8, 1), selesai: new Date(2026, 8, 3), keterangan: '3 hari' },
  { tipe: 'item', no: 22, teks: 'Penetapan Daftar Pemilih Tetap (DPT)', mulai: new Date(2026, 8, 4), selesai: new Date(2026, 8, 5), keterangan: '2 hari' },
  { tipe: 'item', no: 23, teks: 'Pengumuman Pembentukan KPPS', mulai: new Date(2026, 7, 31), selesai: new Date(2026, 7, 31), keterangan: '1 hari' },
  { tipe: 'item', no: 24, teks: 'Pembentukan KPPS', mulai: new Date(2026, 8, 1), selesai: new Date(2026, 8, 7), keterangan: '7 hari' },
  { tipe: 'item', no: 25, teks: 'Penetapan dan Pembekalan KPPS', mulai: new Date(2026, 8, 8), selesai: new Date(2026, 8, 9), keterangan: '2 hari' },
  { tipe: 'item', no: 26, teks: 'Penyusunan Titik Lokasi TPS', mulai: new Date(2026, 8, 10), selesai: new Date(2026, 8, 12), keterangan: '3 hari' },
  { tipe: 'item', no: 27, teks: 'Pengumuman hari, tanggal, waktu dan alamat TPS kepada pemilih', mulai: new Date(2026, 8, 12), selesai: new Date(2026, 8, 12), keterangan: '1 hari' },
  { tipe: 'item', no: 28, teks: 'Rapat Persiapan Kampanye', mulai: new Date(2026, 8, 13), selesai: new Date(2026, 8, 13), keterangan: '1 hari' },
  { tipe: 'item', no: 29, teks: 'Pelaksanaan Kampanye', mulai: new Date(2026, 8, 14), selesai: new Date(2026, 8, 16), keterangan: '3 hari' },
  { tipe: 'item', no: 30, teks: 'Masa Tenang', mulai: new Date(2026, 8, 17), selesai: new Date(2026, 8, 19), keterangan: '3 hari' },

  { tipe: 'kategori', kode: 'C', label: 'PELAKSANAAN' },
  { tipe: 'item', no: 31, teks: 'Pemungutan Suara', mulai: new Date(2026, 8, 20), selesai: new Date(2026, 8, 20), keterangan: '1 hari' },
  { tipe: 'item', no: 32, teks: 'Penghitungan hasil Pemungutan Suara', mulai: new Date(2026, 8, 20), selesai: new Date(2026, 8, 21), keterangan: '2 hari' },

  { tipe: 'kategori', kode: 'D', label: 'PENETAPAN' },
  { tipe: 'item', no: 33, teks: 'Penetapan Calon Kepala Desa terpilih oleh Panitia Pilkades', mulai: new Date(2026, 8, 21), selesai: new Date(2026, 8, 21), keterangan: '1 hari' },
  { tipe: 'item', no: 34, teks: 'Penyampaian Penetapan Calon Kepala Desa dari Panitia ke BPD', mulai: new Date(2026, 8, 21), selesai: new Date(2026, 8, 27), keterangan: '7 hari' },
  { tipe: 'item', no: 35, teks: 'BPD menyampaikan Penetapan Calon Kepala Desa terpilih kepada Bupati', mulai: new Date(2026, 8, 22), selesai: new Date(2026, 8, 28), keterangan: '7 hari' },
  { tipe: 'item', no: 36, teks: 'Panitia tingkat Kabupaten menyelesaikan perselisihan hasil Pilkades', mulai: new Date(2026, 8, 23), selesai: new Date(2026, 9, 22), keterangan: '30 hari' },
  { tipe: 'item', no: 37, teks: 'Proses Penerbitan SK kepala Desa terpilih oleh Bupati', mulai: new Date(2026, 8, 24), selesai: new Date(2026, 9, 23), keterangan: '30 hari' },
  { tipe: 'item', no: 38, teks: 'Pelantikan Kepala Desa Terpilih oleh Bupati / Pejabat yang ditunjuk', mulai: new Date(2026, 10, 4), selesai: new Date(2026, 10, 4), keterangan: '1 hari' },
];

function formatTanggalSingkat(d: Date) {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRentangTanggal(mulai: Date, selesai: Date) {
  if (mulai.getTime() === selesai.getTime()) return formatTanggalSingkat(mulai);
  const bulanSama =
    mulai.getMonth() === selesai.getMonth() && mulai.getFullYear() === selesai.getFullYear();
  if (bulanSama) return `${mulai.getDate()} - ${formatTanggalSingkat(selesai)}`;
  return `${formatTanggalSingkat(mulai)} - ${formatTanggalSingkat(selesai)}`;
}

function getStatusTahapan(item: any, now: Date) {
  const akhirHari = new Date(
    item.selesai.getFullYear(),
    item.selesai.getMonth(),
    item.selesai.getDate(),
    23, 59, 59
  );
  if (now.getTime() > akhirHari.getTime()) return 'selesai';
  if (now.getTime() < item.mulai.getTime()) return 'akan_datang';
  return 'berlangsung';
}

// ==========================================
// HELPER KHUSUS DPT/TAMBAHAN
// ==========================================
const DAFTAR_ALASAN_TAMBAHAN = [
  'Pemilih Pemula',
  'Pindahan',
  'Purnawirawan TNI/Polri',
  'Terlewat Pendataan',
  'Lainnya',
];

function parseAlasanTambahan(keterangan: string | null) {
  if (!keterangan) return '-';
  const match = keterangan.match(/PEMILIH BARU \(([^)]*)\)/);
  return match ? match[1].trim() : '-';
}

function parseDitambahkanOleh(keterangan: string | null) {
  if (!keterangan) return '-';
  const match = keterangan.match(/ditambahkan oleh ([^|]*)/);
  return match ? match[1].trim() : '-';
}

function hitungStatusTerkini(item: any) {
  if (item.status_dpt === 'DPT') {
    return { label: 'Sudah di DPT', warna: 'indigo' };
  }
  if (STATUS_TMS_LIST.includes(item.status_coklit)) {
    return { label: `TMS (${item.status_coklit})`, warna: 'red' };
  }
  if (item.status_coklit === 'Perlu Koreksi') {
    return { label: 'Perlu Koreksi', warna: 'orange' };
  }
  if (item.status_coklit === 'Pemilih Baru - Perlu Verifikasi') {
    return { label: 'Menunggu Verifikasi', warna: 'slate' };
  }
  if (item.divalidasi_admin) {
    return { label: 'Divalidasi, Menunggu Kirim DPT', warna: 'emerald' };
  }
  if (item.status_coklit === 'Ditemui') {
    return { label: 'Disetujui, Menunggu Validasi Admin', warna: 'teal' };
  }
  return { label: item.status_coklit || 'Belum Jelas', warna: 'slate' };
}

export default function Home() {
  // --- STATE LOGO ---
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(false);

  // --- STATE LOGIN ---
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [activeMenu, setActiveMenu] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- STATE PENGATURAN (MANAJEMEN AKUN) ---
  const [daftarAkun, setDaftarAkun] = useState<any[]>([]);
  const [loadingAkun, setLoadingAkun] = useState(false);
  const [modalAkun, setModalAkun] = useState<any | null>(null);
  const [loadingSimpan, setLoadingSimpan] = useState(false);

  // --- STATE DASHBOARD ---
  const [stats, setStats] = useState({ total: 0, belum: 0, sudah: 0, lakiLaki: 0, perempuan: 0 });
  const [progresPerWilayah, setProgresPerWilayah] = useState<any[]>([]);
  const [loadingProgresWilayah, setLoadingProgresWilayah] = useState(false);
  const [waktuSekarang, setWaktuSekarang] = useState(new Date());
  // --- STATE FUNNEL DATA (DASHBOARD) ---
  const [dataFunnel, setDataFunnel] = useState({
    total: 0,
    sudahCoklit: 0,
    divalidasiAdmin: 0,
    masukDPS: 0,
    masukDPT: 0,
  });


  // --- STATE TUGAS COKLIT ---
  const [dataCoklit, setDataCoklit] = useState<any[]>([]);
  const [loadingCoklit, setLoadingCoklit] = useState(false);
  const [totalDataCoklit, setTotalDataCoklit] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // --- STATE VERIFIKASI PEMILIH BARU ---
  const [tabBermasalah, setTabBermasalah] = useState<'Koreksi' | 'PemilihBaru'>(
    'Koreksi'
  );
  const [dataPemilihBaru, setDataPemilihBaru] = useState<any[]>([]);
  const [loadingPemilihBaruList, setLoadingPemilihBaruList] = useState(false);
  const [countKoreksi, setCountKoreksi] = useState(0);
  const [countPemilihBaru, setCountPemilihBaru] = useState(0);
  const [selectedPemilihBaru, setSelectedPemilihBaru] = useState<string[]>([]);
  const [loadingSetujuiMassal, setLoadingSetujuiMassal] = useState(false);
  const [modalKoreksiEdit, setModalKoreksiEdit] = useState<any | null>(null);
  const [modalAksiSetelahEdit, setModalAksiSetelahEdit] = useState<any | null>(
    null
  );
  const [loadingSimpanKoreksiEdit, setLoadingSimpanKoreksiEdit] =
    useState(false);

  // --- STATE STATISTIK & FILTER COKLIT ---
  const [statistikCoklit, setStatistikCoklit] = useState({
    total: 0,
    sudahCoklit: 0,
    belumCoklit: 0,
    ditemui: 0,
    tms: 0,
    bermasalah: 0,
    menungguVerifikasi: 0,
  });
  const [loadingStatistik, setLoadingStatistik] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Semua');

  // --- STATE DPS ---
  const [dataDPS, setDataDPS] = useState<any[]>([]);
  const [loadingDPS, setLoadingDPS] = useState(false);

  // --- STATE DAFTAR PEMILIH (DATA MURNI SUPABASE) ---
  const [dataDaftarPemilih, setDataDaftarPemilih] = useState<any[]>([]);
  const [loadingDaftarPemilih, setLoadingDaftarPemilih] = useState(false);
  const [totalDaftarPemilih, setTotalDaftarPemilih] = useState(0);
  const [searchDaftarPemilih, setSearchDaftarPemilih] = useState('');
  const [filterRT_DaftarPemilih, setFilterRT_DaftarPemilih] = useState('Semua');
  const [filterRW_DaftarPemilih, setFilterRW_DaftarPemilih] = useState('Semua');
  const [filterStatusDaftarPemilih, setFilterStatusDaftarPemilih] = useState('Semua');
  const [halamanDaftarPemilih, setHalamanDaftarPemilih] = useState(1);
  const [modalEditDaftarPemilih, setModalEditDaftarPemilih] = useState<any | null>(null);
  const [loadingSimpanEditDaftarPemilih, setLoadingSimpanEditDaftarPemilih] = useState(false);
  const [modalUbahTMS, setModalUbahTMS] = useState<any | null>(null);
  const [pilihanStatusTMS, setPilihanStatusTMS] = useState('Pindah');
  const [loadingUbahTMS, setLoadingUbahTMS] = useState(false);

  // --- STATE REVIEW COKLIT (ADMIN) ---
  const [dataCoklitReview, setDataCoklitReview] = useState<any[]>([]);
  const [loadingCoklitReview, setLoadingCoklitReview] = useState(false);
  const [searchCoklitReview, setSearchCoklitReview] = useState('');
  const [filterStatusCoklitReview, setFilterStatusCoklitReview] =
    useState('Semua');
  const [selectedCoklitReview, setSelectedCoklitReview] = useState<string[]>(
    []
  );
  const [modalEditCoklit, setModalEditCoklit] = useState<any | null>(null);
  const [loadingSimpanEditCoklit, setLoadingSimpanEditCoklit] = useState(false);
  const [loadingValidasiMassal, setLoadingValidasiMassal] = useState(false);
  const [tabCoklitReview, setTabCoklitReview] = useState<
    'Pending' | 'Divalidasi'
  >('Pending');
  const [dataCoklitValidasi, setDataCoklitValidasi] = useState<any[]>([]);
  const [loadingCoklitValidasi, setLoadingCoklitValidasi] = useState(false);

  // --- STATE DPT ---
  const [dataDPT, setDataDPT] = useState<any[]>([]);
  const [loadingDPT, setLoadingDPT] = useState(false);
  const [searchDPT, setSearchDPT] = useState('');
  const [filterRT_DPT, setFilterRT_DPT] = useState('Semua');
  const [filterRW_DPT, setFilterRW_DPT] = useState('Semua');

  // --- STATE FILTER & AKSI DPS ---
  const [filterRT_DPS, setFilterRT_DPS] = useState('Semua');
  const [filterRW_DPS, setFilterRW_DPS] = useState('Semua');
  const [selectedDPS, setSelectedDPS] = useState<string[]>([]);
  const [loadingKirimDPT, setLoadingKirimDPT] = useState(false);

  // --- STATE TMS (TIDAK MEMENUHI SYARAT) ---
  const [dataTMS, setDataTMS] = useState<any[]>([]);
  const [loadingTMS, setLoadingTMS] = useState(false);
  const [searchTMS, setSearchTMS] = useState('');
  const [filterStatusTMS, setFilterStatusTMS] = useState('Semua');
  const [filterRT_TMS, setFilterRT_TMS] = useState('Semua');
  const [filterRW_TMS, setFilterRW_TMS] = useState('Semua');
  const [loadingBatalkanTMS, setLoadingBatalkanTMS] = useState<string | null>(null);  

  // --- STATE DPT/TAMBAHAN ---
  const [dataDPTTambahan, setDataDPTTambahan] = useState<any[]>([]);
  const [loadingDPTTambahan, setLoadingDPTTambahan] = useState(false);
  const [searchDPTTambahan, setSearchDPTTambahan] = useState('');
  const [filterAlasanDPTTambahan, setFilterAlasanDPTTambahan] = useState('Semua');
  const [filterStatusDPTTambahan, setFilterStatusDPTTambahan] = useState('Semua');
  const [filterRT_DPTTambahan, setFilterRT_DPTTambahan] = useState('Semua');
  const [filterRW_DPTTambahan, setFilterRW_DPTTambahan] = useState('Semua');

  // STATE BARU KHUSUS MODAL KOREKSI
  const [koreksiWarga, setKoreksiWarga] = useState<any | null>(null);
  const [keteranganKoreksi, setKeteranganKoreksi] = useState('');
  const [loadingKoreksi, setLoadingKoreksi] = useState(false);

  // --- STATE TAMBAH PEMILIH BARU ---
  const [modalPemilihBaru, setModalPemilihBaru] = useState<any | null>(null);
  const [loadingPemilihBaru, setLoadingPemilihBaru] = useState(false);
  const [modalEditPemilihBaru, setModalEditPemilihBaru] = useState<any | null>(null);
  const [loadingEditPemilihBaru, setLoadingEditPemilihBaru] = useState(false);

  // --- STATE AKTIVITAS LOGIN ---
  const [dataStatusLogin, setDataStatusLogin] = useState<any[]>([]);
  const [loadingStatusLogin, setLoadingStatusLogin] = useState(false);
  const latestFetchRef = useRef<any>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Dipakai supaya refresh data dari realtime (aksi petugas lain) tidak
  // membuat posisi scroll lompat ke atas. Posisi disimpan dulu, data
  // di-refresh, lalu posisi dikembalikan setelah render selesai.
  async function refetchTanpaGeserScroll(fn: () => Promise<any>) {
    const container = scrollContainerRef.current;
    const posisiScroll = container?.scrollTop ?? 0;
    await fn();
    requestAnimationFrame(() => {
      if (container) container.scrollTop = posisiScroll;
    });
  }

  useEffect(() => {
    fetchLogo();

    async function pulihkanSesi() {
      // Cek dulu ke Supabase apakah sesi auth masih valid — ini lebih
      // diandalkan daripada cuma baca localStorage manual, supaya
      // petugas gak tiba-tiba "keluar sendiri" kalau localStorage
      // kosong/ke-reset (browser HP kadang reload tab di background).
      const { data: { session } } = await supabase.auth.getSession();
      const savedSession = localStorage.getItem('sesiPetugasPilkades');

      if (session && savedSession) {
        const userData = JSON.parse(savedSession);
        setUser(userData);
        if (userData.akses_menu && userData.akses_menu.length > 0)
          setActiveMenu(userData.akses_menu[0]);
        else setActiveMenu('Kosong');
      } else if (session && !savedSession) {
        // Sesi auth masih valid tapi data petugas belum ada di
        // localStorage (misal "Ingat Saya" gak dicentang) -> ambil ulang
        const { data } = await supabase
          .from('akun_petugas')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .single();
        if (data) {
          setUser(data);
          if (data.akses_menu && data.akses_menu.length > 0)
            setActiveMenu(data.akses_menu[0]);
          else setActiveMenu('Kosong');
        }
      }
    }

    pulihkanSesi();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWaktuSekarang(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ==========================================
  // EFEK & LISTENER
  // ==========================================

  useEffect(() => {
    if (activeMenu === 'Pengaturan') {
      fetchDaftarAkun();
    } else if (activeMenu === 'Dashboard') {
      fetchStats();
      fetchProgresPerWilayah();
      fetchFunnelData();
    } else if (activeMenu === 'Tugas Coklit') {
      fetchTugasCoklit();
      fetchStatistikCoklit();
    } else if (activeMenu === 'Coklit') {
      fetchCoklitReview();
      fetchCoklitValidasi();
    } else if (activeMenu === 'Data Bermasalah') {
      fetchDataBermasalah();
      fetchPemilihBaruVerifikasi();
      fetchBadgeCounts();
    } else if (activeMenu === 'DPS') {
      fetchDPS();
    } else if (activeMenu === 'DPT') {
      fetchDPT();
    } else if (activeMenu === 'Daftar Pemilih') {
      fetchDaftarPemilih();
    } else if (activeMenu === 'Daftar Pemilih') {
      fetchDaftarPemilih();
    } else if (activeMenu === 'TMS') {
      fetchTMS();
    } else if (activeMenu === 'DPT/Tambahan') {
      fetchDPTTambahan();
    } else if (activeMenu === 'Aktivitas Login') {
      fetchStatusLoginAkun();
    }
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== 'TMS') return;
    const delayDebounceFn = setTimeout(() => {
      fetchTMS();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTMS, filterStatusTMS, filterRT_TMS, filterRW_TMS]);
  
  useEffect(() => {
    if (activeMenu !== 'TMS') return;
  
    const channel = supabase
      .channel('realtime-tms')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penduduk' },
        () => {
          refetchTanpaGeserScroll(() => latestFetchRef.current.fetchTMS());
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== 'DPT/Tambahan') return;
    const delayDebounceFn = setTimeout(() => {
      fetchDPTTambahan();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [
    searchDPTTambahan,
    filterAlasanDPTTambahan,
    filterStatusDPTTambahan,
    filterRT_DPTTambahan,
    filterRW_DPTTambahan,
  ]);

  useEffect(() => {
    if (activeMenu !== 'DPT/Tambahan') return;

    const channel = supabase
      .channel('realtime-dpt-tambahan')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penduduk' },
        () => {
          refetchTanpaGeserScroll(() => latestFetchRef.current.fetchDPTTambahan());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMenu]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTugasCoklit();
    }, 500); // Nunggu 0.5 detik biar nggak spam request ke database
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (activeMenu !== 'Tugas Coklit') return;

    const channel = supabase
      .channel('realtime-tugas-coklit')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penduduk' },
        () => {
          refetchTanpaGeserScroll(async () => {
            await latestFetchRef.current.fetchTugasCoklit();
            await latestFetchRef.current.fetchStatistikCoklit();
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== 'Coklit') return;
    const delayDebounceFn = setTimeout(() => {
      fetchCoklitReview();
      fetchCoklitValidasi();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchCoklitReview, filterStatusCoklitReview]);

  useEffect(() => {
    if (activeMenu !== 'Coklit') return;

    const channel = supabase
      .channel('realtime-coklit-review')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penduduk' },
        () => {
          refetchTanpaGeserScroll(async () => {
            await latestFetchRef.current.fetchCoklitReview();
            await latestFetchRef.current.fetchCoklitValidasi();
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== 'DPT') return;
    const delayDebounceFn = setTimeout(() => {
      fetchDPT();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchDPT, filterRT_DPT, filterRW_DPT]);

  useEffect(() => {
    if (activeMenu !== 'Daftar Pemilih') return;
    setHalamanDaftarPemilih(1);
  }, [searchDaftarPemilih, filterRT_DaftarPemilih, filterRW_DaftarPemilih, filterStatusDaftarPemilih]);
  
  useEffect(() => {
    if (activeMenu !== 'Daftar Pemilih') return;
    const delayDebounceFn = setTimeout(() => {
      fetchDaftarPemilih();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [
    searchDaftarPemilih,
    filterRT_DaftarPemilih,
    filterRW_DaftarPemilih,
    filterStatusDaftarPemilih,
    halamanDaftarPemilih,
  ]);
  
  useEffect(() => {
    if (activeMenu !== 'Daftar Pemilih') return;
  
    const channel = supabase
      .channel('realtime-daftar-pemilih')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penduduk' },
        () => {
          refetchTanpaGeserScroll(() => latestFetchRef.current.fetchDaftarPemilih());
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMenu]);

  // ==========================================
  // FUNGSI DASHBOARD
  // ==========================================
  async function fetchStats() {
    if (!user) return;

    // Helper: kalau Petugas Coklit, kunci ke RT/RW dia. Kalau Admin/Super Admin, lihat semua.
    const baseFilter = (query: any) => {
      if (user?.role === 'Petugas Coklit') {
        if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
        if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
      }
      return query;
    };

    const { count: total } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    );
    const { count: belum } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).or('status_coklit.is.null,status_coklit.eq.Belum Coklit');
    const { count: lakiLaki } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).eq('KELAMIN', 'L');
    const { count: perempuan } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).eq('KELAMIN', 'P');

    setStats({
      total: total || 0,
      belum: belum || 0,
      sudah: (total || 0) - (belum || 0),
      lakiLaki: lakiLaki || 0,
      perempuan: perempuan || 0,
    });
  }

  useEffect(() => {
    if (activeMenu !== 'Dashboard') return;
  
    const channel = supabase
      .channel('realtime-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penduduk' },
        () => {
          refetchTanpaGeserScroll(async () => {
            await latestFetchRef.current.fetchStats();
            await latestFetchRef.current.fetchProgresPerWilayah();
            await latestFetchRef.current.fetchFunnelData();
          });
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeMenu]);

  async function fetchProgresPerWilayah() {
    setLoadingProgresWilayah(true);
  
    // Ambil SEMUA data penduduk dengan cara paginasi,
    // karena Supabase membatasi maksimal 1000 baris per request
    let dataPenduduk: any[] = [];
    let errorPenduduk: any = null;
    let dariBaris = 0;
    const ukuranHalaman = 1000;
  
    while (true) {
      let queryHalaman = supabase
        .from('penduduk')
        .select('RT, RW, status_coklit')
        .range(dariBaris, dariBaris + ukuranHalaman - 1);

      // KALAU PETUGAS COKLIT: kunci ke RT/RW dia sendiri
      if (user?.role === 'Petugas Coklit') {
        if (user?.rt_assigned) queryHalaman = queryHalaman.eq('RT', user.rt_assigned);
        if (user?.rw_assigned) queryHalaman = queryHalaman.eq('RW', user.rw_assigned);
      }

      const { data: halaman, error } = await queryHalaman;
  
      if (error) {
        errorPenduduk = error;
        break;
      }
  
      if (!halaman || halaman.length === 0) break;
  
      dataPenduduk = dataPenduduk.concat(halaman);
  
      if (halaman.length < ukuranHalaman) break; // udah halaman terakhir
  
      dariBaris += ukuranHalaman;
    }
  
    // Ambil daftar petugas coklit, biar tau siapa pegang RT/RW mana
    const { data: dataPetugas } = await supabase
      .from('akun_petugas')
      .select('nama_lengkap, rt_assigned, rw_assigned, role')
      .eq('role', 'Petugas Coklit');
  
    if (errorPenduduk) {
      console.error('Error mengambil data progres wilayah:', errorPenduduk);
      setLoadingProgresWilayah(false);
      return;
    }
  
    // Kelompokkan berdasarkan kombinasi RT + RW
    // HANYA proses RT 001-003 dan RW 001-006 (sesuai wilayah resmi desa)
    // RT/RW di luar itu (000, 024, 008, dll) otomatis diabaikan
    const grouped: Record<string, { total: number; sudah: number }> = {};
  
    (dataPenduduk || []).forEach((item: any) => {
      // Normalisasi ke string 3-digit, jaga-jaga kalau RT/RW tersimpan sebagai angka
      const rt = String(item.RT ?? '').padStart(3, '0');
      const rw = String(item.RW ?? '').padStart(3, '0');
  
      // Skip kalau RT/RW gak masuk daftar resmi (001-003 / 001-006)
      if (!DAFTAR_RT.includes(rt) || !DAFTAR_RW.includes(rw)) {
        return;
      }
  
      const key = `${rt}-${rw}`;
  
      if (!grouped[key]) {
        grouped[key] = { total: 0, sudah: 0 };
      }
      grouped[key].total += 1;
  
      if (item.status_coklit && item.status_coklit !== 'Belum Coklit') {
        grouped[key].sudah += 1;
      }
    });
  
    // Susun jadi array + urutkan dari progres PALING RENDAH duluan
    // (biar wilayah yang paling ketinggalan langsung keliatan di atas)
    const hasil = Object.keys(grouped).map((key) => {
      const [rt, rw] = key.split('-');
      const total = grouped[key].total;
      const sudah = grouped[key].sudah;
      const belum = total - sudah;
      const persen = total > 0 ? Math.round((sudah / total) * 100) : 0;
  
      const petugas = (dataPetugas || []).find(
        (p: any) => p.rt_assigned === rt && p.rw_assigned === rw
      );
  
      return {
        rt,
        rw,
        total,
        sudah,
        belum,
        persen,
        namaPetugas: petugas?.nama_lengkap || null,
      };
    });
  
    hasil.sort((a, b) => {
      if (a.persen !== b.persen) return a.persen - b.persen;
      if (a.rt !== b.rt) return a.rt.localeCompare(b.rt);
      return a.rw.localeCompare(b.rw);
    });
  
    setProgresPerWilayah(hasil);
    setLoadingProgresWilayah(false);
  }

  async function fetchFunnelData() {
    const baseFilter = (query: any) => {
      if (user?.role === 'Petugas Coklit') {
        if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
        if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
      }
      return query;
    };
  
    const { count: total } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    );
    const { count: belum } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).or('status_coklit.is.null,status_coklit.eq.Belum Coklit');
    const { count: divalidasiAdmin } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).eq('divalidasi_admin', true);
    const { count: masukDPS } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).eq('status_coklit', 'Ditemui').eq('divalidasi_admin', true);
    const { count: masukDPT } = await baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).eq('status_dpt', 'DPT');
  
    setDataFunnel({
      total: total || 0,
      sudahCoklit: (total || 0) - (belum || 0),
      divalidasiAdmin: divalidasiAdmin || 0,
      masukDPS: masukDPS || 0,
      masukDPT: masukDPT || 0,
    });
  }

  // ==========================================
  // FUNGSI TUGAS COKLIT
  // ==========================================
  async function fetchTugasCoklit() {
    if (!user) return;

    setLoadingCoklit(true);
    console.log('Petugas:', user.nama_lengkap);
    console.log('Filter yang dicari:', {
      RT: user.rt_assigned,
      RW: user.rw_assigned,
    });

    let query = supabase.from('penduduk').select('*', { count: 'exact' });

    // FILTER TAMBAHAN: Berdasarkan RT dan RW yang ditugaskan ke petugas
    if (user?.rt_assigned) {
      query = query.eq('RT', user.rt_assigned);
    }
    if (user?.rw_assigned) {
      query = query.eq('RW', user.rw_assigned);
    }

    // FILTER STATUS (dari kotak filter)
    if (statusFilter === 'Belum Coklit') {
      query = query.or('status_coklit.is.null,status_coklit.eq.Belum Coklit');
    } else if (statusFilter === 'Sudah Coklit') {
      query = query
        .not('status_coklit', 'is', null)
        .neq('status_coklit', 'Belum Coklit');
    } else if (statusFilter !== 'Semua') {
      query = query.eq('status_coklit', statusFilter);
    }

    // Logika Pencarian (Search)
    if (searchQuery) {
      query = query.or(
        `NAMA.ilike.%${searchQuery}%,NIK.ilike.%${searchQuery}%`
      );
    }

    const { data, count, error } = await query
      .order('NAMA', { ascending: true })
      .limit(150);

    if (!error) {
      setDataCoklit(data || []);
      setTotalDataCoklit(count || 0);
    }
    setLoadingCoklit(false);
  }

  // ==========================================
  // FUNGSI STATISTIK TUGAS COKLIT
  // ==========================================
  async function fetchStatistikCoklit() {
    if (!user) return;
    setLoadingStatistik(true);

    const baseFilter = (query: any) => {
      if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
      if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
      return query;
    };

    const totalQ = baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    );
    const belumQ = baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).or('status_coklit.is.null,status_coklit.eq.Belum Coklit');
    const ditemuiQ = baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).eq('status_coklit', 'Ditemui');
    const tmsQ = baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).in('status_coklit', ['Pindah', 'Meninggal', 'Tidak Dikenal']);
    const bermasalahQ = baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).eq('status_coklit', 'Perlu Koreksi');
    const pemilihBaruQ = baseFilter(
      supabase.from('penduduk').select('*', { count: 'exact', head: true })
    ).eq('status_coklit', 'Pemilih Baru - Perlu Verifikasi');

    const [
      totalRes,
      belumRes,
      ditemuiRes,
      tmsRes,
      bermasalahRes,
      pemilihBaruRes,
    ] = await Promise.all([
      totalQ,
      belumQ,
      ditemuiQ,
      tmsQ,
      bermasalahQ,
      pemilihBaruQ,
    ]);

    const total = totalRes.count || 0;
    const belum = belumRes.count || 0;

    setStatistikCoklit({
      total,
      sudahCoklit: total - belum,
      belumCoklit: belum,
      ditemui: ditemuiRes.count || 0,
      tms: tmsRes.count || 0,
      bermasalah: bermasalahRes.count || 0,
      menungguVerifikasi: pemilihBaruRes.count || 0,
    });

    setLoadingStatistik(false);
  }
  // ==========================================
  // FUNGSI DATA BERMASALAH
  // ==========================================
  async function fetchDataBermasalah() {
    setLoadingCoklit(true);
    console.log('Mencoba menarik data bermasalah...');

    let query = supabase
    .from('penduduk')
    .select('*')
    .ilike('status_coklit', 'Perlu Koreksi'); // Filter hanya yang bermasalah

    // KECUALI SUPER ADMIN: kunci ke RT/RW yang ditugaskan ke user yang login
    if (user?.role !== 'Super Admin') {
      if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
      if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error Supabase:', error);
      alert('Error saat mengambil data: ' + error.message);
    } else {
      console.log('Data hasil query:', data); // Harus muncul di console
      setDataCoklit(data || []);
    }
    setLoadingCoklit(false);
  }

  function bukaKoreksiEdit(item: any) {
    setModalKoreksiEdit({ ...item });
  }

  function lanjutkanKePilihanAksi(e: React.FormEvent) {
    e.preventDefault();
    if (!modalKoreksiEdit) return;
    setModalAksiSetelahEdit({ ...modalKoreksiEdit });
    setModalKoreksiEdit(null);
  }

  async function simpanKoreksiBermasalah(langsungKirimDPS: boolean) {
    if (!modalAksiSetelahEdit) return;

    setLoadingSimpanKoreksiEdit(true);

    const payload: any = {
      NAMA: modalAksiSetelahEdit.NAMA,
      NIK: modalAksiSetelahEdit.NIK,
      NKK: modalAksiSetelahEdit.NKK,
      TEMPAT_LAHIR: modalAksiSetelahEdit.TEMPAT_LAHIR || null,
      TANGGAL_LAHIR: modalAksiSetelahEdit.TANGGAL_LAHIR || null,
      ALAMAT: modalAksiSetelahEdit.ALAMAT,
      DUSUN: modalAksiSetelahEdit.DUSUN,
      RT: modalAksiSetelahEdit.RT,
      RW: modalAksiSetelahEdit.RW,
      status_coklit: modalAksiSetelahEdit.status_coklit,
      keterangan_koreksi: `${
        modalAksiSetelahEdit.keterangan_koreksi || ''
      } | DIKOREKSI oleh ${
        user.nama_lengkap
      } pada ${new Date().toLocaleDateString('id-ID')}`,
    };

    if (langsungKirimDPS) {
      payload.divalidasi_admin = true;
      payload.tanggal_validasi = new Date().toISOString();
      payload.divalidasi_oleh = user.nama_lengkap;
    } else {
      payload.divalidasi_admin = false;
      payload.tanggal_validasi = null;
      payload.divalidasi_oleh = null;
    }

    const { error } = await supabase
      .from('penduduk')
      .update(payload)
      .eq('id', modalAksiSetelahEdit.id);

    setLoadingSimpanKoreksiEdit(false);

    if (error) {
      alert('Gagal menyimpan koreksi: ' + error.message);
    } else {
      setModalAksiSetelahEdit(null);
      fetchDataBermasalah();
      fetchBadgeCounts();
      fetchStatistikCoklit();
    }
  }
  // Fungsi Update Normal (Ditemui, Meninggal, dll)

  // ==========================================
  // FUNGSI REVIEW COKLIT (ADMIN)
  // ==========================================
  async function fetchCoklitReview() {
    setLoadingCoklitReview(true);

    let query = supabase
      .from('penduduk')
      .select('*')
      .not('status_coklit', 'is', null)
      .not(
        'status_coklit',
        'in',
        '("Belum Coklit","Perlu Koreksi","Pemilih Baru - Perlu Verifikasi")'
      )
      .or('divalidasi_admin.is.null,divalidasi_admin.eq.false');

      if (user?.role === 'Petugas Coklit') {
        if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
        if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
      }

    if (searchCoklitReview) {
      query = query.or(
        `NAMA.ilike.%${searchCoklitReview}%,NIK.ilike.%${searchCoklitReview}%`
      );
    }
    if (filterStatusCoklitReview !== 'Semua') {
      query = query.eq('status_coklit', filterStatusCoklitReview);
    }

    const { data, error } = await query.order('NAMA', { ascending: true });

    if (error) {
      console.error('Error Supabase (Coklit Review):', error);
      alert('Error saat mengambil data review: ' + error.message);
    } else {
      setDataCoklitReview(data || []);
    }
    setLoadingCoklitReview(false);
  }

  async function fetchCoklitValidasi() {
    setLoadingCoklitValidasi(true);

    let query = supabase
      .from('penduduk')
      .select('*')
      .eq('divalidasi_admin', true);

    if (user?.role === 'Petugas Coklit') {
      if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
      if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
    }

    if (searchCoklitReview) {
      query = query.or(
        `NAMA.ilike.%${searchCoklitReview}%,NIK.ilike.%${searchCoklitReview}%`
      );
    }
    if (filterStatusCoklitReview !== 'Semua') {
      query = query.eq('status_coklit', filterStatusCoklitReview);
    }

    const { data, error } = await query.order('tanggal_validasi', {
      ascending: false,
    });

    if (error) {
      console.error('Error Supabase (Coklit Validasi):', error);
      alert('Error saat mengambil data tervalidasi: ' + error.message);
    } else {
      setDataCoklitValidasi(data || []);
    }
    setLoadingCoklitValidasi(false);
  }

  async function batalkanValidasiCoklit(item: any) {
    if (
      !confirm(
        `Batalkan validasi untuk ${item.NAMA}? Data akan kembali bisa diisi/diubah oleh petugas coklit di lapangan.`
      )
    )
      return;

    const { error } = await supabase
      .from('penduduk')
      .update({
        divalidasi_admin: false,
        tanggal_validasi: null,
        divalidasi_oleh: null,
      })
      .eq('id', item.id);

    if (error) {
      alert('Gagal membatalkan validasi: ' + error.message);
    } else {
      fetchCoklitValidasi();
      fetchCoklitReview();
    }
  }

  function toggleSelectCoklitReview(id: string) {
    setSelectedCoklitReview((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllCoklitReview() {
    if (selectedCoklitReview.length === dataCoklitReview.length) {
      setSelectedCoklitReview([]);
    } else {
      setSelectedCoklitReview(dataCoklitReview.map((item) => item.id));
    }
  }

  async function validasiMassal() {
    if (selectedCoklitReview.length === 0) {
      alert('Pilih minimal 1 data untuk divalidasi.');
      return;
    }

    if (
      !confirm(
        `Validasi ${selectedCoklitReview.length} data terpilih? Data akan dianggap final dan siap masuk DPS.`
      )
    )
      return;

    setLoadingValidasiMassal(true);

    const { error } = await supabase
      .from('penduduk')
      .update({
        divalidasi_admin: true,
        tanggal_validasi: new Date().toISOString(),
        divalidasi_oleh: user.nama_lengkap,
      })
      .in('id', selectedCoklitReview);

    setLoadingValidasiMassal(false);

    if (error) {
      alert('Gagal validasi massal: ' + error.message);
    } else {
      setSelectedCoklitReview([]);
      fetchCoklitReview();
    }
  }

  function bukaEditCoklit(item: any) {
    setModalEditCoklit({ ...item });
  }

  async function simpanEditCoklit(
    e: React.FormEvent,
    langsungValidasi: boolean
  ) {
    e.preventDefault();
    if (!modalEditCoklit) return;

    setLoadingSimpanEditCoklit(true);

    const payload: any = {
      NAMA: modalEditCoklit.NAMA,
      NIK: modalEditCoklit.NIK,
      NKK: modalEditCoklit.NKK,
      TEMPAT_LAHIR: modalEditCoklit.TEMPAT_LAHIR || null,
      TANGGAL_LAHIR: modalEditCoklit.TANGGAL_LAHIR || null,
      ALAMAT: modalEditCoklit.ALAMAT,
      DUSUN: modalEditCoklit.DUSUN,
      RT: modalEditCoklit.RT,
      RW: modalEditCoklit.RW,
      TPS: modalEditCoklit.TPS,
      status_coklit: modalEditCoklit.status_coklit,
      ragam_disabilitas: modalEditCoklit.ragam_disabilitas || null,
    };

    if (langsungValidasi) {
      payload.divalidasi_admin = true;
      payload.tanggal_validasi = new Date().toISOString();
      payload.divalidasi_oleh = user.nama_lengkap;
    }

    const { error } = await supabase
      .from('penduduk')
      .update(payload)
      .eq('id', modalEditCoklit.id);

    setLoadingSimpanEditCoklit(false);

    if (error) {
      alert('Gagal menyimpan perubahan: ' + error.message);
    } else {
      setModalEditCoklit(null);
      fetchCoklitReview();
    }
  }

  async function fetchPemilihBaruVerifikasi() {
    setLoadingPemilihBaruList(true);

      let query = supabase
      .from('penduduk')
      .select('*')
      .eq('status_coklit', 'Pemilih Baru - Perlu Verifikasi');

    // KECUALI SUPER ADMIN: kunci ke RT/RW yang ditugaskan ke user yang login
    if (user?.role !== 'Super Admin') {
      if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
      if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error Supabase (Pemilih Baru):', error);
      alert('Error saat mengambil data pemilih baru: ' + error.message);
    } else {
      setDataPemilihBaru(data || []);
    }
    setLoadingPemilihBaruList(false);
  }

  async function fetchBadgeCounts() {
    let koreksiQuery = supabase
    .from('penduduk')
    .select('*', { count: 'exact', head: true })
    .eq('status_coklit', 'Perlu Koreksi');

  let pemilihBaruQuery = supabase
    .from('penduduk')
    .select('*', { count: 'exact', head: true })
    .eq('status_coklit', 'Pemilih Baru - Perlu Verifikasi');

  // KECUALI SUPER ADMIN: kunci ke RT/RW yang ditugaskan ke user yang login
  if (user?.role !== 'Super Admin') {
    if (user?.rt_assigned) {
      koreksiQuery = koreksiQuery.eq('RT', user.rt_assigned);
      pemilihBaruQuery = pemilihBaruQuery.eq('RT', user.rt_assigned);
    }
    if (user?.rw_assigned) {
      koreksiQuery = koreksiQuery.eq('RW', user.rw_assigned);
      pemilihBaruQuery = pemilihBaruQuery.eq('RW', user.rw_assigned);
    }
  }

  const [koreksiRes, pemilihBaruRes] = await Promise.all([
    koreksiQuery,
    pemilihBaruQuery,
  ]);

    setCountKoreksi(koreksiRes.count || 0);
    setCountPemilihBaru(pemilihBaruRes.count || 0);
  }

  async function approvePemilihBaru(item: any) {
    if (!item.NIK?.startsWith('SEMENTARA')) {
      const { data: duplikat } = await supabase
        .from('penduduk')
        .select('id, NAMA, NIK')
        .eq('NIK', item.NIK)
        .neq('id', item.id);

      if (duplikat && duplikat.length > 0) {
        alert(
          `PERINGATAN: NIK ${item.NIK} sudah dipakai oleh data lain:\n\n` +
            duplikat.map((d) => `- ${d.NAMA}`).join('\n') +
            `\n\nCek dan perbaiki data sebelum menyetujui. Verifikasi dibatalkan.`
        );
        return;
      }
    }

    if (!confirm(`Setujui ${item.NAMA} sebagai pemilih baru yang valid?`))
      return;

    const { error } = await supabase
      .from('penduduk')
      .update({
        status_coklit: 'Ditemui',
        keterangan_koreksi: `${item.keterangan_koreksi} | DIVERIFIKASI oleh ${
          user.nama_lengkap
        } pada ${new Date().toLocaleDateString('id-ID')}`,
      })
      .eq('id', item.id);

    if (error) {
      alert('Gagal verifikasi: ' + error.message);
    } else {
      fetchPemilihBaruVerifikasi();
      fetchBadgeCounts();
      fetchStatistikCoklit();
    }
  }

  // Hanya data yang NIK-nya sudah e-KTP asli (bukan kosong/SEMENTARA)
  // yang boleh ikut disetujui secara massal. Yang belum lengkap
  // tetap harus diklik manual satu-satu.
  function bisaDisetujuiMassal(item: any) {
    return item.NIK && !item.NIK.startsWith('SEMENTARA');
  }

  function toggleSelectPemilihBaru(id: string) {
    setSelectedPemilihBaru((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllPemilihBaru() {
    const idYangBisa = dataPemilihBaru
      .filter(bisaDisetujuiMassal)
      .map((item) => item.id);
    const semuaTerpilih =
      idYangBisa.length > 0 &&
      idYangBisa.every((id) => selectedPemilihBaru.includes(id));
    setSelectedPemilihBaru(semuaTerpilih ? [] : idYangBisa);
  }

  async function setujuiPemilihBaruMassal() {
    if (selectedPemilihBaru.length === 0) {
      alert('Pilih minimal 1 data untuk disetujui.');
      return;
    }

    if (
      !confirm(
        `Setujui ${selectedPemilihBaru.length} data terpilih sebagai pemilih baru yang valid?`
      )
    )
      return;

    setLoadingSetujuiMassal(true);

    const itemsToProcess = dataPemilihBaru.filter((item) =>
      selectedPemilihBaru.includes(item.id)
    );

    let berhasil = 0;
    const dilewati: string[] = [];

    for (const item of itemsToProcess) {
      const { data: duplikat } = await supabase
        .from('penduduk')
        .select('id, NAMA')
        .eq('NIK', item.NIK)
        .neq('id', item.id);

      if (duplikat && duplikat.length > 0) {
        dilewati.push(`${item.NAMA} (NIK duplikat)`);
        continue;
      }

      const { error } = await supabase
        .from('penduduk')
        .update({
          status_coklit: 'Ditemui',
          keterangan_koreksi: `${item.keterangan_koreksi} | DIVERIFIKASI oleh ${
            user.nama_lengkap
          } pada ${new Date().toLocaleDateString('id-ID')}`,
        })
        .eq('id', item.id);

      if (!error) {
        berhasil += 1;
      } else {
        dilewati.push(`${item.NAMA} (gagal disimpan)`);
      }
    }

    setLoadingSetujuiMassal(false);
    setSelectedPemilihBaru([]);

    let pesan = `${berhasil} data berhasil disetujui & masuk DPS.`;
    if (dilewati.length > 0) {
      pesan +=
        `\n\n${dilewati.length} data dilewati:\n` +
        dilewati.map((n) => `- ${n}`).join('\n');
    }
    alert(pesan);

    fetchPemilihBaruVerifikasi();
    fetchBadgeCounts();
    fetchStatistikCoklit();
  }

  async function tolakPemilihBaru(item: any) {
    const alasan = prompt(`Alasan penolakan data ${item.NAMA}:`);
    if (!alasan) return;

    if (!confirm('Data yang ditolak akan DIHAPUS permanen. Lanjutkan?')) return;

    const { error } = await supabase
      .from('penduduk')
      .delete()
      .eq('id', item.id);

    if (error) {
      alert('Gagal menghapus: ' + error.message);
    } else {
      fetchPemilihBaruVerifikasi();
      fetchBadgeCounts();
      fetchStatistikCoklit();
    }
  }

  // ==========================================
  // FUNGSI DPS
  // ==========================================
  async function fetchDPS() {
    setLoadingDPS(true);

    const { data, error } = await supabase
      .from('penduduk')
      .select('*')
      .eq('status_coklit', 'Ditemui')
      .eq('divalidasi_admin', true)
      .not(
        'status_coklit',
        'in',
        '("Meninggal","Pindah","Tidak Dikenal","Perlu Koreksi","Belum Coklit")'
      )
      .is('status_dpt', null)
      .order('NAMA', { ascending: true });

    if (error) {
      console.error('Error Supabase (DPS):', error);
      alert('Error saat mengambil data DPS: ' + error.message);
    } else {
      setDataDPS(data || []);
    }
    setLoadingDPS(false);
  }
  // Data DPS setelah difilter RT/RW (client-side, karena datanya udah ke-fetch semua)
  const dataDPSFiltered = dataDPS.filter((item) => {
    const matchRT = filterRT_DPS === 'Semua' || item.RT === filterRT_DPS;
    const matchRW = filterRW_DPS === 'Semua' || item.RW === filterRW_DPS;
    return matchRT && matchRW;
  });

  function toggleSelectDPS(id: string) {
    setSelectedDPS((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAllDPS() {
    if (selectedDPS.length === dataDPSFiltered.length) {
      setSelectedDPS([]);
    } else {
      setSelectedDPS(dataDPSFiltered.map((item) => item.id));
    }
  }
  function exportDPSToCSV() {
    const dataToExport =
      selectedDPS.length > 0
        ? dataDPSFiltered.filter((item) => selectedDPS.includes(item.id))
        : dataDPSFiltered;

    if (dataToExport.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'No',
      'Nama',
      'NIK',
      'NKK',
      'Tanggal Lahir',
      'Umur Hari H',
      'Tempat Lahir',
      'Alamat',
      'Dusun',
      'RT',
      'RW',
      'TPS',
      'Ragam Disabilitas',
      'Status Coklit',
    ];
    const rows = dataToExport.map((item, idx) => [
      idx + 1,
      item.NAMA,
      item.NIK,
      item.NKK || '-',
      item.TANGGAL_LAHIR
        ? new Date(item.TANGGAL_LAHIR).toLocaleDateString('id-ID')
        : '-',
      hitungUmurHariH(item.TANGGAL_LAHIR) !== null
        ? `${hitungUmurHariH(item.TANGGAL_LAHIR)} tahun`
        : '-',
      item.TEMPAT_LAHIR || '-',
      item.ALAMAT || '-',
      item.DUSUN || '-',
      item.RT,  
      item.RW,
      item.TPS,
      item.ragam_disabilitas || '-',
      item.status_coklit,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    // \uFEFF di depan biar Excel baca karakter Indonesia (é, spasi, dll) dengan benar
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const namaFile = `DPS${
      filterRT_DPS !== 'Semua' ? `_RT${filterRT_DPS}` : ''
    }${filterRW_DPS !== 'Semua' ? `_RW${filterRW_DPS}` : ''}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.href = url;
    link.download = namaFile;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function kirimKeDPT() {
    const dataToSend =
      selectedDPS.length > 0
        ? dataDPSFiltered.filter((item) => selectedDPS.includes(item.id))
        : dataDPSFiltered;

    if (dataToSend.length === 0) {
      alert('Tidak ada data untuk dikirim ke DPT.');
      return;
    }
    // CEK 1: NIK sementara (belum punya e-KTP) gak boleh masuk DPT
    const nikSementara = dataToSend.filter((item) =>
      item.NIK?.startsWith('SEMENTARA')
    );
    if (nikSementara.length > 0) {
      alert(
        `Tidak bisa lanjut: ${nikSementara.length} pemilih masih pakai NIK sementara (belum punya e-KTP resmi):\n\n` +
          nikSementara.map((item) => `- ${item.NAMA}`).join('\n') +
          `\n\nLengkapi NIK asli mereka dulu sebelum dikirim ke DPT.`
      );
      return;
    }

    // CEK 2: duplikat NIK di dalam data yang mau dikirim sendiri
    const nikCount: Record<string, number> = {};
    dataToSend.forEach((item) => {
      nikCount[item.NIK] = (nikCount[item.NIK] || 0) + 1;
    });
    const nikDuplikatInternal = Object.keys(nikCount).filter(
      (nik) => nikCount[nik] > 1
    );
    if (nikDuplikatInternal.length > 0) {
      alert(
        `Ditemukan NIK duplikat di dalam data yang mau dikirim:\n\n` +
          nikDuplikatInternal.join('\n') +
          `\n\nPerbaiki dulu data ini sebelum lanjut.`
      );
      return;
    }

    // CEK 3: apakah NIK-nya udah lebih dulu ada di tabel DPT
    setLoadingKirimDPT(true);
    const niks = dataToSend.map((item) => item.NIK);
    const { data: existingDPT, error: cekError } = await supabase
      .from('penduduk')
      .select('NAMA, NIK')
      .eq('status_dpt', 'DPT')
      .in('NIK', niks);

    if (cekError) {
      setLoadingKirimDPT(false);
      alert('Gagal mengecek duplikat: ' + cekError.message);
      return;
    }

    if (existingDPT && existingDPT.length > 0) {
      setLoadingKirimDPT(false);
      alert(
        `${existingDPT.length} NIK sudah lebih dulu terdaftar di DPT:\n\n` +
          existingDPT.map((item) => `- ${item.NAMA} (${item.NIK})`).join('\n')
      );
      return;
    }

    if (
      !confirm(
        `Kirim ${dataToSend.length} pemilih ke DPT? Data yang sudah dikirim tidak akan tampil lagi di menu DPS.`
      )
    )
      return;

    setLoadingKirimDPT(true);

    const ids = dataToSend.map((item) => item.id);

    const { error } = await supabase
      .from('penduduk')
      .update({
        status_dpt: 'DPT',
        tanggal_masuk_dpt: new Date().toISOString(),
      })
      .in('id', ids);

    setLoadingKirimDPT(false);

    if (error) {
      alert('Gagal mengirim ke DPT: ' + error.message);
    } else {
      alert(`${dataToSend.length} pemilih berhasil dimasukkan ke DPT.`);
      setSelectedDPS([]);
      fetchDPS();
    }
  }
  async function fetchDPT() {
    setLoadingDPT(true);

    let query = supabase.from('penduduk').select('*').eq('status_dpt', 'DPT');

    if (searchDPT) {
      query = query.or(`NAMA.ilike.%${searchDPT}%,NIK.ilike.%${searchDPT}%`);
    }
    if (filterRT_DPT !== 'Semua') query = query.eq('RT', filterRT_DPT);
    if (filterRW_DPT !== 'Semua') query = query.eq('RW', filterRW_DPT);

    const { data, error } = await query.order('NAMA', { ascending: true });

    if (error) {
      console.error('Error Supabase (DPT):', error);
      alert('Error saat mengambil data DPT: ' + error.message);
    } else {
      setDataDPT(data || []);
    }
    setLoadingDPT(false);
  }

  async function batalkanDariDPT(item: any) {
    if (
      !confirm(
        `Batalkan status DPT untuk ${item.NAMA}? Data akan kembali muncul di menu DPS.`
      )
    )
      return;

    const { error } = await supabase
      .from('penduduk')
      .update({ status_dpt: null, tanggal_masuk_dpt: null })
      .eq('id', item.id);

    if (error) {
      alert('Gagal membatalkan: ' + error.message);
    } else {
      fetchDPT();
    }
  }

  function exportDPTToCSV() {
    if (dataDPT.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'No',
      'Nama',
      'NIK',
      'NKK',
      'Tanggal Lahir',
      'Umur Hari H',
      'Alamat',
      'Dusun',
      'RT',
      'RW',
      'TPS',
      'Ragam Disabilitas',
      'Tanggal Masuk DPT',
    ];
    const rows = dataDPT.map((item, idx) => [
      idx + 1,
      item.NAMA,
      item.NIK,
      item.NKK || '-',
      item.TANGGAL_LAHIR
        ? new Date(item.TANGGAL_LAHIR).toLocaleDateString('id-ID')
        : '-',
      hitungUmurHariH(item.TANGGAL_LAHIR) !== null
        ? `${hitungUmurHariH(item.TANGGAL_LAHIR)} tahun`
        : '-',
      item.ALAMAT || '-',
      item.DUSUN || '-',
      item.RT,
      item.RW,
      item.TPS,
      item.ragam_disabilitas || '-',
      item.tanggal_masuk_dpt
        ? new Date(item.tanggal_masuk_dpt).toLocaleDateString('id-ID')
        : '-',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DPT_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

    // ==========================================
// FUNGSI DAFTAR PEMILIH (DATA MURNI SUPABASE)
// ==========================================
async function fetchDaftarPemilih() {
  setLoadingDaftarPemilih(true);

  let query = supabase.from('penduduk').select('*', { count: 'exact' });

  // KALAU PETUGAS COKLIT: otomatis kunci ke RT/RW yang ditugaskan ke dia
  // biar dia gak perlu repot ganti-ganti filter, langsung liat wilayahnya sendiri
  if (user?.role === 'Petugas Coklit') {
    if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
    if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
  } else {
    // ADMIN/SUPER ADMIN/dll: tetep pakai filter dropdown manual
    if (filterRT_DaftarPemilih !== 'Semua') {
      query = query.eq('RT', filterRT_DaftarPemilih);
    }
    if (filterRW_DaftarPemilih !== 'Semua') {
      query = query.eq('RW', filterRW_DaftarPemilih);
    }
  }

  if (filterStatusDaftarPemilih === 'Belum Coklit') {
    query = query.or('status_coklit.is.null,status_coklit.eq.Belum Coklit');
  } else if (filterStatusDaftarPemilih !== 'Semua') {
    query = query.eq('status_coklit', filterStatusDaftarPemilih);
  }

  if (searchDaftarPemilih) {
    query = query.or(
      `NAMA.ilike.%${searchDaftarPemilih}%,NIK.ilike.%${searchDaftarPemilih}%,NKK.ilike.%${searchDaftarPemilih}%`
    );
  }

  const dariBaris = (halamanDaftarPemilih - 1) * UKURAN_HALAMAN_DAFTAR_PEMILIH;
  const sampaiBaris = dariBaris + UKURAN_HALAMAN_DAFTAR_PEMILIH - 1;

  const { data, count, error } = await query
    .order('NAMA', { ascending: true })
    .range(dariBaris, sampaiBaris);

  if (error) {
    console.error('Error Supabase (Daftar Pemilih):', error);
    alert('Error saat mengambil data daftar pemilih: ' + error.message);
  } else {
    setDataDaftarPemilih(data || []);
    setTotalDaftarPemilih(count || 0);
  }
  setLoadingDaftarPemilih(false);
}

    // ==========================================
// DETEKSI DATA GANDA (Daftar Pemilih)
// ==========================================
// 1. NIK sama persis (bukan NIK sementara) => ganda
// 2. NIK beda, TAPI Nama + Tanggal Lahir + RT + RW sama persis => tetap ganda
// 3. Nama sama tapi tanggal lahir beda => BUKAN ganda, diabaikan
const dataGandaIds = useMemo(() => {
  const nikMap: Record<string, string[]> = {};
  const namaTglMap: Record<string, string[]> = {};

  dataDaftarPemilih.forEach((item) => {
    if (item.NIK && !item.NIK.startsWith('SEMENTARA')) {
      if (!nikMap[item.NIK]) nikMap[item.NIK] = [];
      nikMap[item.NIK].push(item.id);
    }
    if (item.NAMA && item.TANGGAL_LAHIR) {
      const key = `${item.NAMA.trim().toUpperCase()}|${item.TANGGAL_LAHIR}|${
        item.RT || ''
      }|${item.RW || ''}`;
      if (!namaTglMap[key]) namaTglMap[key] = [];
      namaTglMap[key].push(item.id);
    }
  });

  const ganda = new Set<string>();
  Object.values(nikMap).forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => ganda.add(id));
  });
  Object.values(namaTglMap).forEach((ids) => {
    if (ids.length > 1) ids.forEach((id) => ganda.add(id));
  });

  return ganda;
}, [dataDaftarPemilih]);

// ==========================================
// AKSI: EDIT DAFTAR PEMILIH
// ==========================================
function bukaEditDaftarPemilih(item: any) {
  setModalEditDaftarPemilih({ ...item });
}

async function simpanEditDaftarPemilih(e: React.FormEvent) {
  e.preventDefault();
  if (!modalEditDaftarPemilih) return;

  setLoadingSimpanEditDaftarPemilih(true);

  const { error } = await supabase
    .from('penduduk')
    .update({
      NAMA: modalEditDaftarPemilih.NAMA,
      NIK: modalEditDaftarPemilih.NIK,
      NKK: modalEditDaftarPemilih.NKK,
      TANGGAL_LAHIR: modalEditDaftarPemilih.TANGGAL_LAHIR,
      TEMPAT_LAHIR: modalEditDaftarPemilih.TEMPAT_LAHIR || null,
      ALAMAT: modalEditDaftarPemilih.ALAMAT,
      DUSUN: modalEditDaftarPemilih.DUSUN,
      RT: modalEditDaftarPemilih.RT,
      RW: modalEditDaftarPemilih.RW,
      TPS: modalEditDaftarPemilih.TPS,
      ragam_disabilitas: modalEditDaftarPemilih.ragam_disabilitas || null,
    })
    .eq('id', modalEditDaftarPemilih.id);

  setLoadingSimpanEditDaftarPemilih(false);

  if (error) {
    alert('Gagal menyimpan perubahan: ' + error.message);
  } else {
    setModalEditDaftarPemilih(null);
    fetchDaftarPemilih();
  }
}

// ==========================================
// AKSI: APPROVE LANGSUNG KE DPT
// ==========================================
async function approveDPTDariDaftarPemilih(item: any) {
  if (isTMS(item)) {
    alert(
      `${item.NAMA} berstatus TMS (${item.status_coklit}). Data TMS tidak bisa di-approve ke DPT.`
    );
    return;
  }
  if (item.NIK?.startsWith('SEMENTARA')) {
    alert(
      `${item.NAMA} masih pakai NIK sementara (belum e-KTP resmi). Lengkapi NIK dulu sebelum di-approve ke DPT.`
    );
    return;
  }
  if (item.status_dpt === 'DPT') {
    alert(`${item.NAMA} sudah terdaftar di DPT.`);
    return;
  }

  const { data: existingDPT } = await supabase
    .from('penduduk')
    .select('id, NAMA')
    .eq('status_dpt', 'DPT')
    .eq('NIK', item.NIK)
    .neq('id', item.id);

  if (existingDPT && existingDPT.length > 0) {
    alert(
      `NIK ini sudah terdaftar di DPT atas nama ${existingDPT[0].NAMA}. Cek dulu kemungkinan data ganda.`
    );
    return;
  }

  if (!confirm(`Approve ${item.NAMA} langsung sebagai DPT?`)) return;

  const { error } = await supabase
    .from('penduduk')
    .update({
      divalidasi_admin: true,
      tanggal_validasi: new Date().toISOString(),
      divalidasi_oleh: user.nama_lengkap,
      status_dpt: 'DPT',
      tanggal_masuk_dpt: new Date().toISOString(),
    })
    .eq('id', item.id);

  if (error) {
    alert('Gagal approve ke DPT: ' + error.message);
  } else {
    fetchDaftarPemilih();
  }
}

// ==========================================
// AKSI: UBAH KE STATUS TMS
// ==========================================
function bukaModalUbahTMS(item: any) {
  setModalUbahTMS(item);
  setPilihanStatusTMS(
    STATUS_TMS_LIST.includes(item.status_coklit) ? item.status_coklit : 'Pindah'
  );
}

// ==========================================
// AKSI: KEMBALIKAN KE MS (DARI TMS)
// ==========================================
async function kembalikanKeMS(item: any) {
  if (
    !confirm(
      `Kembalikan ${item.NAMA} ke status MS (Memenuhi Syarat)? Status TMS akan dihapus dan data bisa dicoklit ulang.`
    )
  )
    return;

  const { error } = await supabase
    .from('penduduk')
    .update({ status_coklit: 'Ditemui' })
    .eq('id', item.id);

  if (error) {
    alert('Gagal mengubah status: ' + error.message);
  } else {
    fetchDaftarPemilih();
  }
}

async function simpanUbahTMS() {
  if (!modalUbahTMS) return;
  setLoadingUbahTMS(true);

  const { error } = await supabase
    .from('penduduk')
    .update({ status_coklit: pilihanStatusTMS })
    .eq('id', modalUbahTMS.id);

  setLoadingUbahTMS(false);

  if (error) {
    alert('Gagal mengubah status: ' + error.message);
  } else {
    setModalUbahTMS(null);
    fetchDaftarPemilih();
  }
}

// ==========================================
// AKSI: HAPUS DATA
// ==========================================
async function hapusDaftarPemilih(item: any) {
  if (
    !confirm(
      `Yakin ingin menghapus data ${item.NAMA} secara PERMANEN? Aksi ini tidak bisa dibatalkan.`
    )
  )
    return;

  const { error } = await supabase.from('penduduk').delete().eq('id', item.id);

  if (error) {
    alert('Gagal menghapus data: ' + error.message);
  } else {
    fetchDaftarPemilih();
  }
}

    // ==========================================
// FUNGSI TMS (TIDAK MEMENUHI SYARAT)
// ==========================================
async function fetchTMS() {
  setLoadingTMS(true);

  let query = supabase
    .from('penduduk')
    .select('*')
    .in('status_coklit', ['Pindah', 'Meninggal', 'Tidak Dikenal']);

  // KALAU PETUGAS COKLIT: otomatis kunci ke RT/RW yang ditugaskan ke dia
  if (user?.role === 'Petugas Coklit') {
    if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
    if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
  } else {
    if (filterRT_TMS !== 'Semua') query = query.eq('RT', filterRT_TMS);
    if (filterRW_TMS !== 'Semua') query = query.eq('RW', filterRW_TMS);
  }

  if (filterStatusTMS !== 'Semua') {
    query = query.eq('status_coklit', filterStatusTMS);
  }

  if (searchTMS) {
    query = query.or(`NAMA.ilike.%${searchTMS}%,NIK.ilike.%${searchTMS}%`);
  }

  const { data, error } = await query.order('NAMA', { ascending: true });

  if (error) {
    console.error('Error Supabase (TMS):', error);
    alert('Error saat mengambil data TMS: ' + error.message);
  } else {
    setDataTMS(data || []);
  }
  setLoadingTMS(false);
}

async function batalkanTMS(item: any) {
  if (
    !confirm(
      `Batalkan status "${item.status_coklit}" untuk ${item.NAMA}? Data akan kembali berstatus "Belum Coklit" dan bisa dicoklit ulang oleh petugas.`
    )
  )
    return;

  setLoadingBatalkanTMS(item.id);

  const { error } = await supabase
    .from('penduduk')
    .update({
      status_coklit: 'Belum Coklit',
      keterangan_koreksi: null,
      latitude: null,
      longitude: null,
    })
    .eq('id', item.id);

  setLoadingBatalkanTMS(null);

  if (error) {
    alert('Gagal membatalkan status: ' + error.message);
  } else {
    fetchTMS();
  }
}

function exportTMSToCSV() {
  if (dataTMS.length === 0) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }

  const headers = [
    'No',
    'Nama',
    'NIK',
    'NKK',
    'Alamat',
    'Dusun',
    'RT',
    'RW',
    'Status TMS',
  ];
  const rows = dataTMS.map((item, idx) => [
    idx + 1,
    item.NAMA,
    item.NIK,
    item.NKK || '-',
    item.ALAMAT || '-',
    item.DUSUN || '-',
    item.RT,
    item.RW,
    item.status_coklit,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `TMS_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

    // ==========================================
  // FUNGSI DPT/TAMBAHAN (REKAP HASIL TEMUAN LAPANGAN)
  // ==========================================
  async function fetchDPTTambahan() {
    setLoadingDPTTambahan(true);

    let query = supabase
      .from('penduduk')
      .select('*')
      .eq('sumber_data', 'Tambahan Petugas');

    // KECUALI SUPER ADMIN: kunci ke RT/RW yang ditugaskan ke user yang login
    if (user?.role !== 'Super Admin') {
      if (user?.rt_assigned) query = query.eq('RT', user.rt_assigned);
      if (user?.rw_assigned) query = query.eq('RW', user.rw_assigned);
    } else {
      if (filterRT_DPTTambahan !== 'Semua')
        query = query.eq('RT', filterRT_DPTTambahan);
      if (filterRW_DPTTambahan !== 'Semua')
        query = query.eq('RW', filterRW_DPTTambahan);
    }

    if (searchDPTTambahan) {
      query = query.or(
        `NAMA.ilike.%${searchDPTTambahan}%,NIK.ilike.%${searchDPTTambahan}%`
      );
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error Supabase (DPT Tambahan):', error);
      alert('Error saat mengambil data DPT Tambahan: ' + error.message);
      setLoadingDPTTambahan(false);
      return;
    }

    // FILTER TAMBAHAN DI SISI CLIENT (karena alasan & status hasil parsing teks)
    let hasil = data || [];

    if (filterAlasanDPTTambahan !== 'Semua') {
      hasil = hasil.filter(
        (item) =>
          parseAlasanTambahan(item.keterangan_koreksi) ===
          filterAlasanDPTTambahan
      );
    }

    if (filterStatusDPTTambahan !== 'Semua') {
      hasil = hasil.filter(
        (item) => hitungStatusTerkini(item).label === filterStatusDPTTambahan
      );
    }

    setDataDPTTambahan(hasil);
    setLoadingDPTTambahan(false);
  }

  function exportDPTTambahanToCSV() {
    if (dataDPTTambahan.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'No',
      'Nama',
      'NIK',
      'NKK',
      'Alamat',
      'Dusun',
      'RT',
      'RW',
      'TPS',
      'Alasan Tambahan',
      'Ditambahkan Oleh',
      'Status Terkini',
    ];
    const rows = dataDPTTambahan.map((item, idx) => [
      idx + 1,
      item.NAMA,
      item.NIK,
      item.NKK || '-',
      item.ALAMAT || '-',
      item.DUSUN || '-',
      item.RT,
      item.RW,
      item.TPS,
      parseAlasanTambahan(item.keterangan_koreksi),
      parseDitambahkanOleh(item.keterangan_koreksi),
      hitungStatusTerkini(item).label,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DPT_Tambahan_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // FUNGSI UTAMA COKLIT DENGAN GPS
  // ==========================================

  // Helper untuk ambil lokasi
  function getPosisiGPS(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        reject(new Error('Browser tidak mendukung GPS'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

  // Fungsi Update Status dengan GPS
  async function handleUpdateStatusCoklit(id: string, statusBaru: string) {
    const itemTerkait = dataCoklit.find((d) => d.id === id);
    if (itemTerkait?.divalidasi_admin && user.role === 'Petugas Coklit') {
      alert(
        'Data ini sudah divalidasi admin dan masuk DPS/DPT. Tidak bisa diubah dari sini. Hubungi admin desa jika ada kesalahan data.'
      );
      return;
    }

    try {
      // 1. Minta lokasi dulu
      const posisi = await getPosisiGPS();
      const lat = posisi.coords.latitude;
      const lng = posisi.coords.longitude;

      // 2. Update UI instan
      setDataCoklit((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status_coklit: statusBaru,
                latitude: lat,
                longitude: lng,
              }
            : item
        )
      );

      // 3. Simpan ke Supabase
      const { error } = await supabase
        .from('penduduk')
        .update({
          status_coklit: statusBaru,
          latitude: lat,
          longitude: lng,
          keterangan_koreksi: null,
        })
        .eq('id', id);

      if (error) throw error;
      fetchStatistikCoklit();
    } catch (err: any) {
      alert(
        'Gagal ambil lokasi GPS: ' +
          (err.message || 'Pastikan izin lokasi diaktifkan!')
      );
    }
  }

  // Fungsi Toggle Ragam Disabilitas
  function toggleDisabilitas(item: any, ragam: string) {
    const current = item.ragam_disabilitas
      ? item.ragam_disabilitas.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const updated = current.includes(ragam)
      ? current.filter((r: string) => r !== ragam)
      : [...current, ragam];
    handleUpdateDisabilitas(item.id, updated.join(', '));
  }

  async function handleUpdateDisabilitas(id: string, ragamBaru: string) {
    // Update UI instan
    setDataCoklit((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ragam_disabilitas: ragamBaru } : item
      )
    );

    const { error } = await supabase
      .from('penduduk')
      .update({ ragam_disabilitas: ragamBaru || null })
      .eq('id', id);

    if (error) {
      alert('Gagal menyimpan data disabilitas: ' + error.message);
      fetchTugasCoklit();
    }
  }

  // Fungsi Koreksi dengan GPS
  async function simpanKoreksiGPS(e: React.FormEvent) {
    e.preventDefault();
    if (!koreksiWarga) return;

    setLoadingKoreksi(true);

    try {
      const posisi = await getPosisiGPS();

      await supabase
        .from('penduduk')
        .update({
          status_coklit: 'Perlu Koreksi',
          keterangan_koreksi: keteranganKoreksi,
          latitude: posisi.coords.latitude,
          longitude: posisi.coords.longitude,
        })
        .eq('id', koreksiWarga.id);

      fetchTugasCoklit(); // Refresh data
      setKoreksiWarga(null);
      setKeteranganKoreksi('');
    } catch (err: any) {
      alert(
        'Gagal menyimpan koreksi lokasi: ' + (err.message || 'Aktifkan GPS!')
      );
    } finally {
      setLoadingKoreksi(false);
    }
  }

  // FUNGSI BARU: Simpan Koreksi dengan Alasan
  async function simpanKoreksi(e: React.FormEvent) {
    e.preventDefault();
    if (!koreksiWarga) return;

    setLoadingKoreksi(true);

    // Update UI instan
    setDataCoklit((prev) =>
      prev.map((item) =>
        item.id === koreksiWarga.id
          ? {
              ...item,
              status_coklit: 'Perlu Koreksi',
              keterangan_koreksi: keteranganKoreksi,
            }
          : item
      )
    );

    const { error } = await supabase
      .from('penduduk')
      .update({
        status_coklit: 'Perlu Koreksi',
        keterangan_koreksi: keteranganKoreksi,
      })
      .eq('id', koreksiWarga.id);

    setLoadingKoreksi(false);

    if (error) {
      alert('Gagal menyimpan koreksi: ' + error.message);
      fetchTugasCoklit();
    } else {
      setKoreksiWarga(null);
      setKeteranganKoreksi('');
      fetchStatistikCoklit();
    }
  }
  function bukaModalPemilihBaru() {
    setModalPemilihBaru({
      NAMA: '',
      NIK: '',
      NKK: '',
      ALAMAT: '',
      DUSUN: '',
      RT: user?.rt_assigned || '001',
      RW: user?.rw_assigned || '001',
      TPS: '',
      TANGGAL_LAHIR: '',
      TEMPAT_LAHIR: '',
      JENIS_KELAMIN: 'L',
      alasan_tambahan: '', // misal: "Pemilih Pemula", "Pindahan", "Purnawirawan TNI/Polri", "Terlewat Pendataan"
    });
  }

  async function simpanPemilihBaru(e: React.FormEvent) {
    e.preventDefault();
    if (!modalPemilihBaru) return;

    setLoadingPemilihBaru(true);

    const nikFinal = modalPemilihBaru.NIK?.trim()
      ? modalPemilihBaru.NIK.trim()
      : `SEMENTARA-${Date.now()}`;

    const { error } = await supabase.from('penduduk').insert({
      NAMA: modalPemilihBaru.NAMA,
      NIK: nikFinal,
      NKK: modalPemilihBaru.NKK,
      ALAMAT: modalPemilihBaru.ALAMAT,
      DUSUN: modalPemilihBaru.DUSUN,
      RT: modalPemilihBaru.RT,
      RW: modalPemilihBaru.RW,
      TPS: modalPemilihBaru.TPS,
      TANGGAL_LAHIR: modalPemilihBaru.TANGGAL_LAHIR || null,
      TEMPAT_LAHIR: modalPemilihBaru.TEMPAT_LAHIR || null,
      KELAMIN: modalPemilihBaru.JENIS_KELAMIN,
      status_coklit: 'Pemilih Baru - Perlu Verifikasi',
      keterangan_koreksi: `PEMILIH BARU (${modalPemilihBaru.alasan_tambahan}) - ditambahkan oleh ${user.nama_lengkap}`,
      sumber_data: 'Tambahan Petugas', // penanda ini bukan dari data awal
    });

    setLoadingPemilihBaru(false);

    if (error) {
      alert('Gagal menyimpan pemilih baru: ' + error.message);
    } else {
      setModalPemilihBaru(null);
      fetchTugasCoklit();
      fetchStatistikCoklit();
    }
  }

function bukaEditPemilihBaru(item: any) {
  setModalEditPemilihBaru({
    id: item.id,
    NAMA: item.NAMA || '',
    NIK: item.NIK?.startsWith('SEMENTARA') ? '' : item.NIK || '',
    NKK: item.NKK || '',
    TEMPAT_LAHIR: item.TEMPAT_LAHIR || '',
    TANGGAL_LAHIR: item.TANGGAL_LAHIR || '',
    ALAMAT: item.ALAMAT || '',
    DUSUN: item.DUSUN || '',
    RT: item.RT || '001',
    RW: item.RW || '001',
    TPS: item.TPS || '',
    KELAMIN: item.KELAMIN || 'L',
    alasan_tambahan: parseAlasanTambahan(item.keterangan_koreksi) !== '-'
      ? parseAlasanTambahan(item.keterangan_koreksi)
      : '',
    keterangan_koreksi_asli: item.keterangan_koreksi,
  });
}

async function simpanEditPemilihBaru(e: React.FormEvent) {
  e.preventDefault();
  if (!modalEditPemilihBaru) return;

  setLoadingEditPemilihBaru(true);

  const nikFinal = modalEditPemilihBaru.NIK?.trim()
    ? modalEditPemilihBaru.NIK.trim()
    : `SEMENTARA-${Date.now()}`;

  // Pertahankan info "ditambahkan oleh siapa" yang asli, cuma catatan diperbarui
  const ditambahkanOleh = parseDitambahkanOleh(modalEditPemilihBaru.keterangan_koreksi_asli);
  const keteranganBaru = `PEMILIH BARU (${modalEditPemilihBaru.alasan_tambahan}) - ditambahkan oleh ${
    ditambahkanOleh !== '-' ? ditambahkanOleh : user.nama_lengkap
  } | DIEDIT oleh ${user.nama_lengkap} pada ${new Date().toLocaleDateString('id-ID')}`;

  const { error } = await supabase
    .from('penduduk')
    .update({
      NAMA: modalEditPemilihBaru.NAMA,
      NIK: nikFinal,
      NKK: modalEditPemilihBaru.NKK,
      ALAMAT: modalEditPemilihBaru.ALAMAT,
      DUSUN: modalEditPemilihBaru.DUSUN,
      RT: modalEditPemilihBaru.RT,
      RW: modalEditPemilihBaru.RW,
      TPS: modalEditPemilihBaru.TPS,
      TEMPAT_LAHIR: modalEditPemilihBaru.TEMPAT_LAHIR || null,
      TANGGAL_LAHIR: modalEditPemilihBaru.TANGGAL_LAHIR || null,
      KELAMIN: modalEditPemilihBaru.KELAMIN,
      keterangan_koreksi: keteranganBaru,
    })
    .eq('id', modalEditPemilihBaru.id);

  setLoadingEditPemilihBaru(false);

  if (error) {
    alert('Gagal menyimpan perubahan: ' + error.message);
  } else {
    setModalEditPemilihBaru(null);
    fetchPemilihBaruVerifikasi();
  }
}

  // ==========================================
  // FUNGSI LOGIN & LOGOUT
  // ==========================================
 async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    const email = `${username}@pilkades.internal`;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setLoginError('Username atau Password salah!');
      setLoginLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('akun_petugas')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    if (error || !data) {
      setLoginError('Login berhasil tapi data petugas tidak ditemukan. Hubungi admin.');
      setLoginLoading(false);
      return;
    }

    setUser(data);
    if (rememberMe)
      localStorage.setItem('sesiPetugasPilkades', JSON.stringify(data));
    if (data.akses_menu && data.akses_menu.length > 0)
      setActiveMenu(data.akses_menu[0]);
    else setActiveMenu('Kosong');

    // CATAT LOG LOGIN
    await supabase.from('log_login').insert({
      petugas_id: data.id,
      nama_petugas: data.nama_lengkap,
      device_id: getDeviceId(),
      user_agent: navigator.userAgent,
    });

    setLoginLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setUsername('');
    setPassword('');
    setRememberMe(false);
    localStorage.removeItem('sesiPetugasPilkades');
  }

  // ==========================================
  // FUNGSI PENGATURAN AKUN
  // ==========================================
  async function fetchDaftarAkun() {
    setLoadingAkun(true);
    const { data, error } = await supabase
      .from('akun_petugas')
      .select('*')
      .order('role', { ascending: true });
    if (!error) setDaftarAkun(data || []);
    setLoadingAkun(false);
  }

  function tambahAkunBaru() {
    setModalAkun({
      username: '',
      password: '',
      nama_lengkap: '',
      role: 'Petugas Coklit',
      akses_menu: [],
      rt_assigned: '001',
      rw_assigned: '001',
    });
  }

  function toggleMenuAkses(menuName: string) {
    setModalAkun((prev: any) => {
      const currentAkses = prev.akses_menu || [];
      if (currentAkses.includes(menuName)) {
        return {
          ...prev,
          akses_menu: currentAkses.filter((m: string) => m !== menuName),
        };
      } else {
        return { ...prev, akses_menu: [...currentAkses, menuName] };
      }
    });
  }

  async function simpanAkun(e: React.FormEvent) {
    e.preventDefault();
    setLoadingSimpan(true);

    const payloadToSave = { ...modalAkun };
    if (
      payloadToSave.role !== 'Petugas Coklit' &&
      payloadToSave.role !== 'KPPS'
    ) {
      payloadToSave.tps_assigned = null;
    }

    let error;
    if (payloadToSave.id) {
      const res = await supabase
        .from('akun_petugas')
        .update(payloadToSave)
        .eq('id', payloadToSave.id);
      error = res.error;
    } else {
      const res = await supabase.from('akun_petugas').insert(payloadToSave);
      error = res.error;
    }

    setLoadingSimpan(false);

    if (error) {
      alert('Gagal menyimpan akun: ' + error.message);
    } else {
      if (modalAkun.id === user.id) {
        setUser(modalAkun);
        localStorage.setItem('sesiPetugasPilkades', JSON.stringify(modalAkun));
      }
      setModalAkun(null);
      fetchDaftarAkun();
    }
  }

  // ==========================================
// FUNGSI AKTIVITAS LOGIN
// ==========================================
async function fetchStatusLoginAkun() {
  setLoadingStatusLogin(true);

  // 1. Ambil semua akun petugas
  const { data: akunList, error: errorAkun } = await supabase
    .from('akun_petugas')
    .select('id, nama_lengkap, username, role')
    .order('nama_lengkap', { ascending: true });

  if (errorAkun) {
    console.error('Error Supabase (Akun):', errorAkun);
    alert('Error saat mengambil data akun: ' + errorAkun.message);
    setLoadingStatusLogin(false);
    return;
  }

  // 2. Ambil log login HARI INI SAJA (cukup buat status & deteksi multi-device,
  // biar query-nya ringan, gak tarik 30 hari kayak sebelumnya)
  const awalHariIni = new Date();
  awalHariIni.setHours(0, 0, 0, 0);

  const { data: logHariIni, error: errorLog } = await supabase
    .from('log_login')
    .select('*')
    .gte('waktu_login', awalHariIni.toISOString())
    .order('waktu_login', { ascending: false });

  if (errorLog) {
    console.error('Error Supabase (Log Login):', errorLog);
    alert('Error saat mengambil data log login: ' + errorLog.message);
    setLoadingStatusLogin(false);
    return;
  }

  // 3. Kelompokkan log hari ini per petugas_id
  const grouped: Record<string, any[]> = {};
  (logHariIni || []).forEach((log) => {
    if (!grouped[log.petugas_id]) grouped[log.petugas_id] = [];
    grouped[log.petugas_id].push(log);
  });

  const sekarang = new Date().getTime();

  const hasil = (akunList || []).map((akun) => {
    const logsAkun = grouped[akun.id] || [];

    if (logsAkun.length === 0) {
      return {
        ...akun,
        status: 'Offline' as const,
        loginTerakhir: null,
        jumlahDeviceHariIni: 0,
      };
    }

    const loginTerakhir = logsAkun[0].waktu_login; // sudah terurut terbaru duluan
    const deviceSet = new Set(
      logsAkun.map((l) => l.device_id).filter(Boolean)
    );
    const menitSejakLogin =
      (sekarang - new Date(loginTerakhir).getTime()) / 1000 / 60;

    let status: 'Online' | 'Offline' | 'Multi-Device' = 'Offline';
    if (deviceSet.size >= 2) {
      status = 'Multi-Device';
    } else if (menitSejakLogin <= BATAS_ONLINE_MENIT) {
      status = 'Online';
    }

    return {
      ...akun,
      status,
      loginTerakhir,
      jumlahDeviceHariIni: deviceSet.size,
    };
  });

  // Urutkan: Multi-Device dulu (paling perlu perhatian), lalu Online, lalu Offline
  const prioritas: Record<string, number> = {
    'Multi-Device': 0,
    Online: 1,
    Offline: 2,
  };
  hasil.sort((a, b) => {
    if (prioritas[a.status] !== prioritas[b.status])
      return prioritas[a.status] - prioritas[b.status];
    return a.nama_lengkap.localeCompare(b.nama_lengkap);
  });

  setDataStatusLogin(hasil);
  setLoadingStatusLogin(false);
}

  async function hapusAkun(id: string, nama: string) {
    if (confirm(`Yakin ingin menghapus akun ${nama}?`)) {
      await supabase.from('akun_petugas').delete().eq('id', id);
      fetchDaftarAkun();
    }
  }

  async function fetchLogo() {
    const { data } = await supabase
      .from('pengaturan_aplikasi')
      .select('logo_url')
      .eq('id', 1)
      .single();
    if (data?.logo_url) setLogoUrl(data.logo_url);
  }

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingLogo(true);

    const namaFile = `logo-${Date.now()}.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(namaFile, file, { upsert: true });

    if (uploadError) {
      alert('Gagal upload logo: ' + uploadError.message);
      setLoadingLogo(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('branding')
      .getPublicUrl(namaFile);

    const { error: updateError } = await supabase
      .from('pengaturan_aplikasi')
      .update({
        logo_url: publicUrlData.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    setLoadingLogo(false);

    if (updateError) {
      alert('Gagal simpan logo: ' + updateError.message);
    } else {
      setLogoUrl(publicUrlData.publicUrl);
    }
  }

  latestFetchRef.current = {
    fetchTugasCoklit,
    fetchStatistikCoklit,
    fetchCoklitReview,
    fetchCoklitValidasi,
    fetchDPTTambahan,
    fetchTMS,
    fetchDaftarPemilih,
    fetchStats,
    fetchProgresPerWilayah,
    fetchFunnelData,
  };

  // ==========================================
  // TAMPILAN 1: HALAMAN LOGIN
  // ==========================================
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 rounded-full bg-emerald-500/20 blur-[100px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 rounded-full bg-yellow-400/20 blur-[100px]"></div>
        <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden z-10 border border-slate-200/60">
          <div className="h-2 w-full flex">
            <div className="w-1/3 bg-red-600"></div>
            <div className="w-1/3 bg-yellow-400"></div>
            <div className="w-1/3 bg-emerald-600"></div>
          </div>
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Pemilihan Kepala Desa
              </h1>
              <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-wider">
                Desa Karangsambung
              </p>
            </div>
            {loginError && (
              <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl text-center animate-pulse">
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 outline-none"
                  placeholder="Masukkan username..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:bg-white focus:border-emerald-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center justify-between pt-1 pb-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
                    />
                    <svg
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-500">
                    Ingat Saya
                  </span>
                </label>
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex justify-center items-center"
              >
                {loginLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'MASUK SISTEM'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // TAMPILAN 2: HALAMAN UTAMA & SIDEBAR
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
      {/* SIDEBAR */}
      {/* OVERLAY GELAP KETIKA MENU DIBUKA DI MOBILE */}
{mobileMenuOpen && (
  <div
    className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
    onClick={() => setMobileMenuOpen(false)}
  ></div>
)}

<aside
  className={`w-72 bg-white border-r border-slate-200 flex flex-col fixed md:sticky top-0 h-screen shadow-[4px_0_24px_rgba(0,0,0,0.15)] md:shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 md:z-20 transition-transform duration-300 ${
    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
  }`}
>
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black shadow-md shadow-emerald-500/20 overflow-hidden p-1">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              'K'
            )}
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-900 leading-tight">
              Karangsambung
            </h2>
            <p className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase">
              Digital
            </p>
          </div>
        </div>
        <div className="p-4 mx-4 mt-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-extrabold text-slate-400 mb-0.5 uppercase tracking-wider">
            Masuk sebagai:
          </p>
          <p className="font-black text-sm text-slate-800 truncate">
            {user.nama_lengkap}
          </p>
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              {user.role}
            </span>
            {user.tps_assigned && (
              <span className="inline-flex px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
                TPS {user.tps_assigned}
              </span>
            )}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto mt-2">
          <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-2 mb-3">
            Menu Utama
          </p>
          {user.akses_menu &&
            user.akses_menu.map((menu: string) => (
              <button
                key={menu}
                onClick={() => {
                  setActiveMenu(menu);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all text-left ${
                  activeMenu === menu
                    ? 'bg-orange-50 text-orange-600 border border-orange-100 shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <div
                  className={
                    activeMenu === menu ? 'text-orange-500' : 'text-slate-400'
                  }
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    ></path>
                  </svg>
                </div>
                {menu}
              </button>
            ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              ></path>
            </svg>{' '}
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* KONTEN KANAN */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="bg-white border-b border-slate-200 p-4 md:px-8 md:py-5 flex justify-between items-center z-10 shadow-sm md:shadow-none">
  <div className="flex items-center gap-3">
    <button
      onClick={() => setMobileMenuOpen(true)}
      className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-slate-50 border border-slate-200 text-slate-600"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
    </button>
    <h1 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">
      {activeMenu}
    </h1>
  </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="md:hidden px-3 py-2 text-red-600 rounded-lg bg-red-50 font-bold text-xs border border-red-100"
            >
              Keluar
            </button>
          </div>
        </header>

        <div ref={scrollContainerRef} className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50/50 relative">
          {/* ======================================================== */}
          {/* KONTEN MENU: TUGAS COKLIT */}
          {/* ======================================================== */}
          {activeMenu === 'Tugas Coklit' && (
            <div className="max-w-[1400px] mx-auto pb-10">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Tugas Coklit
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  Kerja lapangan petugas
                </p>
              </div>

              {/* KOTAK STATISTIK KINERJA */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Total Pemilih
                  </p>
                  <p className="text-2xl font-black text-slate-800">
                    {loadingStatistik ? '...' : statistikCoklit.total}
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">
                    Sudah Coklit
                  </p>
                  <p className="text-2xl font-black text-emerald-700">
                    {loadingStatistik ? '...' : statistikCoklit.sudahCoklit}
                  </p>
                </div>
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 shadow-sm">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-wider mb-1">
                    Belum Coklit
                  </p>
                  <p className="text-2xl font-black text-orange-700">
                    {loadingStatistik ? '...' : statistikCoklit.belumCoklit}
                  </p>
                </div>
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 shadow-sm">
                  <p className="text-[10px] font-black text-teal-600 uppercase tracking-wider mb-1">
                    Ditemui
                  </p>
                  <p className="text-2xl font-black text-teal-700">
                    {loadingStatistik ? '...' : statistikCoklit.ditemui}
                  </p>
                </div>
                <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 shadow-sm">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    TMS
                  </p>
                  <p className="text-2xl font-black text-slate-700">
                    {loadingStatistik ? '...' : statistikCoklit.tms}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-wider mb-1">
                    Data Bermasalah
                  </p>
                  <p className="text-2xl font-black text-red-700">
                    {loadingStatistik ? '...' : statistikCoklit.bermasalah}
                  </p>
                </div>
              </div>

              {/* TOMBOL TAMBAH PEMILIH BARU */}
              <button
                onClick={() => bukaModalPemilihBaru()}
                className="w-full mb-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
                Tambah Pemilih Baru (Ditemukan di Lapangan)
              </button>


              {/* INPUT PENCARIAN & FILTER */}
              <div className="mb-6 space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari Nama atau NIK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-4 border-2 border-slate-200 rounded-xl font-bold focus:border-emerald-500 outline-none shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'Semua', label: 'Semua' },
                    { id: 'Belum Coklit', label: 'Belum' },
                    { id: 'Sudah Coklit', label: 'Sudah Coklit' },
                    { id: 'Ditemui', label: 'Ditemui' },
                    { id: 'Tidak di Rumah', label: 'Tidak di Rumah' },
                    { id: 'Pindah', label: 'Pindah' },
                    { id: 'Meninggal', label: 'Meninggal' },
                    { id: 'Tidak Dikenal', label: 'Tidak Dikenal' },
                    { id: 'Perlu Koreksi', label: 'Perlu Koreksi' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide border-2 transition-all ${
                        statusFilter === f.id
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 text-orange-700 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2 shadow-sm">
                Menampilkan {dataCoklit.length} dari {totalDataCoklit} data.
                Klik status kunjungan untuk menyimpan hasil lapangan.
              </div>

              {loadingCoklit ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {dataCoklit.map((item) => {
                    const isSudah =
                      item.status_coklit &&
                      item.status_coklit !== 'Belum Coklit';
                    const statusText = item.status_coklit || 'Belum Coklit';

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden p-5 md:p-7"
                      >
                        <div
                          className={`absolute top-0 left-0 w-2 h-full ${
                            isSudah ? 'bg-emerald-500' : 'bg-orange-400'
                          }`}
                        ></div>

                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
                              {item.NAMA}
                            </h3>
                            <p className="text-sm font-bold text-slate-600 mt-2">
                              NIK {item.NIK} &middot; KK{' '}
                              {item.NKK || 'BELUM ADA'}
                            </p>
                            <p className="text-sm font-bold text-slate-600 mt-1">
                              Lahir:{' '}
                              {item.TANGGAL_LAHIR
                                ? new Date(
                                    item.TANGGAL_LAHIR
                                  ).toLocaleDateString('id-ID')
                                : 'Tidak diketahui'}{' '}
                              &middot; Dusun {item.DUSUN || 'I'} &middot; RT{' '}
                              {item.RT || '001'}/RW {item.RW || '001'}
                            </p>
                          </div>

                          <span
                            className={`px-4 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider whitespace-nowrap mt-1 ${
                              isSudah
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-orange-50 text-orange-600 border-orange-200'
                            }`}
                          >
                            {isSudah ? statusText : 'BELUM'}
                          </span>
                        </div>

                        <hr className="border-t-[1.5px] border-dashed border-slate-200 my-5" />

                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 text-sm font-bold text-slate-400">
                          <div className="flex items-center gap-2 text-orange-500">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth="2.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              ></path>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              ></path>
                            </svg>
                            <span className="uppercase">
                              {item.ALAMAT || 'ALAMAT TIDAK DIKETAHUI'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-5 h-5 text-orange-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth="2.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              ></path>
                            </svg>
                            <span>
                              {isSudah
                                ? 'Sudah dikunjungi'
                                : 'Menunggu kunjungan'}
                            </span>
                          </div>
                        </div>

                        <div className="mb-6">
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                            </svg>
                            Ragam Disabilitas (opsional, klik jika ada)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {DAFTAR_RAGAM_DISABILITAS.map((ragam) => {
                              const current = item.ragam_disabilitas
                                ? item.ragam_disabilitas.split(',').map((s: string) => s.trim())
                                : [];
                              const isChecked = current.includes(ragam);
                              return (
                                <button
                                  key={ragam}
                                  type="button"
                                  onClick={() => toggleDisabilitas(item, ragam)}
                                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                                    isChecked
                                      ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                  }`}
                                >
                                  {ragam}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* TOMBOL STATUS ATAU KUNCI DATA (kalau sudah divalidasi admin) */}
                        {item.divalidasi_admin &&
                        user.role === 'Petugas Coklit' ? (
                          <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-5 flex items-center gap-3 text-slate-500">
                            <svg
                              className="w-6 h-6 shrink-0"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              strokeWidth="2.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              ></path>
                            </svg>
                            <div>
                              <p className="font-black text-sm">
                                Data Terkunci
                              </p>
                              <p className="text-xs font-bold">
                                Sudah divalidasi admin sebagai "
                                {item.status_coklit}
                                ". Hubungi admin desa jika ada kesalahan data.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                            {[
                              {
                                id: 'Ditemui',
                                icon: (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  ></path>
                                ),
                              },
                              {
                                id: 'Tidak di Rumah',
                                icon: (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 001 1m-6 0h6"
                                  ></path>
                                ),
                              },
                              {
                                id: 'Pindah',
                                icon: (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                  ></path>
                                ),
                              },
                              {
                                id: 'Meninggal',
                                icon: (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                  ></path>
                                ),
                              },
                              {
                                id: 'Tidak Dikenal',
                                icon: (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                                  ></path>
                                ),
                              },
                              {
                                id: 'Perlu Koreksi',
                                icon: (
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  ></path>
                                ),
                              },
                            ].map((btn) => {
                              const isActive = item.status_coklit === btn.id;
                              return (
                                <button
                                  key={btn.id}
                                  onClick={() => {
                                    // JIKA KLIK PERLU KOREKSI -> BUKA POPUP
                                    if (btn.id === 'Perlu Koreksi') {
                                      setKoreksiWarga(item);
                                      setKeteranganKoreksi(
                                        item.keterangan_koreksi || ''
                                      );
                                    } else {
                                      // JIKA KLIK STATUS LAINNYA -> LANGSUNG SIMPAN
                                      const targetStatus = isActive
                                        ? 'Belum Coklit'
                                        : btn.id;
                                      handleUpdateStatusCoklit(
                                        item.id,
                                        targetStatus
                                      );
                                    }
                                  }}
                                  className={`flex items-center gap-3 px-5 py-4 rounded-xl border-2 text-[15px] font-black transition-all ${
                                    isActive
                                      ? 'bg-[#14b8a6] border-[#14b8a6] text-white shadow-md'
                                      : 'bg-white border-slate-100 text-slate-800 hover:border-slate-300'
                                  }`}
                                >
                                  <svg
                                    className={`w-6 h-6 shrink-0 ${
                                      isActive ? 'text-white' : 'text-slate-800'
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth="2.5"
                                  >
                                    {btn.icon}
                                  </svg>
                                  {btn.id}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeMenu === 'Coklit' && (
            <div className="max-w-6xl mx-auto pb-10">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Review Hasil Coklit
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  Cek dan validasi data hasil kerja petugas sebelum masuk DPS.
                </p>
              </div>

              {/* TAB SWITCHER */}
              <div className="flex gap-2 mb-6 border-b border-slate-200">
                <button
                  onClick={() => setTabCoklitReview('Pending')}
                  className={`px-5 py-3 font-black text-sm border-b-2 transition-all flex items-center gap-2 ${
                    tabCoklitReview === 'Pending'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Menunggu Review
                  {dataCoklitReview.length > 0 && (
                    <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {dataCoklitReview.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTabCoklitReview('Divalidasi')}
                  className={`px-5 py-3 font-black text-sm border-b-2 transition-all flex items-center gap-2 ${
                    tabCoklitReview === 'Divalidasi'
                      ? 'border-slate-600 text-slate-700'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Sudah Divalidasi
                  {dataCoklitValidasi.length > 0 && (
                    <span className="bg-slate-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {dataCoklitValidasi.length}
                    </span>
                  )}
                </button>
              </div>
              {tabCoklitReview === 'Pending' && (
                <>
                  {/* SEARCH & FILTER */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Cari Nama atau NIK..."
                      value={searchCoklitReview}
                      onChange={(e) => setSearchCoklitReview(e.target.value)}
                      className="flex-1 min-w-[200px] p-3 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-500 outline-none shadow-sm"
                    />
                    <select
                      value={filterStatusCoklitReview}
                      onChange={(e) =>
                        setFilterStatusCoklitReview(e.target.value)
                      }
                      className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Semua">Semua Status</option>
                      <option value="Ditemui">Ditemui</option>
                      <option value="Tidak di Rumah">Tidak di Rumah</option>
                      <option value="Pindah">Pindah</option>
                      <option value="Meninggal">Meninggal</option>
                      <option value="Tidak Dikenal">Tidak Dikenal</option>
                    </select>
                  </div>

                  {/* INFO & AKSI MASSAL */}
                  <div className="flex flex-wrap justify-between items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-6 text-sm font-bold shadow-sm">
                    <span>
                      {dataCoklitReview.length} data menunggu review
                      {selectedCoklitReview.length > 0 &&
                        ` · ${selectedCoklitReview.length} dipilih`}
                    </span>
                    <button
                      onClick={validasiMassal}
                      disabled={
                        loadingValidasiMassal ||
                        selectedCoklitReview.length === 0
                      }
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      {loadingValidasiMassal
                        ? 'Memvalidasi...'
                        : `Validasi Terpilih (${selectedCoklitReview.length})`}
                    </button>
                  </div>

                  {loadingCoklitReview ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-600"></div>
                    </div>
                  ) : dataCoklitReview.length === 0 ? (
                    <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
                      Tidak ada data yang perlu direview. Semua sudah
                      divalidasi.
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="p-4 w-10">
                              <input
                                type="checkbox"
                                checked={
                                  selectedCoklitReview.length ===
                                    dataCoklitReview.length &&
                                  dataCoklitReview.length > 0
                                }
                                onChange={toggleSelectAllCoklitReview}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Nama
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              NIK
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Tgl Lahir
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              RT/RW
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Status Coklit
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataCoklitReview.map((item) => (
                            <tr
                              key={item.id}
                              className={`border-b border-slate-100 hover:bg-slate-50 ${
                                selectedCoklitReview.includes(item.id)
                                  ? 'bg-emerald-50/50'
                                  : ''
                              }`}
                            >
                              <td className="p-4">
                                <input
                                  type="checkbox"
                                  checked={selectedCoklitReview.includes(
                                    item.id
                                  )}
                                  onChange={() =>
                                    toggleSelectCoklitReview(item.id)
                                  }
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td className="p-4 font-bold uppercase">
                                {item.NAMA}
                              </td>
                              <td className="p-4 font-mono">{item.NIK}</td>
                              <td className="p-4 text-xs">
                                {item.TANGGAL_LAHIR
                                  ? new Date(
                                      item.TANGGAL_LAHIR
                                    ).toLocaleDateString('id-ID')
                                  : '-'}
                              </td>
                              <td className="p-4">
                                {item.RT || '001'}/{item.RW || '001'}
                              </td>
                              <td className="p-4">
                                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-black uppercase">
                                  {item.status_coklit}
                                </span>
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => bukaEditCoklit(item)}
                                  className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200"
                                >
                                  Cek & Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {tabCoklitReview === 'Divalidasi' && (
                <>

                   {/* SEARCH & FILTER */}
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="text"
        placeholder="Cari Nama atau NIK..."
        value={searchCoklitReview}
        onChange={(e) => setSearchCoklitReview(e.target.value)}
        className="flex-1 min-w-[200px] p-3 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-slate-500 outline-none shadow-sm"
      />
      <select
        value={filterStatusCoklitReview}
        onChange={(e) => setFilterStatusCoklitReview(e.target.value)}
        className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-500 cursor-pointer"
      >
        <option value="Semua">Semua Status</option>
        <option value="Ditemui">Ditemui</option>
        <option value="Tidak di Rumah">Tidak di Rumah</option>
        <option value="Pindah">Pindah</option>
        <option value="Meninggal">Meninggal</option>
        <option value="Tidak Dikenal">Tidak Dikenal</option>
      </select>
    </div>

                  {loadingCoklitValidasi ? (
                    <div className="flex justify-center py-20">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-slate-500"></div>
                    </div>
                  ) : dataCoklitValidasi.length === 0 ? (
                    <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
                      Belum ada data yang divalidasi.
                    </div>
                  ) : (
                    <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Nama
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              NIK
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Tgl Lahir
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              RT/RW
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Status Coklit
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Divalidasi Oleh
                            </th>
                            <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dataCoklitValidasi.map((item) => (
                            <tr
                              key={item.id}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="p-4 font-bold uppercase">
                                {item.NAMA}
                              </td>
                              <td className="p-4 font-mono">{item.NIK}</td>
                              <td className="p-4 text-xs">
                                {item.TANGGAL_LAHIR
                                  ? new Date(
                                      item.TANGGAL_LAHIR
                                    ).toLocaleDateString('id-ID')
                                  : '-'}
                              </td>
                              <td className="p-4">
                                {item.RT || '001'}/{item.RW || '001'}
                              </td>
                              <td className="p-4">
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-black uppercase">
                                  {item.status_coklit}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-slate-500">
                                {item.divalidasi_oleh || '-'}
                              </td>
                              <td className="p-4">
                                <button
                                  onClick={() => batalkanValidasiCoklit(item)}
                                  className="px-3 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold text-xs rounded-lg transition-colors border border-red-100"
                                >
                                  Batalkan Validasi
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeMenu === 'Data Bermasalah' && (
            <div className="max-w-5xl mx-auto pb-10">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Data Bermasalah & Verifikasi
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  Tinjau koreksi dari petugas dan verifikasi pemilih baru
                  sebelum masuk DPS.
                </p>
              </div>

              {/* TAB SWITCHER */}
              <div className="flex gap-2 mb-6 border-b border-slate-200">
                <button
                  onClick={() => setTabBermasalah('Koreksi')}
                  className={`px-5 py-3 font-black text-sm border-b-2 transition-all flex items-center gap-2 ${
                    tabBermasalah === 'Koreksi'
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Perlu Koreksi
                  {countKoreksi > 0 && (
                    <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {countKoreksi}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setTabBermasalah('PemilihBaru')}
                  className={`px-5 py-3 font-black text-sm border-b-2 transition-all flex items-center gap-2 ${
                    tabBermasalah === 'PemilihBaru'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Verifikasi Pemilih Baru
                  {countPemilihBaru > 0 && (
                    <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {countPemilihBaru}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB: PERLU KOREKSI (konten lama, tetap sama) */}
              {tabBermasalah === 'Koreksi' &&
                (loadingCoklit ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-orange-500"></div>
                  </div>
                ) : dataCoklit.length === 0 ? (
                  <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
                    Tidak ada data bermasalah saat ini.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dataCoklit.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-6 rounded-2xl border-l-4 border-orange-500 border shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-lg uppercase">
                              {item.NAMA}
                            </h3>
                            <p className="text-xs font-bold text-slate-500">
                              NIK: {item.NIK}
                            </p>
                          </div>
                          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                            Perlu Koreksi
                          </span>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                          <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">
                            Catatan Koreksi Petugas:
                          </p>
                          <p className="text-sm font-bold text-slate-800 italic">
                            "{item.keterangan_koreksi}"
                          </p>
                        </div>
                        <button
                          onClick={() => bukaKoreksiEdit(item)}
                          className="mt-4 w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="2.5"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            ></path>
                          </svg>
                          Edit & Perbaiki Data
                        </button>
                      </div>
                    ))}
                  </div>
                ))}

              {/* TAB: VERIFIKASI PEMILIH BARU (baru) */}
              {tabBermasalah === 'PemilihBaru' &&
                (loadingPemilihBaruList ? (
                  <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-500"></div>
                  </div>
                ) : dataPemilihBaru.length === 0 ? (
                  <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
                    Tidak ada pemilih baru yang menunggu verifikasi.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap justify-between items-center gap-3 bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-xl text-sm font-bold shadow-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={
                            dataPemilihBaru.filter(bisaDisetujuiMassal).length > 0 &&
                            dataPemilihBaru
                              .filter(bisaDisetujuiMassal)
                              .every((item) => selectedPemilihBaru.includes(item.id))
                          }
                          onChange={toggleSelectAllPemilihBaru}
                          className="w-4 h-4 cursor-pointer"
                        />
                        Pilih Semua yang NIK-nya sudah lengkap
                        {selectedPemilihBaru.length > 0 &&
                          ` · ${selectedPemilihBaru.length} dipilih`}
                      </label>
                      <button
                        onClick={setujuiPemilihBaruMassal}
                        disabled={
                          loadingSetujuiMassal || selectedPemilihBaru.length === 0
                        }
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        {loadingSetujuiMassal
                          ? 'Memproses...'
                          : `✓ Setujui Terpilih (${selectedPemilihBaru.length})`}
                      </button>
                    </div>

                    {dataPemilihBaru.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white p-6 rounded-2xl border-l-4 border-indigo-500 border shadow-sm"
                      >
                        {bisaDisetujuiMassal(item) && (
                          <label className="flex items-center gap-2 mb-3 cursor-pointer w-fit">
                            <input
                              type="checkbox"
                              checked={selectedPemilihBaru.includes(item.id)}
                              onChange={() => toggleSelectPemilihBaru(item.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                              Pilih untuk approve massal
                            </span>
                          </label>
                        )}
                        {(!item.NIK || item.NIK.startsWith('SEMENTARA')) && (
                          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-2">
                            ⚠️ Perlu Penambahan NIK — petugas belum mengisi e-KTP asli
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-black text-lg uppercase">
                              {item.NAMA}
                            </h3>
                            <p className="text-xs font-bold text-slate-500">
                              NIK:{' '}
                              {item.NIK?.startsWith('SEMENTARA') ? (
                                <span className="text-red-500">
                                  Belum ada e-KTP
                                </span>
                              ) : (
                                item.NIK
                              )}
                            </p>
                            <p className="text-xs font-bold text-slate-500">
                              {item.ALAMAT}, Dusun {item.DUSUN}, RT {item.RT}/RW{' '}
                              {item.RW} · TPS {item.TPS}
                            </p>
                            <p className="text-xs font-bold text-slate-500 mt-1">
                              NKK: {item.NKK || '-'} · Tgl Lahir:{' '}
                              {item.TANGGAL_LAHIR
                                ? new Date(item.TANGGAL_LAHIR).toLocaleDateString('id-ID')
                                : '-'}
                              {hitungUmurHariH(item.TANGGAL_LAHIR) !== null &&
                                ` (${hitungUmurHariH(item.TANGGAL_LAHIR)} tahun)`}{' '}
                              · {item.KELAMIN === 'P'
                                ? 'Perempuan'
                                : item.KELAMIN === 'L'
                                ? 'Laki-laki'
                                : '-'}
                            </p>
                          </div>
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase whitespace-nowrap">
                            Perlu Verifikasi
                          </span>
                        </div>

                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
                          <p className="text-[10px] font-bold text-indigo-600 uppercase mb-1">
                            Catatan Petugas:
                          </p>
                          <p className="text-sm font-bold text-slate-800 italic">
                            "{item.keterangan_koreksi}"
                          </p>
                        </div>

                          <div className="flex gap-3">
                          <button
                            onClick={() => bukaEditPemilihBaru(item)}
                            className="px-6 py-3 bg-slate-50 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-colors border border-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => approvePemilihBaru(item)}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-all"
                          >
                            ✓ Setujui & Masukkan DPS
                          </button>
                          <button
                            onClick={() => tolakPemilihBaru(item)}
                            className="px-6 py-3 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold text-sm rounded-xl transition-colors border border-red-100"
                          >
                            Tolak
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}

          {/* ====== */}
          {/* DPS */}
          {/* ====== */}

          {activeMenu === 'DPS' && (
            <div className="max-w-6xl mx-auto pb-10">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Daftar Pemilih Sementara (DPS)
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  Warga yang sudah dicoklit dan valid, siap dikirim ke DPT.
                </p>
              </div>

              {/* FILTER RT/RW */}
              <div className="flex flex-wrap gap-3 mb-4">
                <select
                  value={filterRT_DPS}
                  onChange={(e) => setFilterRT_DPS(e.target.value)}
                  className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Semua">Semua RT</option>
                  {DAFTAR_RT.map((rt) => (
                    <option key={rt} value={rt}>
                      RT {rt}
                    </option>
                  ))}
                </select>

                <select
                  value={filterRW_DPS}
                  onChange={(e) => setFilterRW_DPS(e.target.value)}
                  className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Semua">Semua RW</option>
                  {DAFTAR_RW.map((rw) => (
                    <option key={rw} value={rw}>
                      RW {rw}
                    </option>
                  ))}
                </select>

                {(filterRT_DPS !== 'Semua' || filterRW_DPS !== 'Semua') && (
                  <button
                    onClick={() => {
                      setFilterRT_DPS('Semua');
                      setFilterRW_DPS('Semua');
                    }}
                    className="px-4 py-3 text-xs font-black text-slate-400 hover:text-slate-600"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* INFO & AKSI */}
              <div className="flex flex-wrap justify-between items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-6 text-sm font-bold shadow-sm">
                <span>
                  Menampilkan {dataDPSFiltered.length} dari {dataDPS.length}{' '}
                  total DPS
                  {selectedDPS.length > 0 && ` · ${selectedDPS.length} dipilih`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={exportDPSToCSV}
                    className="px-4 py-2 bg-white border-2 border-emerald-300 text-emerald-700 rounded-lg text-xs font-black hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      ></path>
                    </svg>
                    Export CSV
                    {selectedDPS.length > 0 ? ` (${selectedDPS.length})` : ''}
                  </button>
                  <button
                    onClick={kirimKeDPT}
                    disabled={loadingKirimDPT || dataDPSFiltered.length === 0}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                      ></path>
                    </svg>
                    {loadingKirimDPT
                      ? 'Mengirim...'
                      : `Kirim ke DPT${
                          selectedDPS.length > 0
                            ? ` (${selectedDPS.length})`
                            : ' (Semua)'
                        }`}
                  </button>
                </div>
              </div>

              {loadingDPS ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-600"></div>
                </div>
              ) : dataDPSFiltered.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
                  Belum ada data DPS untuk filter ini.
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="p-4 w-10">
                          <input
                            type="checkbox"
                            checked={
                              selectedDPS.length === dataDPSFiltered.length &&
                              dataDPSFiltered.length > 0
                            }
                            onChange={toggleSelectAllDPS}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Nama
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          NIK
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Tanggal Lahir
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Umur Hari H
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          RT/RW
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Disabilitas
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataDPSFiltered.map((item) => (
                        <tr
                          key={item.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${
                            selectedDPS.includes(item.id)
                              ? 'bg-emerald-50/50'
                              : ''
                          }`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedDPS.includes(item.id)}
                              onChange={() => toggleSelectDPS(item.id)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 font-bold uppercase">
                            {item.NAMA}
                          </td>
                          <td className="p-4 font-mono">{item.NIK}</td>
                          <td className="p-4 text-xs">
                            {item.TANGGAL_LAHIR
                              ? new Date(item.TANGGAL_LAHIR).toLocaleDateString('id-ID')
                              : '-'}
                          </td>
                          <td className="p-4 text-xs font-bold">
                            {hitungUmurHariH(item.TANGGAL_LAHIR) !== null
                              ? `${hitungUmurHariH(item.TANGGAL_LAHIR)} tahun`
                              : '-'}
                          </td>
                          <td className="p-4">
                            {item.RT || '001'}/{item.RW || '001'}
                          </td>
                          <td className="p-4">
                            {item.ragam_disabilitas ? (
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-black uppercase">
                                {item.ragam_disabilitas}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-black uppercase">
                              {item.status_coklit}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'DPT' && (
            <div className="max-w-6xl mx-auto pb-10">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Daftar Pemilih Tetap (DPT)
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  Data final yang sudah dikirim dan ditetapkan sebagai DPT.
                </p>
              </div>

              {/* SEARCH & FILTER */}
              <div className="flex flex-wrap gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Cari Nama atau NIK..."
                  value={searchDPT}
                  onChange={(e) => setSearchDPT(e.target.value)}
                  className="flex-1 min-w-[200px] p-3 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-indigo-500 outline-none shadow-sm"
                />
                <select
                  value={filterRT_DPT}
                  onChange={(e) => setFilterRT_DPT(e.target.value)}
                  className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Semua">Semua RT</option>
                  {DAFTAR_RT.map((rt) => (
                    <option key={rt} value={rt}>
                      RT {rt}
                    </option>
                  ))}
                </select>
                <select
                  value={filterRW_DPT}
                  onChange={(e) => setFilterRW_DPT(e.target.value)}
                  className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Semua">Semua RW</option>
                  {DAFTAR_RW.map((rw) => (
                    <option key={rw} value={rw}>
                      RW {rw}
                    </option>
                  ))}
                </select>
              </div>

              {/* INFO & EXPORT */}
              <div className="flex flex-wrap justify-between items-center gap-3 bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-xl mb-6 text-sm font-bold shadow-sm">
                <span>Total DPT: {dataDPT.length} pemilih</span>
                <button
                  onClick={exportDPTToCSV}
                  className="px-4 py-2 bg-white border-2 border-indigo-300 text-indigo-700 rounded-lg text-xs font-black hover:bg-indigo-100 transition-all flex items-center gap-1.5"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    ></path>
                  </svg>
                  Export CSV
                </button>
              </div>

              {loadingDPT ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
                </div>
              ) : dataDPT.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
                  Belum ada data DPT.
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Nama
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          NIK
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Tgl Lahir
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Umur Hari H
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          TPS
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          RT/RW
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Disabilitas
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Tgl Masuk DPT
                        </th>
                        <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataDPT.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="p-4 font-bold uppercase">
                            {item.NAMA}
                          </td>
                          <td className="p-4 font-mono">{item.NIK}</td>
                          <td className="p-4 text-xs">
                            {item.TANGGAL_LAHIR
                              ? new Date(item.TANGGAL_LAHIR).toLocaleDateString('id-ID')
                              : '-'}
                          </td>
                          <td className="p-4 text-xs font-bold">
                            {hitungUmurHariH(item.TANGGAL_LAHIR) !== null
                              ? `${hitungUmurHariH(item.TANGGAL_LAHIR)} tahun`
                              : '-'}
                          </td>
                          <td className="p-4">{item.TPS || '01'}</td>
                          <td className="p-4">
                            {item.RT || '001'}/{item.RW || '001'}
                          </td>
                          <td className="p-4">
                            {item.ragam_disabilitas ? (
                              <span className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-black uppercase">
                                {item.ragam_disabilitas}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4 text-xs text-slate-500">
                            {item.tanggal_masuk_dpt
                              ? new Date(
                                  item.tanggal_masuk_dpt
                                ).toLocaleDateString('id-ID')
                              : '-'}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => batalkanDariDPT(item)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold text-xs rounded-lg transition-colors border border-red-100"
                            >
                              Batalkan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

{activeMenu === 'Daftar Pemilih' && (
  <div className="max-w-7xl mx-auto pb-10">
    <div className="mb-6">
      <h2 className="text-2xl font-black text-slate-900">
        Daftar Pemilih
      </h2>
      <p className="text-sm text-slate-500 font-bold mt-1">
        Data murni langsung dari database kependudukan — otomatis
        mengikuti hasil coklit terbaru.
      </p>
    </div>

    {/* SEARCH & FILTER */}
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="text"
        placeholder="Cari Nama, NIK, atau NKK..."
        value={searchDaftarPemilih}
        onChange={(e) => setSearchDaftarPemilih(e.target.value)}
        className="flex-1 min-w-[220px] p-3 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-emerald-500 outline-none shadow-sm"
      />
      <select
        value={filterRT_DaftarPemilih}
        onChange={(e) => setFilterRT_DaftarPemilih(e.target.value)}
        className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
      >
        <option value="Semua">Semua RT</option>
        {DAFTAR_RT.map((rt) => (
          <option key={rt} value={rt}>
            RT {rt}
          </option>
        ))}
      </select>
      <select
        value={filterRW_DaftarPemilih}
        onChange={(e) => setFilterRW_DaftarPemilih(e.target.value)}
        className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
      >
        <option value="Semua">Semua RW</option>
        {DAFTAR_RW.map((rw) => (
          <option key={rw} value={rw}>
            RW {rw}
          </option>
        ))}
      </select>
      <select
        value={filterStatusDaftarPemilih}
        onChange={(e) => setFilterStatusDaftarPemilih(e.target.value)}
        className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
      >
        <option value="Semua">Semua Status</option>
        <option value="Belum Coklit">Belum Coklit</option>
        <option value="Ditemui">Ditemui</option>
        <option value="Tidak di Rumah">Tidak di Rumah</option>
        <option value="Pindah">Pindah</option>
        <option value="Meninggal">Meninggal</option>
        <option value="Tidak Dikenal">Tidak Dikenal</option>
        <option value="Perlu Koreksi">Perlu Koreksi</option>
        <option value="Pemilih Baru - Perlu Verifikasi">
          Pemilih Baru
        </option>
      </select>
    </div>

    <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-100 border border-slate-200 text-slate-600 p-4 rounded-xl mb-6 text-sm font-bold shadow-sm">
      <span>
        Menampilkan {dataDaftarPemilih.length} dari {totalDaftarPemilih}{' '}
        total data warga
      </span>
    </div>

    {loadingDaftarPemilih ? (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-600"></div>
      </div>
    ) : dataDaftarPemilih.length === 0 ? (
      <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
        Tidak ada data yang cocok dengan pencarian/filter.
      </div>
    ) : (
      <>
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Nama</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">NIK</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">NKK</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Tgl Lahir</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Umur Hari H</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Tempat Lahir</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">P/L</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Disabilitas</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Alamat</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Dusun</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">RT/RW</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">TPS</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">MS/TMS</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Status DPT</th>
                <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dataDaftarPemilih.map((item) => {
                const tms = isTMS(item);
                const umur = hitungUmurHariH(item.TANGGAL_LAHIR);
                const isGanda = dataGandaIds.has(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`border-b border-slate-100 hover:bg-slate-50 ${
                      isGanda ? 'bg-red-50/60' : ''
                    }`}
                  >
                    <td className="p-4 font-bold uppercase">
                      <div className="flex items-center gap-2">
                        {item.NAMA}
                        {isGanda && (
                          <span
                            title="Terdeteksi kemungkinan data ganda (NIK sama, atau Nama+Tgl Lahir+RT/RW sama)"
                            className="px-1.5 py-0.5 bg-red-500 text-white rounded text-[9px] font-black uppercase whitespace-nowrap"
                          >
                            Ganda
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono">{item.NIK}</td>
                    <td className="p-4 font-mono">{item.NKK || '-'}</td>
                    <td className="p-4 text-xs">
                      {item.TANGGAL_LAHIR
                        ? new Date(item.TANGGAL_LAHIR).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className="p-4 text-xs font-bold">
                      {umur !== null ? `${umur} tahun` : '-'}
                    </td>
                    <td className="p-4 text-xs">{item.TEMPAT_LAHIR || '-'}</td>
                    <td className="p-4">{item.KELAMIN || '-'}</td>
                    <td className="p-4">
                      {item.ragam_disabilitas ? (
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded text-[10px] font-black uppercase">
                          {item.ragam_disabilitas}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4 uppercase text-xs">{item.ALAMAT || '-'}</td>
                    <td className="p-4">{item.DUSUN || '-'}</td>
                    <td className="p-4">
                      {item.RT || '001'}/{item.RW || '001'}
                    </td>
                    <td className="p-4">{item.TPS || '-'}</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                          tms
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {tms ? `TMS (${item.status_coklit})` : 'MS'}
                      </span>
                    </td>
                    <td className="p-4">
                      {item.status_dpt ? (
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-black uppercase">
                          DPT
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => bukaEditDaftarPemilih(item)}
                          className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg transition-colors border border-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => approveDPTDariDaftarPemilih(item)}
                          disabled={tms || item.status_dpt === 'DPT'}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 font-bold text-[10px] rounded-lg transition-colors border border-emerald-100 disabled:opacity-40"
                        >
                          Approve DPT
                        </button>
                        {tms ? (
                        <button
                          onClick={() => kembalikanKeMS(item)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-700 font-bold text-[10px] rounded-lg transition-colors border border-emerald-100"
                        >
                          Ubah ke MS
                        </button>
                      ) : (
                        <button
                          onClick={() => bukaModalUbahTMS(item)}
                          className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-500 hover:text-white text-orange-700 font-bold text-[10px] rounded-lg transition-colors border border-orange-100"
                        >
                          Ubah TMS
                        </button>
                      )}
                        <button
                          onClick={() => hapusDaftarPemilih(item)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold text-[10px] rounded-lg transition-colors border border-red-100"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINASI */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setHalamanDaftarPemilih((p) => Math.max(1, p - 1))}
            disabled={halamanDaftarPemilih === 1}
            className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-slate-600 disabled:opacity-40"
          >
            ← Sebelumnya
          </button>
          <span className="text-xs font-bold text-slate-500">
            Halaman {halamanDaftarPemilih} dari{' '}
            {Math.max(
              1,
              Math.ceil(totalDaftarPemilih / UKURAN_HALAMAN_DAFTAR_PEMILIH)
            )}
          </span>
          <button
            onClick={() => setHalamanDaftarPemilih((p) => p + 1)}
            disabled={
              halamanDaftarPemilih * UKURAN_HALAMAN_DAFTAR_PEMILIH >=
              totalDaftarPemilih
            }
            className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-xs font-black text-slate-600 disabled:opacity-40"
          >
            Berikutnya →
          </button>
        </div>
      </>
    )}
  </div>
)}

{activeMenu === 'TMS' && (
  <div className="max-w-6xl mx-auto pb-10">
    <div className="mb-6">
      <h2 className="text-2xl font-black text-slate-900">
        TMS (Tidak Memenuhi Syarat)
      </h2>
      <p className="text-sm text-slate-500 font-bold mt-1">
        Rekap warga yang dinyatakan Pindah, Meninggal, atau Tidak Dikenal
        saat coklit — otomatis mengikuti hasil terbaru dari lapangan.
      </p>
    </div>

    {/* SEARCH & FILTER */}
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="text"
        placeholder="Cari Nama atau NIK..."
        value={searchTMS}
        onChange={(e) => setSearchTMS(e.target.value)}
        className="flex-1 min-w-[200px] p-3 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-red-500 outline-none shadow-sm"
      />

      {/* FILTER RT/RW HANYA MUNCUL UNTUK ADMIN, PETUGAS COKLIT SUDAH OTOMATIS TERKUNCI */}
      {user?.role !== 'Petugas Coklit' && (
        <>
          <select
            value={filterRT_TMS}
            onChange={(e) => setFilterRT_TMS(e.target.value)}
            className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="Semua">Semua RT</option>
            {DAFTAR_RT.map((rt) => (
              <option key={rt} value={rt}>
                RT {rt}
              </option>
            ))}
          </select>
          <select
            value={filterRW_TMS}
            onChange={(e) => setFilterRW_TMS(e.target.value)}
            className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-red-500 cursor-pointer"
          >
            <option value="Semua">Semua RW</option>
            {DAFTAR_RW.map((rw) => (
              <option key={rw} value={rw}>
                RW {rw}
              </option>
            ))}
          </select>
        </>
      )}

      <select
        value={filterStatusTMS}
        onChange={(e) => setFilterStatusTMS(e.target.value)}
        className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-red-500 cursor-pointer"
      >
        <option value="Semua">Semua Status TMS</option>
        <option value="Pindah">Pindah</option>
        <option value="Meninggal">Meninggal</option>
        <option value="Tidak Dikenal">Tidak Dikenal</option>
      </select>
    </div>

    {/* INFO & EXPORT */}
    <div className="flex flex-wrap justify-between items-center gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm font-bold shadow-sm">
      <span>Total TMS: {dataTMS.length} warga</span>
      <button
        onClick={exportTMSToCSV}
        className="px-4 py-2 bg-white border-2 border-red-300 text-red-700 rounded-lg text-xs font-black hover:bg-red-100 transition-all flex items-center gap-1.5"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          ></path>
        </svg>
        Export CSV
      </button>
    </div>

    {loadingTMS ? (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-red-500"></div>
      </div>
    ) : dataTMS.length === 0 ? (
      <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
        Belum ada data TMS untuk filter ini.
      </div>
    ) : (
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                Nama
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                NIK
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                RT/RW
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                Status TMS
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {dataTMS.map((item) => (
              <tr
                key={item.id}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="p-4 font-bold uppercase">{item.NAMA}</td>
                <td className="p-4 font-mono">{item.NIK}</td>
                <td className="p-4">
                  {item.RT || '001'}/{item.RW || '001'}
                </td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] font-black uppercase">
                    {item.status_coklit}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => batalkanTMS(item)}
                    disabled={loadingBatalkanTMS === item.id}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-red-500 hover:text-white text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200 disabled:opacity-50"
                  >
                    {loadingBatalkanTMS === item.id
                      ? 'Membatalkan...'
                      : 'Batalkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

{activeMenu === 'DPT/Tambahan' && (
  <div className="max-w-7xl mx-auto pb-10">
    <div className="mb-6">
      <h2 className="text-2xl font-black text-slate-900">
        DPT/Tambahan
      </h2>
      <p className="text-sm text-slate-500 font-bold mt-1">
        Rekap seluruh pemilih hasil temuan lapangan petugas coklit (bukan dari
        data kependudukan awal) — untuk memantau siapa saja yang ditambahkan,
        alasannya, dan status terkini masing-masing.
      </p>
    </div>

    {/* SEARCH & FILTER */}
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="text"
        placeholder="Cari Nama atau NIK..."
        value={searchDPTTambahan}
        onChange={(e) => setSearchDPTTambahan(e.target.value)}
        className="flex-1 min-w-[220px] p-3 border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-indigo-500 outline-none shadow-sm"
      />
      <select
        value={filterAlasanDPTTambahan}
        onChange={(e) => setFilterAlasanDPTTambahan(e.target.value)}
        className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
      >
        <option value="Semua">Semua Alasan</option>
        {DAFTAR_ALASAN_TAMBAHAN.map((alasan) => (
          <option key={alasan} value={alasan}>
            {alasan}
          </option>
        ))}
      </select>
      <select
        value={filterStatusDPTTambahan}
        onChange={(e) => setFilterStatusDPTTambahan(e.target.value)}
        className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
      >
        <option value="Semua">Semua Status</option>
        <option value="Menunggu Verifikasi">Menunggu Verifikasi</option>
        <option value="Disetujui, Menunggu Validasi Admin">
          Disetujui, Menunggu Validasi Admin
        </option>
        <option value="Divalidasi, Menunggu Kirim DPT">
          Divalidasi, Menunggu Kirim DPT
        </option>
        <option value="Sudah di DPT">Sudah di DPT</option>
        <option value="Perlu Koreksi">Perlu Koreksi</option>
      </select>

      {/* FILTER RT/RW HANYA MUNCUL UNTUK SUPER ADMIN, SELAIN ITU OTOMATIS TERKUNCI */}
      {user?.role === 'Super Admin' && (
        <>
          <select
            value={filterRT_DPTTambahan}
            onChange={(e) => setFilterRT_DPTTambahan(e.target.value)}
            className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="Semua">Semua RT</option>
            {DAFTAR_RT.map((rt) => (
              <option key={rt} value={rt}>
                RT {rt}
              </option>
            ))}
          </select>
          <select
            value={filterRW_DPTTambahan}
            onChange={(e) => setFilterRW_DPTTambahan(e.target.value)}
            className="p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="Semua">Semua RW</option>
            {DAFTAR_RW.map((rw) => (
              <option key={rw} value={rw}>
                RW {rw}
              </option>
            ))}
          </select>
        </>
      )}
    </div>

    {/* INFO & EXPORT */}
    <div className="flex flex-wrap justify-between items-center gap-3 bg-indigo-50 border border-indigo-200 text-indigo-700 p-4 rounded-xl mb-6 text-sm font-bold shadow-sm">
      <span>Total Tambahan dari Lapangan: {dataDPTTambahan.length} orang</span>
      <button
        onClick={exportDPTTambahanToCSV}
        className="px-4 py-2 bg-white border-2 border-indigo-300 text-indigo-700 rounded-lg text-xs font-black hover:bg-indigo-100 transition-all flex items-center gap-1.5"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          ></path>
        </svg>
        Export CSV
      </button>
    </div>

    {loadingDPTTambahan ? (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-indigo-600"></div>
      </div>
    ) : dataDPTTambahan.length === 0 ? (
      <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
        Belum ada pemilih tambahan dari hasil temuan lapangan untuk filter ini.
      </div>
    ) : (
      <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                Nama
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                NIK
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                RT/RW
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                TPS
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                Alasan Tambahan
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                Ditambahkan Oleh
              </th>
              <th className="text-left p-4 font-black text-slate-600 uppercase text-xs">
                Status Terkini
              </th>
            </tr>
          </thead>
          <tbody>
            {dataDPTTambahan.map((item) => {
              const status = hitungStatusTerkini(item);
              const warnaKelas: Record<string, string> = {
                indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                red: 'bg-red-50 text-red-700 border-red-100',
                orange: 'bg-orange-50 text-orange-700 border-orange-100',
                emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                teal: 'bg-teal-50 text-teal-700 border-teal-100',
                slate: 'bg-slate-100 text-slate-600 border-slate-200',
              };

              return (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="p-4 font-bold uppercase">{item.NAMA}</td>
                  <td className="p-4 font-mono">
                    {item.NIK?.startsWith('SEMENTARA') ? (
                      <span className="text-red-500 text-xs font-bold">
                        Belum ada e-KTP
                      </span>
                    ) : (
                      item.NIK
                    )}
                  </td>
                  <td className="p-4">
                    {item.RT || '001'}/{item.RW || '001'}
                  </td>
                  <td className="p-4">{item.TPS || '-'}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded text-[10px] font-black uppercase">
                      {parseAlasanTambahan(item.keterangan_koreksi)}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    <div className="font-bold text-slate-700">
                      {parseDitambahkanOleh(item.keterangan_koreksi)}
                    </div>
                    <div>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString(
                            'id-ID',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )
                        : '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border ${
                        warnaKelas[status.warna]
                      }`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}

{activeMenu === 'Aktivitas Login' && (
  <div className="max-w-4xl mx-auto pb-10">
    <div className="mb-6">
      <h2 className="text-2xl font-black text-slate-900">
        Aktivitas Login
      </h2>
      <p className="text-sm text-slate-500 font-bold mt-1">
        Status login tiap akun hari ini. "Online" berarti login dalam{' '}
        {BATAS_ONLINE_MENIT} menit terakhir, "Multi-Device" berarti login
        dari 2 atau lebih perangkat berbeda hari ini.
      </p>
    </div>

    {loadingStatusLogin ? (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-600"></div>
      </div>
    ) : dataStatusLogin.length === 0 ? (
      <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
        Belum ada data akun.
      </div>
    ) : (
      <div className="space-y-3">
        {dataStatusLogin.map((akun) => {
          const gaya: Record<string, { badge: string; dot: string }> = {
            Online: {
              badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              dot: 'bg-emerald-500',
            },
            Offline: {
              badge: 'bg-slate-100 text-slate-500 border-slate-200',
              dot: 'bg-slate-400',
            },
            'Multi-Device': {
              badge: 'bg-red-50 text-red-700 border-red-200',
              dot: 'bg-red-500 animate-pulse',
            },
          };
          const g = gaya[akun.status];

          return (
            <div
              key={akun.id}
              className={`bg-white p-4 md:p-5 rounded-2xl border shadow-sm flex flex-wrap items-center justify-between gap-3 ${
                akun.status === 'Multi-Device'
                  ? 'border-red-200'
                  : 'border-slate-200'
              }`}
            >
              <div>
                <p className="font-black text-slate-800">
                  {akun.nama_lengkap}
                </p>
                <p className="text-xs font-bold text-slate-400">
                  @{akun.username} · {akun.role}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Login Terakhir
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    {akun.loginTerakhir
                      ? new Date(akun.loginTerakhir).toLocaleTimeString(
                          'id-ID',
                          { hour: '2-digit', minute: '2-digit' }
                        )
                      : 'Belum login hari ini'}
                  </p>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border flex items-center gap-1.5 whitespace-nowrap ${g.badge}`}
                >
                  <span className={`w-2 h-2 rounded-full ${g.dot}`}></span>
                  {akun.status}
                  {akun.status === 'Multi-Device' &&
                    ` (${akun.jumlahDeviceHariIni} device)`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

{activeMenu === 'Tahapan Pilkades' && (
  <div className="max-w-5xl mx-auto pb-10">
    <div className="mb-6">
      <h2 className="text-2xl font-black text-slate-900">
        Tahapan Pilkades Serentak
      </h2>
      <p className="text-sm text-slate-500 font-bold mt-1">
        Jadwal Perubahan Tahapan Pemilihan Kepala Desa Serentak Masa Bakti 2026-2034.
      </p>
    </div>

    {/* KARTU TAHAP AKTIF SEKARANG */}
    {(() => {
      const tahapBerlangsung = DATA_TAHAPAN_PILKADES.find(
        (i) => i.tipe === 'item' && getStatusTahapan(i, waktuSekarang) === 'berlangsung'
      );
      const tahapBerikutnya = DATA_TAHAPAN_PILKADES.find(
        (i) => i.tipe === 'item' && getStatusTahapan(i, waktuSekarang) === 'akan_datang'
      );

      if (tahapBerlangsung) {
        return (
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 mb-8 shadow-lg text-white">
            <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Sedang Berlangsung
            </p>
            <p className="text-xl md:text-2xl font-black leading-snug">
              {tahapBerlangsung.teks}
            </p>
            <p className="text-sm font-bold text-white/80 mt-2">
              {formatRentangTanggal (tahapBerlangsung.mulai!, tahapBerlangsung.selesai!)} ·{' '}
              {tahapBerlangsung.keterangan}
            </p>
          </div>
        );
      }
      if (tahapBerikutnya) {
        return (
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
              Tahap Berikutnya
            </p>
            <p className="text-xl font-black text-slate-800 leading-snug">
              {tahapBerikutnya.teks}
            </p>
            <p className="text-sm font-bold text-slate-500 mt-2">
              {formatRentangTanggal(tahapBerikutnya.mulai!, tahapBerikutnya.selesai!)} ·{' '}
              {tahapBerikutnya.keterangan}
            </p>
          </div>
        );
      }
      return (
        <div className="bg-slate-100 rounded-2xl p-6 mb-8 text-center font-bold text-slate-500">
          Seluruh tahapan Pilkades sudah selesai.
        </div>
      );
    })()}

    {/* TIMELINE SELURUH TAHAPAN */}
    <div className="space-y-3">
      {DATA_TAHAPAN_PILKADES.map((item) => {
        if (item.tipe === 'kategori') {
          const warnaKategori: Record<string, string> = {
            A: 'bg-slate-800',
            B: 'bg-indigo-600',
            C: 'bg-orange-500',
            D: 'bg-emerald-600',
          };
          return (
            <div
              key={`kat-${item.kode}`}
              className={`${warnaKategori[item.kode!]} text-white px-5 py-3 rounded-xl font-black text-sm uppercase tracking-widest mt-6 first:mt-0 shadow-sm`}
            >
              {item.kode}. {item.label}
            </div>
          );
        }

        const status = getStatusTahapan(item, waktuSekarang);
        const gaya: Record<string, { border: string; badge: string; teks: string }> = {
          selesai: {
            border: 'border-slate-200',
            badge: 'bg-slate-100 text-slate-400 border-slate-200',
            teks: 'text-slate-400',
          },
          berlangsung: {
            border: 'border-emerald-400 ring-2 ring-emerald-100',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            teks: 'text-slate-800',
          },
          akan_datang: {
            border: 'border-slate-200',
            badge: 'bg-white text-slate-500 border-slate-200',
            teks: 'text-slate-700',
          },
        };
        const g = gaya[status];

        return (
          <div
            key={item.no}
            className={`bg-white rounded-2xl border-2 ${g.border} shadow-sm p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5`}
          >
            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2 shrink-0 ${
                  status === 'selesai'
                    ? 'bg-slate-100 border-slate-200 text-slate-400'
                    : status === 'berlangsung'
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                {status === 'selesai' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : (
                  item.no
                )}
              </span>
            </div>
            <div className="flex-1">
              <p className={`font-black text-sm md:text-base ${g.teks}`}>{item.teks}</p>
              <p className="text-xs font-bold text-slate-400 mt-1">
                {formatRentangTanggal(item.mulai!, item.selesai!)} · {item.keterangan}
              </p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${g.badge}`}
            >
              {status === 'selesai'
                ? 'Selesai'
                : status === 'berlangsung'
                ? '● Berlangsung'
                : 'Akan Datang'}
            </span>
          </div>
        );
      })}
    </div>
  </div>
)}

          {/* ======================================================== */}
          {/* KONTEN MENU LAINNYA (DASHBOARD & PENGATURAN TETAP) */}
          {/* ======================================================== */}
          {activeMenu === 'Dashboard' && (
            <div className="max-w-6xl mx-auto">
              {(() => {
  const cd = hitungCountdown(waktuSekarang);
  if (!cd) return null;

  const warnaKelas: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    indigo: 'from-indigo-500 to-indigo-700',
    red: 'from-red-500 to-red-700',
  };

  return (
    <div
      className={`bg-gradient-to-br ${warnaKelas[cd.warna]} rounded-2xl p-6 md:p-8 mb-8 shadow-lg text-white`}
    >
      {/* SAPAAN */}
      <p className="text-sm md:text-base font-black text-white mb-3">
        Halo, {user.role}! 👋
      </p>

      <p className="text-xs font-black uppercase tracking-widest text-white/70 mb-1">
        {cd.label}
      </p>
      <p className="text-sm font-bold text-white/90 mb-5">
        Target:{' '}
        {cd.target.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      {/* GRID COUNTDOWN — sekarang full width, gak dibatasi max-w-lg */}
      <div className="grid grid-cols-4 gap-3 md:gap-5 w-full">
        {[
          { label: 'Hari', nilai: cd.hari },
          { label: 'Jam', nilai: cd.jam },
          { label: 'Menit', nilai: cd.menit },
          { label: 'Detik', nilai: cd.detik },
        ].map((box) => (
          <div
            key={box.label}
            className="bg-white/15 backdrop-blur-sm rounded-xl p-3 md:p-5 text-center flex flex-col items-center gap-2"
          >
            {/* KOTAK KECIL KHUSUS ANGKA, DI DALAM KOTAK BESAR */}
            <div className="bg-white/15 rounded-lg w-full py-2 md:py-3">
              <p className="text-3xl md:text-5xl font-black tabular-nums">
                {String(box.nilai).padStart(2, '0')}
              </p>
            </div>
            <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/70">
              {box.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
})()}

              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-900">
                  Ringkasan Progres Coklit
                </h2>
                <p className="text-sm text-slate-500 font-bold mt-1">
                  Pantau total pergerakan data secara real-time.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800"></div>
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Jumlah Pemilih
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-slate-800">
                    {stats.total}
                  </span>
                </div>
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                  <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider mb-2 z-10">
                    Selesai Dicoklit
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-emerald-700 z-10">
                    {stats.sudah}
                  </span>
                </div>
                <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-400"></div>
                  <span className="text-xs font-extrabold text-yellow-600 uppercase tracking-wider mb-2 z-10">
                    Sisa Belum
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-yellow-700 z-10">
                    {stats.belum}
                  </span>
                </div>
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                  <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider mb-2 z-10">
                    Laki-laki
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-blue-700 z-10">
                    {stats.lakiLaki}
                  </span>
                </div>
                <div className="bg-pink-50 p-6 rounded-2xl border border-pink-200 shadow-sm flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500"></div>
                  <span className="text-xs font-extrabold text-pink-600 uppercase tracking-wider mb-2 z-10">
                    Perempuan
                  </span>
                  <span className="text-4xl sm:text-5xl font-black text-pink-700 z-10">
                    {stats.perempuan}
                  </span>
                </div>
              </div>
              <div className="mt-8">
      <div className="mb-4">
        <h3 className="text-lg font-black text-slate-900">
          Progres per RT/RW
        </h3>
        <p className="text-xs text-slate-500 font-bold">
          Diurutkan dari yang paling perlu perhatian
        </p>
      </div>

{/* RANKING PETUGAS */}
<div className="mt-8">
  <div className="mb-4">
    <h3 className="text-lg font-black text-slate-900">
      Ranking Petugas
    </h3>
    <p className="text-xs text-slate-500 font-bold">
      Berdasarkan persentase progres coklit wilayah masing-masing
    </p>
  </div>

  {(() => {
    const petugasList = progresPerWilayah.filter((w) => w.namaPetugas);
    if (petugasList.length === 0) {
      return (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
          Belum ada petugas dengan data progres.
        </div>
      );
    }

    const top3 = [...petugasList].sort((a, b) => b.persen - a.persen).slice(0, 3);
    const bottom3 = [...petugasList].sort((a, b) => a.persen - b.persen).slice(0, 3);

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TOP PERFORMER */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm">
          <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            🏆 Paling Produktif
          </p>
          <div className="space-y-3">
            {top3.map((p, idx) => (
              <div key={`top-${p.rt}-${p.rw}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {p.namaPetugas}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      RT {p.rt}/RW {p.rw}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-600">
                  {p.persen}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM PERFORMER */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm">
          <p className="text-xs font-black text-red-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            ⚠️ Perlu Perhatian
          </p>
          <div className="space-y-3">
            {bottom3.map((p, idx) => (
              <div key={`bottom-${p.rt}-${p.rw}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-800">
                      {p.namaPetugas}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      RT {p.rt}/RW {p.rw}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-black text-red-600">
                  {p.persen}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  })()}
</div>

{/* FUNNEL DATA */}
<div className="mt-8">
  <div className="mb-4">
    <h3 className="text-lg font-black text-slate-900">
      Alur Data Pemilih
    </h3>
    <p className="text-xs text-slate-500 font-bold">
      Perjalanan data dari total penduduk sampai masuk DPT
    </p>
  </div>

  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
    {[
      { label: 'Total Penduduk', nilai: dataFunnel.total, warna: 'bg-slate-700' },
      { label: 'Sudah Coklit', nilai: dataFunnel.sudahCoklit, warna: 'bg-orange-500' },
      { label: 'Divalidasi Admin', nilai: dataFunnel.divalidasiAdmin, warna: 'bg-teal-500' },
      { label: 'Masuk DPS', nilai: dataFunnel.masukDPS, warna: 'bg-indigo-500' },
      { label: 'Masuk DPT', nilai: dataFunnel.masukDPT, warna: 'bg-emerald-600' },
    ].map((tahap) => {
      const persen = dataFunnel.total > 0
        ? Math.round((tahap.nilai / dataFunnel.total) * 100)
        : 0;
      return (
        <div key={tahap.label}>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wide">
              {tahap.label}
            </span>
            <span className="text-xs font-black text-slate-500">
              {tahap.nilai} ({persen}%)
            </span>
          </div>
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${tahap.warna} transition-all rounded-full`}
              style={{ width: `${persen}%` }}
            ></div>
          </div>
        </div>
      );
    })}
  </div>
</div>

      {loadingProgresWilayah ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-600"></div>
        </div>
      ) : progresPerWilayah.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center font-bold text-slate-400">
          Belum ada data.
        </div>
      ) : (
        <div
          className={
            progresPerWilayah.length === 1
              ? 'grid grid-cols-1 gap-4'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
          }
        >
          {progresPerWilayah.map((w) => {
            const warnaBar =
              w.persen >= 80
                ? 'bg-emerald-500'
                : w.persen >= 40
                ? 'bg-yellow-400'
                : 'bg-red-500';
            const warnaTeks =
              w.persen >= 80
                ? 'text-emerald-700'
                : w.persen >= 40
                ? 'text-yellow-700'
                : 'text-red-700';

            return (
              <div
                key={`${w.rt}-${w.rw}`}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-black text-slate-800">
                      RT {w.rt} / RW {w.rw}
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      {w.namaPetugas || 'Belum ada petugas'}
                    </p>
                  </div>
                  <span className={`text-xl font-black ${warnaTeks}`}>
                    {w.persen}%
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full ${warnaBar} transition-all`}
                    style={{ width: `${w.persen}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>{w.sudah} sudah</span>
                  <span>{w.belum} belum</span>
                  <span>{w.total} total</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
            </div>
          )}
            
          {activeMenu === 'Pengaturan' && (
            <div className="max-w-6xl mx-auto">
               {user.role === 'Super Admin' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <h3 className="font-black text-slate-800 mb-1">Logo Aplikasi</h3>
            <p className="text-xs font-bold text-slate-500 mb-4">
              Logo ini akan tampil di sidebar semua petugas.
            </p>
            <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black overflow-hidden shrink-0 p-1.5">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                'K'
              )}
            </div>
              <label className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl cursor-pointer">
                {loadingLogo ? 'Mengupload...' : 'Ganti Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  className="hidden"
                  disabled={loadingLogo}
                />
              </label>
            </div>
          </div>
        )}
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Manajemen Petugas & Akses
                  </h2>
                  <p className="text-sm text-slate-500 font-bold mt-1">
                    Kelola akun dan batasi akses menu masing-masing petugas.
                  </p>
                </div>
                <button
                  onClick={tambahAkunBaru}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all flex items-center gap-2"
                >
                  Tambah Akun
                </button>
              </div>

              {loadingAkun ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-emerald-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {daftarAkun.map((akun) => (
                    <div
                      key={akun.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group overflow-hidden flex flex-col"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-black text-lg text-slate-800">
                            {akun.nama_lengkap}
                          </h3>
                          <p className="text-xs font-mono font-bold text-slate-500 mt-1">
                            @{akun.username}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              akun.role === 'Super Admin'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {akun.role}
                          </span>
                          {akun.tps_assigned && (
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                              TPS {akun.tps_assigned}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mb-5 flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">
                          Akses Menu ({akun.akses_menu?.length || 0}):
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {akun.akses_menu?.slice(0, 5).map((menu: string) => (
                            <span
                              key={menu}
                              className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[10px] font-bold"
                            >
                              {menu}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-slate-100 pt-4 mt-auto">
                        <button
                          onClick={() => setModalAkun(akun)}
                          className="flex-1 py-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-bold text-xs rounded-lg transition-colors border border-slate-200"
                        >
                          Edit Akses
                        </button>
                        <button
                          onClick={() => hapusAkun(akun.id, akun.nama_lengkap)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-bold text-xs rounded-lg transition-colors border border-red-100"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
                 
          {/* ===== PLACEHOLDER ======*/}

          {activeMenu !== 'Pengaturan' &&
            activeMenu !== 'Dashboard' &&
            activeMenu !== 'Tugas Coklit' &&
            activeMenu !== 'Coklit' &&
            activeMenu !== 'Data Bermasalah' &&
            activeMenu !== 'DPS' &&
            activeMenu !== 'DPT' &&
            activeMenu !== 'Daftar Pemilih' &&
            activeMenu !== 'TMS' &&
            activeMenu !== 'DPT/Tambahan' &&
            activeMenu !== 'Aktivitas Login' &&
            activeMenu !== 'Tahapan Pilkades' &&
            activeMenu !== '' && (
              <div className="text-center mt-20">
                <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    ></path>
                  </svg>
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                  Ruang {activeMenu}
                </h2>
                <p className="text-slate-500 mt-2 font-medium">
                  Modul {activeMenu} sedang dalam antrean konstruksi koding kita
                  selanjutnya.
                </p>
              </div>
            )}
        </div>
      </main>

      {/* ======================================================== */}
      {/* POPUP MODAL PENGATURAN AKUN */}
      {/* ======================================================== */}
      {modalAkun && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-5 flex justify-between items-center">
              <h2 className="text-lg font-black text-white">
                {modalAkun.id ? 'Edit Akun & Hak Akses' : 'Buat Akun Baru'}
              </h2>
              <button
                onClick={() => setModalAkun(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={simpanAkun}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2">
                    Informasi Petugas
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      required
                      value={modalAkun.nama_lengkap}
                      onChange={(e) =>
                        setModalAkun({
                          ...modalAkun,
                          nama_lengkap: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Username (Untuk Login)
                    </label>
                    <input
                      type="text"
                      required
                      value={modalAkun.username}
                      onChange={(e) =>
                        setModalAkun({ ...modalAkun, username: e.target.value })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Password
                    </label>
                    <input
                      type="text"
                      required
                      value={modalAkun.password}
                      onChange={(e) =>
                        setModalAkun({ ...modalAkun, password: e.target.value })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Level / Role
                    </label>
                    <select
                      value={modalAkun.role}
                      onChange={(e) =>
                        setModalAkun({ ...modalAkun, role: e.target.value })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Super Admin">Super Admin</option>
                      <option value="Admin">Admin Desa</option>
                      <option value="Petugas Coklit">Petugas Coklit</option>
                      <option value="KPPS">Petugas KPPS</option>
                    </select>
                  </div>

                  {(modalAkun.role === 'Petugas Coklit' ||
                    modalAkun.role === 'KPPS') && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-bold text-indigo-500 mb-1 uppercase tracking-wider">
                        RT
                      </label>
                      <select
                        value={modalAkun.rt_assigned || '001'}
                        onChange={(e) =>
                          setModalAkun({
                            ...modalAkun,
                            rt_assigned: e.target.value,
                          })
                        }
                        className="w-full p-3 border-2 border-indigo-200 bg-indigo-50 text-indigo-800 rounded-xl font-black text-sm outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {DAFTAR_RT.map((rt) => (
                          <option key={rt} value={rt}>
                            RT {rt}
                          </option>
                        ))}
                      </select>
                      <label className="block text-xs font-bold text-indigo-500 mb-1 uppercase tracking-wider">
                        RW
                      </label>
                      <select
                        value={modalAkun.rw_assigned || '001'}
                        onChange={(e) =>
                          setModalAkun({
                            ...modalAkun,
                            rw_assigned: e.target.value,
                          })
                        }
                        className="w-full p-3 border-2 border-indigo-200 bg-indigo-50 text-indigo-800 rounded-xl font-black text-sm outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {DAFTAR_RW.map((rw) => (
                          <option key={rw} value={rw}>
                            RW {rw}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-end border-b border-slate-200 pb-2 mb-4">
                    <h3 className="text-sm font-black text-slate-800">
                      Akses Menu
                    </h3>
                    <span className="text-xs font-bold text-orange-500">
                      {modalAkun.akses_menu?.length || 0} Terpilih
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                    {MASTER_MENU.map((menu) => {
                      const isChecked = modalAkun.akses_menu?.includes(menu);
                      return (
                        <label
                          key={menu}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isChecked
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-slate-100 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isChecked || false}
                            onChange={() => toggleMenuAkses(menu)}
                          />
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && (
                              <svg
                                className="w-3.5 h-3.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth="3"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                ></path>
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              isChecked ? 'text-emerald-800' : 'text-slate-600'
                            }`}
                          >
                            {menu}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAkun(null)}
                  className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingSimpan}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md flex items-center gap-2"
                >
                  {loadingSimpan ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* POPUP MODAL KOREKSI WARGA (BARU!) */}
      {/* ======================================================== */}
      {koreksiWarga && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-orange-500 p-5 flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  ></path>
                </svg>
                Form Koreksi Data Warga
              </h2>
              <button
                onClick={() => {
                  setKoreksiWarga(null);
                  setKeteranganKoreksi('');
                }}
                className="text-white/80 hover:text-white bg-orange-600 rounded-full p-1"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={simpanKoreksi}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {/* Data Warga Read-Only */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Data Pemilih Saat Ini
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-slate-500">
                        Nama Lengkap
                      </p>
                      <p className="font-black text-slate-800 uppercase">
                        {koreksiWarga.NAMA}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">
                        Nomor Induk Kependudukan (NIK)
                      </p>
                      <p className="font-bold text-slate-800">
                        {koreksiWarga.NIK}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">
                        Nomor Kartu Keluarga (NKK)
                      </p>
                      <p className="font-bold text-slate-800">
                        {koreksiWarga.NKK || '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-bold text-slate-500">
                        Alamat Lengkap
                      </p>
                      <p className="font-bold text-slate-800 uppercase">
                        {koreksiWarga.ALAMAT || '-'}, DUSUN{' '}
                        {koreksiWarga.DUSUN || '-'}, RT {koreksiWarga.RT || '-'}
                        /RW {koreksiWarga.RW || '-'} (TPS {koreksiWarga.TPS})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Textarea Input Alasan */}
                <div>
                  <label className="block text-sm font-black text-slate-800 mb-2">
                    Deskripsi Koreksi (Wajib Diisi)
                  </label>
                  <p className="text-xs font-bold text-slate-500 mb-2">
                    Jelaskan bagian mana yang salah dan perlu diperbaiki oleh
                    admin desa (Misal: NIK salah, Nama kurang huruf, dll).
                  </p>
                  <textarea
                    required
                    rows={4}
                    value={keteranganKoreksi}
                    onChange={(e) => setKeteranganKoreksi(e.target.value)}
                    placeholder="Tuliskan catatan perbaikan di sini..."
                    className="w-full p-4 border-2 border-slate-200 rounded-xl font-bold focus:ring-0 focus:border-orange-500 outline-none text-sm transition-all"
                  ></textarea>
                </div>
              </div>

              <div className="bg-white p-5 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setKoreksiWarga(null);
                    setKeteranganKoreksi('');
                  }}
                  className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingKoreksi || !keteranganKoreksi.trim()}
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {loadingKoreksi
                    ? 'Menyimpan...'
                    : 'Simpan & Tandai Perlu Koreksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {modalPemilihBaru && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-600 p-5 flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  ></path>
                </svg>
                Tambah Pemilih Baru (Ditemukan di Lapangan)
              </h2>
              <button
                onClick={() => setModalPemilihBaru(null)}
                className="text-white/80 hover:text-white bg-indigo-700 rounded-full p-1"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={simpanPemilihBaru}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Alasan Penambahan
                  </label>
                  <select
                    required
                    value={modalPemilihBaru.alasan_tambahan}
                    onChange={(e) =>
                      setModalPemilihBaru({
                        ...modalPemilihBaru,
                        alasan_tambahan: e.target.value,
                      })
                    }
                    className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Pilih Alasan --</option>
                    <option value="Pemilih Pemula">
                      Pemilih Pemula (Baru 17 Tahun / Sudah Menikah)
                    </option>
                    <option value="Pindahan">Pindahan Domisili</option>
                    <option value="Purnawirawan TNI/Polri">
                      Purnawirawan TNI/Polri
                    </option>
                    <option value="Terlewat Pendataan">
                      Terlewat Pendataan Awal
                    </option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      required
                      type="text"
                      value={modalPemilihBaru.NAMA}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          NAMA: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      NIK
                    </label>
                    <input
                      type="text"
                      value={modalPemilihBaru.NIK}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          NIK: e.target.value,
                        })
                      }
                      placeholder="Kosongkan jika belum terbit"
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    />
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      Jika kosong, sistem akan buat NIK sementara. Admin wajib
                      melengkapi setelah e-KTP terbit.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      NKK
                    </label>
                    <input
                      type="text"
                      value={modalPemilihBaru.NKK}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          NKK: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={modalPemilihBaru.TEMPAT_LAHIR}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          TEMPAT_LAHIR: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={modalPemilihBaru.TANGGAL_LAHIR}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          TANGGAL_LAHIR: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={modalPemilihBaru.KELAMIN}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          JENIS_KELAMIN: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Alamat
                    </label>
                    <input
                      required
                      type="text"
                      value={modalPemilihBaru.ALAMAT}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          ALAMAT: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Dusun
                    </label>
                    <select
                      value={modalPemilihBaru.DUSUN}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          DUSUN: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Dusun --</option>
                      {DAFTAR_DUSUN.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      TPS
                    </label>
                    <input
                      type="text"
                      value={modalPemilihBaru.TPS}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          TPS: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      RT
                    </label>
                    <select
                      value={modalPemilihBaru.RT}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          RT: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    >
                      {DAFTAR_RT.map((rt) => (
                        <option key={rt} value={rt}>
                          RT {rt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      RW
                    </label>
                    <select
                      value={modalPemilihBaru.RW}
                      onChange={(e) =>
                        setModalPemilihBaru({
                          ...modalPemilihBaru,
                          RW: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
                    >
                      {DAFTAR_RW.map((rw) => (
                        <option key={rw} value={rw}>
                          RW {rw}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalPemilihBaru(null)}
                  className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingPemilihBaru}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2"
                >
                  {loadingPemilihBaru ? 'Menyimpan...' : 'Simpan Pemilih Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          {modalEditPemilihBaru && (
  <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="bg-indigo-600 p-5 flex justify-between items-center">
        <h2 className="text-lg font-black text-white flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit Data Pemilih Baru
        </h2>
        <button
          onClick={() => setModalEditPemilihBaru(null)}
          className="text-white/80 hover:text-white bg-indigo-700 rounded-full p-1"
        >
          &times;
        </button>
      </div>

      <form onSubmit={simpanEditPemilihBaru} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">
              Alasan Penambahan
            </label>
            <select
              required
              value={modalEditPemilihBaru.alasan_tambahan}
              onChange={(e) =>
                setModalEditPemilihBaru({
                  ...modalEditPemilihBaru,
                  alasan_tambahan: e.target.value,
                })
              }
              className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
            >
              <option value="">-- Pilih Alasan --</option>
              <option value="Pemilih Pemula">Pemilih Pemula (Baru 17 Tahun / Sudah Menikah)</option>
              <option value="Pindahan">Pindahan Domisili</option>
              <option value="Purnawirawan TNI/Polri">Purnawirawan TNI/Polri</option>
              <option value="Terlewat Pendataan">Terlewat Pendataan Awal</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Nama Lengkap</label>
              <input
                required
                type="text"
                value={modalEditPemilihBaru.NAMA}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, NAMA: e.target.value.toUpperCase() })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">NIK</label>
              <input
                type="text"
                value={modalEditPemilihBaru.NIK}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, NIK: e.target.value })
                }
                placeholder="Kosongkan jika belum terbit"
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] font-bold text-slate-400 mt-1">
                Jika kosong, sistem akan buat NIK sementara.
              </p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">NKK</label>
              <input
                type="text"
                value={modalEditPemilihBaru.NKK}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, NKK: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={modalEditPemilihBaru.TEMPAT_LAHIR}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, TEMPAT_LAHIR: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={modalEditPemilihBaru.TANGGAL_LAHIR}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, TANGGAL_LAHIR: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Jenis Kelamin</label>
              <select
                value={modalEditPemilihBaru.KELAMIN}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, KELAMIN: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Alamat</label>
              <input
                required
                type="text"
                value={modalEditPemilihBaru.ALAMAT}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, ALAMAT: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Dusun</label>
              <select
                value={modalEditPemilihBaru.DUSUN}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, DUSUN: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">-- Pilih Dusun --</option>
                {DAFTAR_DUSUN.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">TPS</label>
              <input
                type="text"
                value={modalEditPemilihBaru.TPS}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, TPS: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">RT</label>
              <select
                value={modalEditPemilihBaru.RT}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, RT: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              >
                {DAFTAR_RT.map((rt) => (
                  <option key={rt} value={rt}>RT {rt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">RW</label>
              <select
                value={modalEditPemilihBaru.RW}
                onChange={(e) =>
                  setModalEditPemilihBaru({ ...modalEditPemilihBaru, RW: e.target.value })
                }
                className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500"
              >
                {DAFTAR_RW.map((rw) => (
                  <option key={rw} value={rw}>RW {rw}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setModalEditPemilihBaru(null)}
            className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loadingEditPemilihBaru}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2"
          >
            {loadingEditPemilihBaru ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {modalEditCoklit && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-5 flex justify-between items-center">
              <h2 className="text-lg font-black text-white">
                Cek & Edit Data Coklit
              </h2>
              <button
                onClick={() => setModalEditCoklit(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => simpanEditCoklit(e, false)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      required
                      type="text"
                      value={modalEditCoklit.NAMA}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          NAMA: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      NIK
                    </label>
                    <input
                      type="text"
                      value={modalEditCoklit.NIK}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          NIK: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      NKK
                    </label>
                    <input
                      type="text"
                      value={modalEditCoklit.NKK}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          NKK: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={modalEditCoklit.TEMPAT_LAHIR || ''}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          TEMPAT_LAHIR: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={modalEditCoklit.TANGGAL_LAHIR || ''}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          TANGGAL_LAHIR: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Alamat
                    </label>
                    <input
                      type="text"
                      value={modalEditCoklit.ALAMAT}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          ALAMAT: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Dusun
                    </label>
                    <select
                      value={modalEditCoklit.DUSUN}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          DUSUN: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Dusun --</option>
                      {DAFTAR_DUSUN.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      TPS
                    </label>
                    <input
                      type="text"
                      value={modalEditCoklit.TPS}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          TPS: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      RT
                    </label>
                    <select
                      value={modalEditCoklit.RT}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          RT: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {DAFTAR_RT.map((rt) => (
                        <option key={rt} value={rt}>
                          RT {rt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      RW
                    </label>
                    <select
                      value={modalEditCoklit.RW}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          RW: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {DAFTAR_RW.map((rw) => (
                        <option key={rw} value={rw}>
                          RW {rw}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Status Coklit
                    </label>
                    <select
                      value={modalEditCoklit.status_coklit}
                      onChange={(e) =>
                        setModalEditCoklit({
                          ...modalEditCoklit,
                          status_coklit: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="Ditemui">Ditemui</option>
                      <option value="Tidak di Rumah">Tidak di Rumah</option>
                      <option value="Pindah">Pindah</option>
                      <option value="Meninggal">Meninggal</option>
                      <option value="Tidak Dikenal">Tidak Dikenal</option>
                    </select>
                  </div>
                     {/* RAGAM DISABILITAS — VERIFIKASI ULANG OLEH ADMIN */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      Ragam Disabilitas
                    </label>
                    <p className="text-[10px] font-bold text-slate-400 mb-2">
                      Cek ulang, hilangkan centang kalau petugas salah pilih di lapangan.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DAFTAR_RAGAM_DISABILITAS.map((ragam) => {
                        const current = modalEditCoklit.ragam_disabilitas
                          ? modalEditCoklit.ragam_disabilitas
                              .split(',')
                              .map((s: string) => s.trim())
                              .filter(Boolean)
                          : [];
                        const isChecked = current.includes(ragam);
                        return (
                          <button
                            key={ragam}
                            type="button"
                            onClick={() => {
                              const updated = isChecked
                                ? current.filter((r: string) => r !== ragam)
                                : [...current, ragam];
                              setModalEditCoklit({
                                ...modalEditCoklit,
                                ragam_disabilitas: updated.join(', '),
                              });
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                              isChecked
                                ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {ragam}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 border-t border-slate-200 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalEditCoklit(null)}
                  className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingSimpanEditCoklit}
                  className="px-5 py-3 bg-slate-700 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md"
                >
                  {loadingSimpanEditCoklit ? 'Menyimpan...' : 'Simpan Saja'}
                </button>
                <button
                  type="button"
                  onClick={(e) => simpanEditCoklit(e as any, true)}
                  disabled={loadingSimpanEditCoklit}
                  className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md flex items-center gap-2"
                >
                  {loadingSimpanEditCoklit
                    ? 'Menyimpan...'
                    : '✓ Simpan & Validasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL EDIT DATA BERMASALAH (PERLU KOREKSI) */}
      {/* ======================================================== */}
      {modalKoreksiEdit && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-orange-500 p-5 flex justify-between items-center">
              <h2 className="text-lg font-black text-white">
                Perbaiki Data Bermasalah
              </h2>
              <button
                onClick={() => setModalKoreksiEdit(null)}
                className="text-white/80 hover:text-white bg-orange-600 rounded-full p-1"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={lanjutkanKePilihanAksi}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-2">
                  <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">
                    Catatan Koreksi Petugas (asli):
                  </p>
                  <p className="text-sm font-bold text-slate-800 italic">
                    "{modalKoreksiEdit.keterangan_koreksi}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      required
                      type="text"
                      value={modalKoreksiEdit.NAMA}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          NAMA: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      NIK
                    </label>
                    <input
                      type="text"
                      value={modalKoreksiEdit.NIK}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          NIK: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      NKK
                    </label>
                    <input
                      type="text"
                      value={modalKoreksiEdit.NKK}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          NKK: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                      <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={modalKoreksiEdit.TEMPAT_LAHIR || ''}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          TEMPAT_LAHIR: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={modalKoreksiEdit.TANGGAL_LAHIR || ''}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          TANGGAL_LAHIR: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Alamat
                    </label>
                    <input
                      type="text"
                      value={modalKoreksiEdit.ALAMAT}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          ALAMAT: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Dusun
                    </label>
                    <select
                      value={modalKoreksiEdit.DUSUN}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          DUSUN: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Dusun --</option>
                      {DAFTAR_DUSUN.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      RT
                    </label>
                    <select
                      value={modalKoreksiEdit.RT}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          RT: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 cursor-pointer"
                    >
                      {DAFTAR_RT.map((rt) => (
                        <option key={rt} value={rt}>
                          RT {rt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      RW
                    </label>
                    <select
                      value={modalKoreksiEdit.RW}
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          RW: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 cursor-pointer"
                    >
                      {DAFTAR_RW.map((rw) => (
                        <option key={rw} value={rw}>
                          RW {rw}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Status Coklit yang Benar
                    </label>
                    <select
                      required
                      value={
                        modalKoreksiEdit.status_coklit === 'Perlu Koreksi'
                          ? ''
                          : modalKoreksiEdit.status_coklit
                      }
                      onChange={(e) =>
                        setModalKoreksiEdit({
                          ...modalKoreksiEdit,
                          status_coklit: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 cursor-pointer"
                    >
                      <option value="" disabled>
                        -- Pilih status yang benar --
                      </option>
                      <option value="Ditemui">Ditemui</option>
                      <option value="Tidak di Rumah">Tidak di Rumah</option>
                      <option value="Pindah">Pindah</option>
                      <option value="Meninggal">Meninggal</option>
                      <option value="Tidak Dikenal">Tidak Dikenal</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalKoreksiEdit(null)}
                  className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 shadow-md"
                >
                  Lanjutkan →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* POPUP PILIHAN AKSI SETELAH EDIT */}
      {/* ======================================================== */}
      {modalAksiSetelahEdit && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-slate-900 p-5">
              <h2 className="text-lg font-black text-white">
                Data Sudah Diperbaiki
              </h2>
              <p className="text-xs font-bold text-slate-300 mt-1">
                {modalAksiSetelahEdit.NAMA}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-slate-600">
                Mau diapakan data ini selanjutnya?
              </p>
              <button
                onClick={() => simpanKoreksiBermasalah(true)}
                disabled={loadingSimpanKoreksiEdit}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-md flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <span>
                  {loadingSimpanKoreksiEdit
                    ? 'Menyimpan...'
                    : 'Kirim ke DPS Langsung'}
                </span>
                <span className="text-[10px] font-bold text-emerald-100 normal-case">
                  Data langsung tervalidasi & masuk DPS
                </span>
              </button>
              <button
                onClick={() => simpanKoreksiBermasalah(false)}
                disabled={loadingSimpanKoreksiEdit}
                className="w-full py-4 bg-slate-600 hover:bg-slate-700 text-white font-black rounded-xl shadow-md flex flex-col items-center gap-1 disabled:opacity-50"
              >
                <span>
                  {loadingSimpanKoreksiEdit
                    ? 'Menyimpan...'
                    : 'Simpan di Coklit'}
                </span>
                <span className="text-[10px] font-bold text-slate-200 normal-case">
                  Masih perlu direview admin sebelum masuk DPS
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalKoreksiEdit({ ...modalAksiSetelahEdit });
                  setModalAksiSetelahEdit(null);
                }}
                disabled={loadingSimpanKoreksiEdit}
                className="w-full py-2 text-slate-400 font-bold text-xs hover:text-slate-600"
              >
                Batal, kembali edit
              </button>
            </div>
          </div>
        </div>
      )}
{/* ======================================================== */}
      {/* MODAL EDIT DAFTAR PEMILIH */}
      {/* ======================================================== */}
      {modalEditDaftarPemilih && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-5 flex justify-between items-center">
              <h2 className="text-lg font-black text-white">
                Edit Data Pemilih
              </h2>
              <button
                onClick={() => setModalEditDaftarPemilih(null)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={simpanEditDaftarPemilih}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Nama Lengkap
                    </label>
                    <input
                      required
                      type="text"
                      value={modalEditDaftarPemilih.NAMA}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          NAMA: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      NIK
                    </label>
                    <input
                      type="text"
                      value={modalEditDaftarPemilih.NIK}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          NIK: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      NKK
                    </label>
                    <input
                      type="text"
                      value={modalEditDaftarPemilih.NKK}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          NKK: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={modalEditDaftarPemilih.TANGGAL_LAHIR || ''}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          TANGGAL_LAHIR: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Tempat Lahir
                    </label>
                    <input
                      type="text"
                      value={modalEditDaftarPemilih.TEMPAT_LAHIR || ''}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          TEMPAT_LAHIR: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Alamat
                    </label>
                    <input
                      type="text"
                      value={modalEditDaftarPemilih.ALAMAT}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          ALAMAT: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Dusun
                    </label>
                    <select
                      value={modalEditDaftarPemilih.DUSUN}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          DUSUN: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Pilih Dusun --</option>
                      {DAFTAR_DUSUN.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      TPS
                    </label>
                    <input
                      type="text"
                      value={modalEditDaftarPemilih.TPS}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          TPS: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      RT
                    </label>
                    <select
                      value={modalEditDaftarPemilih.RT}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          RT: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {DAFTAR_RT.map((rt) => (
                        <option key={rt} value={rt}>
                          RT {rt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      RW
                    </label>
                    <select
                      value={modalEditDaftarPemilih.RW}
                      onChange={(e) =>
                        setModalEditDaftarPemilih({
                          ...modalEditDaftarPemilih,
                          RW: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {DAFTAR_RW.map((rw) => (
                        <option key={rw} value={rw}>
                          RW {rw}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* RAGAM DISABILITAS */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 mb-2">
                      Ragam Disabilitas
                    </label>
                    <p className="text-[10px] font-bold text-slate-400 mb-2">
                      Klik untuk centang/hapus. Boleh kosong kalau tidak ada.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DAFTAR_RAGAM_DISABILITAS.map((ragam) => {
                        const current = modalEditDaftarPemilih.ragam_disabilitas
                          ? modalEditDaftarPemilih.ragam_disabilitas
                              .split(',')
                              .map((s: string) => s.trim())
                              .filter(Boolean)
                          : [];
                        const isChecked = current.includes(ragam);
                        return (
                          <button
                            key={ragam}
                            type="button"
                            onClick={() => {
                              const updated = isChecked
                                ? current.filter((r: string) => r !== ragam)
                                : [...current, ragam];
                              setModalEditDaftarPemilih({
                                ...modalEditDaftarPemilih,
                                ragam_disabilitas: updated.join(', '),
                              });
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                              isChecked
                                ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {ragam}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalEditDaftarPemilih(null)}
                  className="px-5 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loadingSimpanEditDaftarPemilih}
                  className="px-6 py-3 bg-slate-700 text-white rounded-xl text-sm font-bold hover:bg-slate-800 shadow-md"
                >
                  {loadingSimpanEditDaftarPemilih ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL UBAH KE STATUS TMS */}
      {/* ======================================================== */}
      {modalUbahTMS && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="bg-orange-500 p-5">
              <h2 className="text-lg font-black text-white">Ubah ke Status TMS</h2>
              <p className="text-xs font-bold text-orange-100 mt-1">
                {modalUbahTMS.NAMA}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">
                  Pilih Status TMS
                </label>
                <select
                  value={pilihanStatusTMS}
                  onChange={(e) => setPilihanStatusTMS(e.target.value)}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="Pindah">Pindah</option>
                  <option value="Meninggal">Meninggal</option>
                  <option value="Tidak Dikenal">Tidak Dikenal</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModalUbahTMS(null)}
                  className="flex-1 px-5 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={simpanUbahTMS}
                  disabled={loadingUbahTMS}
                  className="flex-1 px-5 py-3 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 shadow-md disabled:opacity-50"
                >
                  {loadingUbahTMS ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
