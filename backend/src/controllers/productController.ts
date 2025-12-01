import { Request, Response } from 'express';
import { prisma } from '../../lib/database/schema'; 

export const getProducts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;

    if (!userId) {
      return res.status(401).json({ error: "User tidak terotentikasi" });
    }

    const products = await prisma.products.findMany({
      where: { user_id: String(userId) },
      orderBy: { created_at: 'desc' } 
    });

    res.json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengambil data produk" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { name, unit } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "User tidak terotentikasi" });
    }

    if (!name) {
      return res.status(400).json({ error: "Nama Produk wajib diisi" });
    }

    const existing = await prisma.products.findFirst({
      where: { user_id: userId, name }
    });

    if (existing) {
      return res.status(400).json({ error: "Produk dengan nama ini sudah ada" });
    }

    const newProduct = await prisma.products.create({
      data: {
        user_id: userId,
        name,
        unit: unit || 'pcs', 
        is_active: true,
        dataset_id: null 
      }
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menyimpan produk" });
  }
};
