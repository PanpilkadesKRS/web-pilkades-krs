import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL_DOMAIN = 'pilkades.internal';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum ke-set di .env');
  process.exit(1);
}

async function main() {
  const resAkun = await fetch(
    `${SUPABASE_URL}/rest/v1/akun_petugas?select=id,username,password,nama_lengkap&auth_user_id=is.null`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );

  const akunList = await resAkun.json();

  if (!resAkun.ok) {
    console.error('Gagal ambil data akun_petugas:', akunList);
    return;
  }
  if (!akunList || akunList.length === 0) {
    console.log('Gak ada akun yang perlu dimigrasi.');
    return;
  }

  for (const akun of akunList) {
    const email = `${akun.username}@${EMAIL_DOMAIN}`;

    const resCreate = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: akun.password,
        email_confirm: true,
        user_metadata: { username: akun.username, nama_lengkap: akun.nama_lengkap },
      }),
    });

    const created = await resCreate.json();

    if (!resCreate.ok) {
      console.error(`GAGAL "${akun.username}":`, created.msg || created.message || created);
      continue;
    }

    const resUpdate = await fetch(
      `${SUPABASE_URL}/rest/v1/akun_petugas?id=eq.${akun.id}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ auth_user_id: created.id }),
      }
    );

    if (!resUpdate.ok) {
      console.error(`Berhasil bikin auth user tapi gagal link balik "${akun.username}"`);
      continue;
    }

    console.log(`OK  ${akun.username}  ->  ${email}`);
  }

  console.log('\nSelesai.');
}

main().catch((err) => {
  console.error('ERROR GAK KETANGKEP:', err);
}); 
