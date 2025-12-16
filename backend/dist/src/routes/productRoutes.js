"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const productController_1 = require("../controllers/productController");
const middleware_1 = require("../../lib/auth/middleware");
const schema_1 = require("../../lib/database/schema");
const router = express_1.default.Router();
// Internal endpoint (no auth) for batch training/scripts
router.get('/internal/list', async (_req, res) => {
    try {
        const products = await schema_1.prisma.products.findMany();
        res.json({ success: true, products });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});
// Apply auth middleware to all routes below
router.use(middleware_1.requireAuth);
// Specific routes MUST come before /:id (order matters!)
router.get('/trend', productController_1.getProductTrend);
router.get('/ranking', productController_1.getProductsWithRanking);
// Public endpoint
router.get('/', productController_1.getProducts);
// Dynamic routes (must be last)
router.get('/:id', productController_1.getProductDetail);
router.post('/', productController_1.createProduct);
router.put('/:id', productController_1.updateProduct);
router.delete('/:id', productController_1.deleteProduct);
exports.default = router;
