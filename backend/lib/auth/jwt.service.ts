import { createRemoteJWKSet, jwtVerify } from 'jose';
import { expectedAudience, expectedIssuer, jwksUri } from './jwt.config';
import type { VerifiedToken } from './types';

// Inisialisasi JWKS di global scope agar caching bekerja optimal
const jwks = createRemoteJWKSet(new URL(jwksUri));

export async function verifyToken(token: string): Promise<VerifiedToken> {
  if (!token) {
    throw new Error('Token tidak ditemukan');
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: expectedIssuer,
      audience: expectedAudience,
    });

    if (!payload?.sub) {
      throw new Error('Payload token tidak memiliki sub');
    }

    return payload as VerifiedToken;
  } catch (error) {
    // Tangani semua error jose sebagai unauthorized
    const message = error instanceof Error ? error.message : 'Token tidak valid';
    throw new Error(`Verifikasi token gagal: ${message}`);
  }
}
