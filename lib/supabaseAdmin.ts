import { createClient } from '@supabase/supabase-js';

// PENTING: file ini HANYA dipakai di server (API route),
// jangan pernah diimport di komponen client ('use client')
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);