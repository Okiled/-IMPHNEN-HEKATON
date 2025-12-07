import express from 'express';
import rateLimit from 'express-rate-limit';
import { checkEmail, login, register } from '../controllers/authController';

const router = express.Router();

// Rate limiting for auth endpoints - prevent brute force attacks
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  message: {
    success: false,
    error: 'Terlalu banyak percobaan. Silakan coba lagi dalam 15 menit.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for registration
const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    success: false,
    error: 'Batas registrasi tercapai. Silakan coba lagi dalam 1 jam.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email check rate limit (less strict for UX)
const checkEmailRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 checks per 5 minutes
  message: {
    success: false,
    error: 'Terlalu banyak permintaan. Silakan coba lagi.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/check-email', checkEmailRateLimiter, checkEmail);
router.post('/register', registerRateLimiter, register);
router.post('/login', authRateLimiter, login);

export default router;
