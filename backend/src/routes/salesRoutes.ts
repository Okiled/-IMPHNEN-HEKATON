import express from 'express';
import { createSalesEntry } from '../controllers/salesController';
import { requireAuth } from '../../lib/auth/middleware';

const router = express.Router();

router.use(requireAuth);

router.post('/', createSalesEntry); 

export default router;
