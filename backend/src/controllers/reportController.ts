import { Request, Response } from 'express';
import { prisma } from '../../lib/database/schema';

export const getWeeklyReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    // Previous week for comparison
    const prevWeekEnd = new Date(startDate);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    // Current week summary
    const summary = await prisma.sales.aggregate({
      _sum: {
        quantity: true,
        revenue: true 
      },
      where: {
        user_id: userId,
        sale_date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Previous week summary for comparison
    const prevSummary = await prisma.sales.aggregate({
      _sum: {
        quantity: true,
        revenue: true 
      },
      where: {
        user_id: userId,
        sale_date: {
          gte: prevWeekStart,
          lte: prevWeekEnd
        }
      }
    });

    // Calculate week-over-week changes
    const currQty = Number(summary._sum.quantity) || 0;
    const prevQty = Number(prevSummary._sum.quantity) || 0;
    const currRev = Number(summary._sum.revenue) || 0;
    const prevRev = Number(prevSummary._sum.revenue) || 0;

    const qtyChange = prevQty > 0 ? ((currQty - prevQty) / prevQty) * 100 : 0;
    const revChange = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : 0;

    // Daily breakdown for chart
    const dailySales = await prisma.sales.groupBy({
      by: ['sale_date'],
      _sum: { quantity: true, revenue: true },
      where: {
        user_id: userId,
        sale_date: { gte: startDate, lte: endDate }
      },
      orderBy: { sale_date: 'asc' }
    });

    const dailyData = dailySales.map(d => ({
      date: d.sale_date.toISOString().split('T')[0],
      quantity: Number(d._sum.quantity) || 0,
      revenue: Number(d._sum.revenue) || 0
    }));

    // Top performers with analytics
    const topStats = await prisma.sales.groupBy({
      by: ['product_id'],
      _sum: { quantity: true, revenue: true },
      where: {
        user_id: userId,
        sale_date: { gte: startDate, lte: endDate }
      },
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: 10
    });

    const topPerformers = await Promise.all(topStats.map(async (item) => {
      const product = await prisma.products.findUnique({
        where: { id: item.product_id }
      });
      
      // Get latest analytics for this product
      const analytics = await prisma.daily_analytics.findFirst({
        where: { product_id: item.product_id },
        orderBy: { metric_date: 'desc' }
      });

      return {
        id: item.product_id,
        name: product?.name || "Unknown",
        quantity: Number(item._sum.quantity) || 0,
        revenue: Number(item._sum.revenue) || 0,
        momentum: analytics?.momentum_label || 'STABLE',
        momentumValue: Number(analytics?.momentum_combined || 0),
        burstLevel: analytics?.burst_level || 'NORMAL'
      };
    }));

    // Products needing attention
    const attentionDate = new Date();
    attentionDate.setDate(attentionDate.getDate() - 3);

    const issues = await prisma.daily_analytics.findMany({
      where: {
        user_id: userId,
        metric_date: { gte: attentionDate },
        OR: [
          { burst_level: 'CRITICAL' },
          { burst_level: 'HIGH' },
          { momentum_label: 'FALLING' }, 
          { momentum_label: 'DECLINING' }
        ]
      },
      include: { products: true },
      orderBy: { metric_date: 'desc' },
      take: 5
    });

    const attentionNeeded = issues.map(item => ({
      id: item.product_id,
      name: item.products.name,
      date: item.metric_date,
      status: item.burst_level === 'CRITICAL' ? 'VIRAL SPIKE' : 
              item.burst_level === 'HIGH' ? 'BURST' : 'DECLINING',
      detail: item.burst_level === 'CRITICAL' 
        ? `Lonjakan ${Number(item.burst_score).toFixed(1)}x dari biasanya!` 
        : item.burst_level === 'HIGH'
        ? `Penjualan naik ${Number(item.burst_score).toFixed(1)}x`
        : `Momentum: ${(Number(item.momentum_combined) * 100).toFixed(1)}%`,
      priority: item.burst_level === 'CRITICAL' ? 'critical' : 
                item.burst_level === 'HIGH' ? 'high' : 'medium'
    }));

    // Generate AI Insights
    const insights: string[] = [];
    
    if (qtyChange > 10) {
      insights.push(`📈 Penjualan minggu ini naik ${qtyChange.toFixed(1)}% dibanding minggu lalu. Pertahankan momentum!`);
    } else if (qtyChange < -10) {
      insights.push(`📉 Penjualan turun ${Math.abs(qtyChange).toFixed(1)}% dari minggu lalu. Perlu strategi baru.`);
    } else {
      insights.push(`➡️ Penjualan stabil dibanding minggu lalu.`);
    }

    if (topPerformers.length > 0) {
      const bestProduct = topPerformers[0];
      insights.push(`🏆 ${bestProduct.name} jadi produk terlaris dengan ${bestProduct.quantity} terjual.`);
    }

    const viralProducts = attentionNeeded.filter(a => a.status === 'VIRAL SPIKE');
    if (viralProducts.length > 0) {
      insights.push(`🔥 ${viralProducts.length} produk mengalami lonjakan viral! Pastikan stok tersedia.`);
    }

    const decliningProducts = attentionNeeded.filter(a => a.status === 'DECLINING');
    if (decliningProducts.length > 0) {
      insights.push(`⚠️ ${decliningProducts.length} produk mengalami penurunan. Pertimbangkan promo atau bundling.`);
    }

    // Product breakdown by status
    const allProducts = await prisma.products.findMany({
      where: { user_id: userId, is_active: true }
    });

    const latestAnalytics = await Promise.all(
      allProducts.map(async (p) => {
        const analytics = await prisma.daily_analytics.findFirst({
          where: { product_id: p.id },
          orderBy: { metric_date: 'desc' }
        });
        return { productId: p.id, analytics };
      })
    );

    const statusCounts = {
      trending_up: latestAnalytics.filter(a => a.analytics?.momentum_label === 'TRENDING_UP').length,
      growing: latestAnalytics.filter(a => a.analytics?.momentum_label === 'GROWING').length,
      stable: latestAnalytics.filter(a => !a.analytics?.momentum_label || a.analytics?.momentum_label === 'STABLE').length,
      declining: latestAnalytics.filter(a => a.analytics?.momentum_label === 'DECLINING').length,
      falling: latestAnalytics.filter(a => a.analytics?.momentum_label === 'FALLING').length
    };

    // Response
    res.json({
      success: true,
      data: {
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        summary: {
          totalQuantity: currQty,
          totalRevenue: currRev,
          quantityChange: Math.round(qtyChange * 10) / 10,
          revenueChange: Math.round(revChange * 10) / 10,
          prevWeekQuantity: prevQty,
          prevWeekRevenue: prevRev
        },
        dailyData,
        topPerformers,
        attentionNeeded,
        insights,
        statusCounts
      }
    });

  } catch (error) {
    console.error("Weekly Report Error:", error);
    res.status(500).json({ error: "Gagal membuat laporan mingguan" });
  }
};