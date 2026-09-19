import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(req: Request) {
  try {
    // =========================================================
    // CEK ADMIN YANG SEDANG LOGIN
    // =========================================================
    const authorization = req.headers.get('authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { error: 'Tidak ada sesi login.' },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Sesi login tidak valid.' },
        { status: 401 }
      );
    }

    const { data: petugasAdmin, error: adminError } = await admin
      .from('akun_petugas')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !petugasAdmin) {
      return NextResponse.json(
        { error: 'Data admin tidak ditemukan.' },
        { status: 403 }
      );
    }

    if (petugasAdmin.role !== 'Super Admin') {
      return NextResponse.json(
        { error: 'Hanya Super Admin yang dapat mengelola akun.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, akun } = body;

    // =========================================================
    // HAPUS AKUN
    // =========================================================
    if (action === 'delete') {
      const { data: akunLama, error: cariError } = await admin
        .from('akun_petugas')
        .select('id, username, auth_user_id')
        .eq('id', akun.id)
        .single();

      if (cariError || !akunLama) {
        return NextResponse.json(
          { error: 'Akun tidak ditemukan.' },
          { status: 404 }
        );
      }

      // Hapus riwayat login dulu.
      // Ini kemungkinan penyebab akun Coklit lo sebelumnya gagal dihapus.
      const { error: logError } = await admin
        .from('log_login')
        .delete()
        .eq('petugas_id', akunLama.id);

      if (logError) {
        return NextResponse.json(
          { error: 'Gagal menghapus log login: ' + logError.message },
          { status: 400 }
        );
      }

      // Hapus profil akun
      const { error: profilError } = await admin
        .from('akun_petugas')
        .delete()
        .eq('id', akunLama.id);

      if (profilError) {
        return NextResponse.json(
          { error: 'Gagal menghapus profil akun: ' + profilError.message },
          { status: 400 }
        );
      }

      // Hapus Supabase Auth
      if (akunLama.auth_user_id) {
        const { error: authDeleteError } =
          await admin.auth.admin.deleteUser(akunLama.auth_user_id);

        if (authDeleteError) {
          return NextResponse.json(
            {
              error:
                'Profil terhapus, tetapi Auth gagal dihapus: ' +
                authDeleteError.message,
            },
            { status: 400 }
          );
        }
      }

      return NextResponse.json({
        success: true,
      });
    }

    // =========================================================
    // DATA CREATE / UPDATE
    // =========================================================
    const username = String(akun.username || '')
      .trim()
      .toLowerCase();

    const password = String(akun.password || '');

    if (!username) {
      return NextResponse.json(
        { error: 'Username wajib diisi.' },
        { status: 400 }
      );
    }

    const email = `${username}@pilkades.internal`;

    const payloadProfil: any = {
      username,
      nama_lengkap: akun.nama_lengkap,
      role: akun.role,
      akses_menu: akun.akses_menu || [],
      no_wa: akun.no_wa || null,
      rt_assigned: akun.rt_assigned || null,
      rw_assigned: akun.rw_assigned || null,
      tps_assigned: akun.tps_assigned || null,
    };

    // =========================================================
    // CREATE AKUN
    // =========================================================
    if (action === 'create') {
      if (!password) {
        return NextResponse.json(
          { error: 'Password wajib diisi untuk akun baru.' },
          { status: 400 }
        );
      }

      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (authError || !authData.user) {
        return NextResponse.json(
          {
            error:
              'Gagal membuat login Supabase Auth: ' +
              (authError?.message || ''),
          },
          { status: 400 }
        );
      }

      payloadProfil.auth_user_id = authData.user.id;

      const { data: akunBaru, error: insertError } = await admin
        .from('akun_petugas')
        .insert(payloadProfil)
        .select()
        .single();

      if (insertError) {
        // rollback auth kalau insert profil gagal
        await admin.auth.admin.deleteUser(authData.user.id);

        return NextResponse.json(
          {
            error: 'Gagal membuat profil akun: ' + insertError.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        akun: akunBaru,
      });
    }

    // =========================================================
    // UPDATE AKUN
    // =========================================================
    if (action === 'update') {
      const { data: akunLama, error: cariError } = await admin
        .from('akun_petugas')
        .select('*')
        .eq('id', akun.id)
        .single();

      if (cariError || !akunLama) {
        return NextResponse.json(
          { error: 'Akun tidak ditemukan.' },
          { status: 404 }
        );
      }

      let authUserId = akunLama.auth_user_id;

      // =====================================================
      // AKUN LAMA BELUM PUNYA AUTH
      // contohnya akun KPPS yang lo bikin dengan kode lama
      // =====================================================
      if (!authUserId) {
        if (!password) {
          return NextResponse.json(
            {
              error:
                'Akun lama ini belum terhubung ke Supabase Auth. Isi password lalu simpan lagi.',
            },
            { status: 400 }
          );
        }

        const { data: authData, error: createAuthError } =
          await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });

        if (createAuthError || !authData.user) {
          return NextResponse.json(
            {
              error:
                'Gagal membuat Auth untuk akun lama: ' +
                (createAuthError?.message || ''),
            },
            { status: 400 }
          );
        }

        authUserId = authData.user.id;
      } else {
        const perubahanAuth: any = {};

        if (username !== akunLama.username) {
          perubahanAuth.email = email;
          perubahanAuth.email_confirm = true;
        }

        if (password) {
          perubahanAuth.password = password;
        }

        if (Object.keys(perubahanAuth).length > 0) {
          const { error: updateAuthError } =
            await admin.auth.admin.updateUserById(
              authUserId,
              perubahanAuth
            );

          if (updateAuthError) {
            return NextResponse.json(
              {
                error:
                  'Gagal memperbarui login Auth: ' +
                  updateAuthError.message,
              },
              { status: 400 }
            );
          }
        }
      }

      payloadProfil.auth_user_id = authUserId;

      const { data: akunUpdate, error: updateError } = await admin
        .from('akun_petugas')
        .update(payloadProfil)
        .eq('id', akun.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          {
            error: 'Gagal memperbarui akun: ' + updateError.message,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        akun: akunUpdate,
      });
    }

    return NextResponse.json(
      { error: 'Action tidak dikenali.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('ADMIN AKUN ERROR:', err);

    return NextResponse.json(
      {
        error: err.message || 'Terjadi kesalahan server.',
      },
      { status: 500 }
    );
  }
}