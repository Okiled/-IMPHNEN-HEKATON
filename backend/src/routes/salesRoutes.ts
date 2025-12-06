// backend/src/routes/salesRoutes.ts
import { Router } from 'express';
import { 
  createSalesEntry, 
  getSalesData, 
  getSalesById, 
  deleteSales,
  createBulkSales
} from '../controllers/salesController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.post('/', createSalesEntry);
router.post('/bulk', createBulkSales);
router.get('/', getSalesData);
router.get('/:id', getSalesById);
router.delete('/:id', deleteSales);

export default router;