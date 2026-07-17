import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('akun_petugas')
      .select('nama_lengkap, no_wa, rt_assigned, rw_assigned');

    if (error) {
      console.error('Error query akun_petugas:', error);
      return NextResponse.json(
        { error: 'Gagal memuat daftar kontak.' },
        { status: 500 }
      );
    }

    // mapping nama kolom Supabase -> nama field yang dipakai komponen
    const dataAman = (data || []).map((p: any) => ({
      nama: p.nama_lengkap,
      no_wa: p.no_wa,
      rt: p.rt_assigned,
      rw: p.rw_assigned,
    }));

    return NextResponse.json(dataAman);
  } catch (err) {
    console.error('Error akun_petugas:', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}