// Konfigurasi dasar untuk verifikasi JWT Supabase
const rawSupabaseUrl = process.env.SUPABASE_URL;

if (!rawSupabaseUrl) {
  throw new Error('SUPABASE_URL diperlukan untuk konfigurasi JWT Supabase');
}

// Normalize untuk menghindari double slash
export const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, '');

export const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
export const expectedIssuer = `${supabaseUrl}/auth/v1`;
export const expectedAudience = process.env.SUPABASE_JWT_AUDIENCE || 'authenticated';
