import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
dotenv.config();

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',') || '*',
}));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Items
app.get('/api/items', async (_req, res) => {
  const items = await prisma.item.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(items);
});

// Inventory view
app.get('/api/inventory', async (_req, res) => {
  const items = await prisma.item.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(items);
});

// Bulk upsert items (admin/import)
app.post('/api/items/bulk', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'items must be an array' });
  }
  const ops = items.map((it) =>
    prisma.item.upsert({
      where: { name: it.name },
      update: {
        category: it.category,
        priceCents: it.priceCents,
        stock: typeof it.stock === 'number' ? it.stock : undefined,
        imageUrl: it.imageUrl || null,
      },
      create: {
        name: it.name,
        category: it.category,
        priceCents: it.priceCents,
        stock: typeof it.stock === 'number' ? it.stock : 0,
        imageUrl: it.imageUrl || null,
      },
    })
  );
  await prisma.$transaction(ops);
  res.json({ ok: true });
});

// Get packaging materials inventory
app.get('/api/packaging', async (_req, res) => {
  const packaging = await prisma.packagingMaterial.findMany({ orderBy: { name: 'asc' } });
  res.json(packaging);
});

// Update packaging stock
app.put('/api/packaging/:id', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  
  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({ error: 'Invalid stock value' });
  }
  
  try {
    const updated = await prisma.packagingMaterial.update({
      where: { id: parseInt(id) },
      data: { stock },
    });
    res.json(updated);
  } catch (error) {
    res.status(404).json({ error: 'Packaging material not found' });
  }
});

// Get sales history
app.get('/api/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {};
    
    // Add date filtering if provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateTime;
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            item: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sales);
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Get sales statistics for date range
app.get('/api/sales/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {};
    
    // Add date filtering if provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateTime;
      }
    }

    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              item: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchase.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      })
    ]);

    // Calculate statistics
    const totalSales = sales.reduce((sum, sale) => sum + sale.totalCents, 0);
    const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, sale) => sum + sale.totalCents, 0);
    const creditSales = sales.filter(s => s.paymentMethod === 'credit').reduce((sum, sale) => sum + sale.totalCents, 0);
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.amountCents, 0);
    const netCash = cashSales - totalPurchases;
    const totalTransactions = sales.length;

    // Top selling items
    const itemStats = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const itemName = item.item.name;
        if (!itemStats[itemName]) {
          itemStats[itemName] = { quantity: 0, revenue: 0, category: item.item.category };
        }
        itemStats[itemName].quantity += item.quantity;
        itemStats[itemName].revenue += item.lineTotalCents;
      });
    });

    const topItems = Object.entries(itemStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    res.json({
      summary: {
        totalSales,
        cashSales,
        creditSales,
        totalPurchases,
        netCash,
        totalTransactions
      },
      topItems,
      sales,
      purchases
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ error: 'Failed to fetch sales statistics' });
  }
});

// Create sale
app.post('/api/sales', async (req, res) => {
  try {
    const { items, paymentMethod, amountTenderedCents } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items in sale' });
    }
    if (!['cash', 'credit'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const itemIds = items.map((i) => i.itemId);
    const dbItems = await prisma.item.findMany({ where: { id: { in: itemIds } } });
    const idToItem = new Map(dbItems.map((i) => [i.id, i]));

    let subtotalCents = 0;
    for (const line of items) {
      const dbItem = idToItem.get(line.itemId);
      if (!dbItem) return res.status(400).json({ error: `Item not found: ${line.itemId}` });
      if (dbItem.stock < line.quantity) return res.status(400).json({ error: `Insufficient stock for ${dbItem.name}` });
      subtotalCents += dbItem.priceCents * line.quantity;
    }
    const taxCents = 0; // Adjust if tax required
    const totalCents = subtotalCents + taxCents;

    let changeDueCents = 0;
    if (paymentMethod === 'cash') {
      if (typeof amountTenderedCents !== 'number') {
        return res.status(400).json({ error: 'amountTenderedCents required for cash' });
      }
      if (amountTenderedCents < totalCents) {
        return res.status(400).json({ error: 'Insufficient cash tendered' });
      }
      changeDueCents = amountTenderedCents - totalCents;
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          paymentMethod,
          subtotalCents,
          taxCents,
          totalCents,
          amountTenderedCents: paymentMethod === 'cash' ? amountTenderedCents : null,
          changeDueCents: paymentMethod === 'cash' ? changeDueCents : null,
        },
      });

      // Track packaging usage
      const packagingUsage = new Map();

      for (const line of items) {
        const dbItem = idToItem.get(line.itemId);
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            itemId: dbItem.id,
            quantity: line.quantity,
            unitPriceCents: dbItem.priceCents,
            lineTotalCents: dbItem.priceCents * line.quantity,
          },
        });
        
        // Decrement item stock
        await tx.item.update({
          where: { id: dbItem.id },
          data: { stock: { decrement: line.quantity } },
        });

        // Track packaging usage
        if (dbItem.packaging) {
          const current = packagingUsage.get(dbItem.packaging) || 0;
          packagingUsage.set(dbItem.packaging, current + line.quantity);
        }

        // Track elote inventory (ounces)
        if (dbItem.name === 'Elote Chico') {
          const current = packagingUsage.get('elote') || 0;
          packagingUsage.set('elote', current + (line.quantity * 8)); // 8 oz per elote chico
        } else if (dbItem.name === 'Elote Grande') {
          const current = packagingUsage.get('elote') || 0;
          packagingUsage.set('elote', current + (line.quantity * 14)); // 14 oz per elote grande
        }
      }

      // Decrement packaging stock
      for (const [packagingName, quantity] of packagingUsage) {
        await tx.packagingMaterial.updateMany({
          where: { name: packagingName },
          data: { stock: { decrement: quantity } },
        });
      }

      return sale;
    });

    res.json({ ok: true, saleId: result.id, totalCents, changeDueCents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get purchases history
app.get('/api/purchases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {};
    
    // Add date filtering if provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateTime;
      }
    }

    const purchases = await prisma.purchase.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Create purchase
app.post('/api/purchases', async (req, res) => {
  try {
    const { amountCents, description } = req.body;
    if (typeof amountCents !== 'number' || amountCents <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const purchase = await prisma.purchase.create({
      data: {
        amountCents,
        description: description || 'Daily purchase',
      },
    });

    res.json({ ok: true, purchaseId: purchase.id, amountCents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get time entries
app.get('/api/time-entries', async (req, res) => {
  try {
    const { startDate, endDate, employeeName } = req.query;
    
    let whereClause = {};
    
    // Add date filtering if provided
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.timestamp.lte = endDateTime;
      }
    }

    // Add employee filtering if provided
    if (employeeName) {
      whereClause.employeeName = employeeName;
    }

    const timeEntries = await prisma.timeEntry.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
    });
    res.json(timeEntries);
  } catch (error) {
    console.error('Error fetching time entries:', error);
    res.status(500).json({ error: 'Failed to fetch time entries' });
  }
});

// Create time entry
app.post('/api/time-entries', async (req, res) => {
  try {
    const { employeeName, type, timestamp } = req.body;
    
    if (!employeeName || !type || !timestamp) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['clock_in', 'clock_out'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be clock_in or clock_out' });
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        employeeName: employeeName.trim(),
        type,
        timestamp: new Date(timestamp),
      },
    });

    res.json({ ok: true, timeEntryId: timeEntry.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});



// Serve frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});


