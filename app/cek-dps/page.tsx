'use client';

import { useEffect, useMemo, useState } from 'react';

/* ------------------------------------------------------------------ */
/*  Target: hari pencoblosan — 20 September 2026, 07:00 WIB           */
/* ------------------------------------------------------------------ */
const TARGET = new Date('2026-09-20T07:00:00+07:00').getTime();

type Petugas = {
  nama: string;
  no_wa: string;
  rt: string;
  rw: string;
};

type WargaHasil = {
  nama: string;
  nik_tersamar: string | null;
  dusun: string;
  rt: string;
  rw: string;
};

type HasilCek =
  | { status: 'ditemukan'; hasil: WargaHasil[] }
  | { status: 'kosong'; hasil: WargaHasil[] };

/* ------------------------------------------------------------------ */
/*  Motif: lambang cincin merah-kuning-hijau (nuansa lambang daerah)  */
/* ------------------------------------------------------------------ */
function LambangBadge({ className = '', opacity = 1 }: { className?: string; opacity?: number }) {
  const warna = ['#C81E1E', '#D9A404', '#1B6B3A'];
  const rings = Array.from({ length: 9 });
  return (
    <svg viewBox="0 0 200 200" className={className} style={{ opacity }}>
      <g fill="none" strokeLinecap="round">
        {rings.map((_, i) => {
          const r = 92 - i * 9;
          return (
            <circle
              key={i}
              cx={100}
              cy={100}
              r={r}
              stroke={warna[i % 3]}
              strokeWidth={i % 3 === 0 ? 3 : 1.6}
              strokeDasharray={`${r * 3.6} ${r * 0.9}`}
              strokeDashoffset={i * 23}
            />
          );
        })}
      </g>
    </svg>
  );
}

function useCountdown(target: number) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(target); // placeholder biar SSR & first client render sama-sama diff=0

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(target - now, 0);
  const hari = Math.floor(diff / 86400000);
  const jam = Math.floor((diff % 86400000) / 3600000);
  const menit = Math.floor((diff % 3600000) / 60000);
  const detik = Math.floor((diff % 60000) / 1000);
  return { hari, jam, menit, detik, selesai: mounted && diff === 0, mounted };
}

/* ------------------------------------------------------------------ */
/*  Sheet kontak petugas — muncul saat tombol WA kanan-bawah ditekan   */
/* ------------------------------------------------------------------ */
function LembarKontakPetugas({
  open,
  onClose,
  nama,
}: {
  open: boolean;
  onClose: () => void;
  nama: string;
}) {
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || petugas.length > 0) return;
    setLoading(true);
    setError('');
    fetch('/api/petugas')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPetugas(data);
        else setError('Gagal memuat daftar kontak.');
      })
      .catch(() => setError('Gagal menghubungi server.'))
      .finally(() => setLoading(false));
  }, [open, petugas.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 bg-[#0B3D24]/60 backdrop-blur-sm"
      />
      <div className="relative w-full sm:max-w-md max-h-[80vh] bg-[#FFFDF9] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-[slideUp_.25s_ease-out]">
        <div className="h-1 w-12 bg-[#EDE6D3] rounded-full mx-auto mt-3 sm:hidden" />
        <div className="px-6 pt-4 pb-3 border-b border-[#EDE6D3] flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#D9A404]">
              Ada kendala?
            </p>
            <h2 className="text-lg font-bold text-[#201D18]">
              Pilih petugas RT/RW Anda
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F2ECDA] text-[#201D18] font-bold shrink-0"
          >
            x
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-1.5">
          {loading && (
            <div className="py-10 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#1B6B3A] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <p className="text-sm font-semibold text-[#C81E1E] text-center py-6">{error}</p>
          )}

          {!loading &&
            !error &&
            petugas.map((p, idx) => {
              const pesan = nama
                ? `Halo, saya .... ingin melapor terkait kendala DPS Pilkades untuk RT ${p.rt}/RW ${p.rw}.`
                : `Halo, saya ingin melapor terkait kendala DPS Pilkades untuk RT ${p.rt}/RW ${p.rw}.`;
              const link = `https://wa.me/${p.no_wa}?text=${encodeURIComponent(pesan)}`;
              return (
                <a
                  key={idx}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[#EDE6D3] hover:border-[#1B6B3A] hover:bg-white transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-[#201D18]">
                      RT {p.rt} / RW {p.rw}
                    </p>
                    <p className="text-xs font-semibold text-[#8A6B10]">{p.nama}</p>
                  </div>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#25D366] shrink-0" fill="currentColor">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.1c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.95-.31-1.64-.6-2.9-1.25-4.79-4.15-4.94-4.35-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.26-.29.58-.36.77-.36h.55c.18 0 .42-.07.65.5.24.58.83 2 .9 2.15.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.61.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.35 1.44.3.15.47.13.65-.07.18-.2.75-.87.95-1.17.2-.29.4-.24.65-.15.26.1 1.65.78 1.93.92.29.15.48.22.55.35.07.13.07.75-.17 1.43z" />
                  </svg>
                </a>
              );
            })}
        </div>
      </div>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function CekDPS() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<HasilCek | null>(null);
  const [error, setError] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const { hari, jam, menit, detik, selesai } = useCountdown(TARGET);

  async function handleCek(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setHasil(null);

    try {
      const res = await fetch('/api/cek-dps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan.');
      } else {
        setHasil(data);
      }
    } catch {
      setError('Gagal menghubungi server. Cek koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      {/* ---------------- HERO: countdown ---------------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#0B3D24] to-[#1B6B3A] pt-14 pb-24 px-4">
        <div className="absolute top-0 left-0 w-full h-1.5 flex">
          <div className="w-1/3 bg-[#C81E1E]" />
          <div className="w-1/3 bg-[#D9A404]" />
          <div className="w-1/3 bg-[#1B6B3A]" />
        </div>

        <LambangBadge className="absolute -right-16 -top-6 w-72 h-72" opacity={0.5} />
        <LambangBadge className="absolute -left-24 bottom-0 w-64 h-64" opacity={0.3} />

        <div className="relative max-w-md mx-auto text-center">
          <span className="inline-block text-[11px] font-bold tracking-[0.25em] uppercase text-[#F5D67A]">
            Pilkades Karangsambung
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white leading-snug">
            {selesai ? 'Hari pencoblosan telah tiba' : 'Menuju hari pencoblosan'}
          </h1>

          {!selesai && (
            <div className="mt-7 grid grid-cols-4 gap-2">
              {[
                { v: hari, l: 'Hari' },
                { v: jam, l: 'Jam' },
                { v: menit, l: 'Menit' },
                { v: detik, l: 'Detik' },
              ].map((b) => (
                <div
                  key={b.l}
                  className="bg-white/10 border border-white/15 rounded-2xl py-3 backdrop-blur-sm"
                >
                  <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                    {String(b.v).padStart(2, '0')}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5D67A] mt-1">
                    {b.l}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="mt-6 text-xs font-semibold text-[#F5D67A] tracking-wide">
            Sabtu, 20 September 2026 · 07.00 WIB
          </p>
        </div>
      </section>

      {/* ---------------- KARTU PENCARIAN ---------------- */}
      <section className="relative max-w-md mx-auto px-4 -mt-12">
        <div className="bg-white rounded-3xl shadow-xl border border-[#EDE6D3] overflow-hidden">
          <div className="h-1.5 w-full flex">
            <div className="w-1/3 bg-[#C81E1E]" />
            <div className="w-1/3 bg-[#D9A404]" />
            <div className="w-1/3 bg-[#1B6B3A]" />
          </div>
          <div className="p-6 sm:p-7">
            <h2 className="text-lg font-bold text-[#201D18]">
              Cek Daftar Pemilih Sementara
            </h2>
            <p className="text-xs font-semibold text-[#8A6B10] mt-1">
              Masukkan nama lengkap atau NIK sesuai KTP
            </p>

            <form onSubmit={handleCek} className="mt-5 space-y-3">
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nama lengkap atau NIK"
                className="w-full px-4 py-3.5 bg-[#FFFDF9] border-2 border-[#EDE6D3] rounded-xl font-semibold text-[#201D18] focus:border-[#1B6B3A] outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#1B6B3A] hover:bg-[#155A30] text-white font-bold rounded-xl shadow-md flex justify-center items-center transition-colors"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Cek Status'
                )}
              </button>
            </form>

            {error && (
              <div className="mt-5 p-4 bg-red-50 border border-red-200 text-[#C81E1E] text-sm font-bold rounded-xl text-center">
                {error}
              </div>
            )}

            {hasil?.status === 'ditemukan' && (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-bold text-[#8A6B10]">
                  Ditemukan {hasil.hasil.length} data, pilih nama yang sesuai:
                </p>
                {hasil.hasil.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#EAF5EC] border-2 border-[#C7E3CD] rounded-xl"
                  >
                    <p className="font-black text-[#1B6B3A]">{w.nama}</p>
                    <p className="text-xs font-bold text-[#276B44] mt-1">
                      NIK {w.nik_tersamar} · Dusun {w.dusun} · RT {w.rt}/RW {w.rw}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {hasil?.status === 'kosong' && (
              <div className="mt-5 p-5 bg-[#FCF3D9] border-2 border-[#EFD98F] rounded-xl text-center">
                <p className="font-black text-[#9A6B04]">Nama Anda BELUM/TIDAK ditemukan</p>
                <p className="text-xs font-bold text-[#B0792C] mt-2">
                  Ketuk tombol WhatsApp di kanan bawah untuk melapor ke petugas RT/RW Anda.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] font-semibold text-[#8A6B10] mt-6 pb-10">
          Panitia Pemilihan Kepala Desa Karangsambung
        </p>
      </section>

      {/* ---------------- TOMBOL WA MELAYANG ---------------- */}
      <button
        onClick={() => setSheetOpen(true)}
        aria-label="Hubungi petugas"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] shadow-lg shadow-[#25D366]/40 flex items-center justify-center"
      >
        <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40" />
        <svg viewBox="0 0 24 24" className="relative w-7 h-7 text-white" fill="currentColor">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 0 0 4.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.1c-.24.68-1.4 1.32-1.93 1.4-.5.08-1.12.11-1.8-.11-.42-.13-.95-.31-1.64-.6-2.9-1.25-4.79-4.15-4.94-4.35-.14-.2-1.18-1.57-1.18-3 0-1.42.75-2.12 1.02-2.41.26-.29.58-.36.77-.36h.55c.18 0 .42-.07.65.5.24.58.83 2 .9 2.15.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.44.52-.15.15-.3.31-.13.61.17.29.75 1.24 1.62 2.01 1.11.99 2.05 1.3 2.35 1.44.3.15.47.13.65-.07.18-.2.75-.87.95-1.17.2-.29.4-.24.65-.15.26.1 1.65.78 1.93.92.29.15.48.22.55.35.07.13.07.75-.17 1.43z" />
        </svg>
      </button>

      <LembarKontakPetugas open={sheetOpen} onClose={() => setSheetOpen(false)} nama={query} />
    </main>
  );
}