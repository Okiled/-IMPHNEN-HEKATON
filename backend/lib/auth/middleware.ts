import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from './jwt.service';

// Ekstraksi token dari header Authorization
function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^[Bb]earer\s+(.+)$/);
  return match ? match[1].trim() : null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      res.status(401).json({ error: 'Authorization header dengan Bearer token diperlukan' });
      return;
    }

    const payload = await verifyToken(token);
    req.user = payload;
    req.token = token;
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    res.status(401).json({ error: message });
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return next();
    }

    const payload = await verifyToken(token);
    req.user = payload;
    req.token = token;
    next();
  } catch (error) {
    // Untuk optional auth, jika token tidak valid tetap lanjut tanpa user
    next();
  }
}
