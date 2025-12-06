import express from 'express';
import { getProducts, createProduct, getProductTrend, updateProduct, getProductsWithRanking, getProductDetail, deleteProduct } from '../controllers/productController';
import { requireAuth } from '../../lib/auth/middleware';
import { prisma } from '../../lib/database/schema';

const router = express.Router();

// Internal endpoint (no auth) for batch training/scripts
router.get('/internal/list', async (_req, res) => {
  try {
    const products = await prisma.products.findMany();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Apply auth middleware to all routes below
router.use(requireAuth);

// Specific routes MUST come before /:id (order matters!)
router.get('/trend', getProductTrend);
router.get('/ranking', getProductsWithRanking);

// Public endpoint
router.get('/', getProducts);

// Dynamic routes (must be last)
router.get('/:id', getProductDetail);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
