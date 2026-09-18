
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

type PendudukRow = {
  NAMA: string;
  NIK: string | null;
  NKK: string | null;
  DUSUN: string | null;
  RT: string | null;
  RW: string | null;
  TPS?: string | null;
};

type TpsRow = {
  nomor_tps: string;
  latitude: number | null;
  longitude: number | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string' || query.trim().length < 3) {
      return NextResponse.json(
        { error: 'Masukkan minimal 3 karakter untuk pencarian.' },
        { status: 400 }
      );
    }

    // --- RATE LIMITING PER IP ---
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const sepuluhMenitLalu = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { count: jumlahRequest } = await supabaseAdmin
      .from('log_cek_dps')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('waktu', sepuluhMenitLalu);

    if ((jumlahRequest || 0) >= 15) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan dari perangkat ini. Coba lagi beberapa menit lagi.' },
        { status: 429 }
      );
    }

    await supabaseAdmin.from('log_cek_dps').insert({ ip });

    // --- PECAH QUERY JADI PER-KATA ---
    const kataKata = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((k: string) => k.replace(/[,()]/g, ''));

    let builder = supabaseAdmin
      .from('penduduk')
      .select('NAMA, NIK, NKK, DUSUN, RT, RW, TPS');

    for (const kata of kataKata) {
      builder = builder.or(
        `NAMA.ilike.%${kata}%,NIK.ilike.%${kata}%,NKK.ilike.%${kata}%`
      );
    }

    const { data: hasil, error } = await builder.limit(20);

    if (error) {
      console.error('Error query penduduk:', error);
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat mencari data.' },
        { status: 500 }
      );
    }

    if (!hasil || hasil.length === 0) {
      return NextResponse.json({ status: 'kosong', hasil: [] });
    }

    const { data: dataTps, error: errorTps } = await supabaseAdmin
      .from('tps')
      .select('nomor_tps, latitude, longitude');

    if (errorTps) {
      console.error('Error mengambil data TPS:', errorTps);
    }

    const hasilAman = hasil.map((w: PendudukRow) => {
      const nomorTpsPenduduk = String(w.TPS ?? '')
        .replace(/^TPS\s*/i, '')
        .trim();

      const lokasiTps = (dataTps as TpsRow[] | null)?.find((t) => {
        const nomorMaster = String(t.nomor_tps ?? '')
          .replace(/^TPS\s*/i, '')
          .trim();

        return nomorMaster === nomorTpsPenduduk;
      });

      let mapsUrl: string | null = null;

      if (
        lokasiTps &&
        lokasiTps.latitude !== null &&
        lokasiTps.longitude !== null
      ) {
        mapsUrl =
          `https://www.google.com/maps/dir/?api=1` +
          `&destination=${lokasiTps.latitude},${lokasiTps.longitude}`;
      }

      return {
        nama: w.NAMA,

        nik_tersamar: w.NIK
          ? w.NIK.slice(0, 4) + '••••••••' + w.NIK.slice(-4)
          : null,

        tps: w.TPS ?? null,

        maps_url: mapsUrl,
      };
    });

    return NextResponse.json({ status: 'ditemukan', hasil: hasilAman });
  } catch (err: any) {
    console.error('Error cek-dps:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Coba lagi nanti.' },
      { status: 500 }
    );
  }
}
export async function GET() {
  return NextResponse.json([]);
}

