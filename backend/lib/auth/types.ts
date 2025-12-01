import type { JWTPayload } from 'jose';

export interface SupabaseJWTPayload extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  phone?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export type VerifiedToken = SupabaseJWTPayload;

declare global {
  namespace Express {
    // Ditambahkan untuk akses payload user di handler
    interface Request {
      user?: SupabaseJWTPayload;
      token?: string;
    }
  }
}
