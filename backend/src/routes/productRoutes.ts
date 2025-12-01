import express from 'express';
import { getProducts, createProduct } from '../controllers/productController';
import { requireAuth } from '../../lib/auth/middleware';

const router = express.Router();

router.use(requireAuth);

router.get('/', getProducts);

router.post('/', createProduct);

export default router;
