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

// ── Bill of Materials ─────────────────────────────────────────────────────────────────────────────

// Get all items with their BOM lines
app.get('/api/bom', async (_req, res) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: { bomLines: true },
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching BOM:', error);
    res.status(500).json({ error: 'Failed to fetch BOM data' });
  }
});

// Create a BOM line
app.post('/api/bom', async (req, res) => {
  try {
    const { itemId, ingredient, costCents, type } = req.body;
    if (!itemId || !ingredient || typeof costCents !== 'number' || costCents < 0) {
      return res.status(400).json({ error: 'Invalid BOM line data' });
    }
    const bomLine = await prisma.bomLine.create({
      data: { itemId: parseInt(itemId), ingredient: ingredient.trim(), costCents, type: type || 'ingredient' },
    });
    res.json(bomLine);
  } catch (error) {
    console.error('Error creating BOM line:', error);
    res.status(500).json({ error: 'Failed to create BOM line' });
  }
});

// Update a BOM line
app.put('/api/bom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ingredient, costCents, type } = req.body;
    if (!ingredient || typeof costCents !== 'number' || costCents < 0) {
      return res.status(400).json({ error: 'Invalid BOM line data' });
    }
    const bomLine = await prisma.bomLine.update({
      where: { id: parseInt(id) },
      data: { ingredient: ingredient.trim(), costCents, ...(type && { type }) },
    });
    res.json(bomLine);
  } catch (error) {
    console.error('Error updating BOM line:', error);
    res.status(500).json({ error: 'Failed to update BOM line' });
  }
});

// Delete a BOM line
app.delete('/api/bom/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.bomLine.delete({ where: { id: parseInt(id) } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting BOM line:', error);
    res.status(500).json({ error: 'Failed to delete BOM line' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────

// Get sales history
app.get('/api/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClause = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateTime;
      }
    }
    const sales = await prisma.sale.findMany({
      where: whereClause,
      include: { items: { include: { item: true } } },
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
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.createdAt.lte = endDateTime;
      }
    }
    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({ where: whereClause, include: { items: { include: { item: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.purchase.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } })
    ]);
    const totalSales = sales.reduce((sum, s) => sum + s.totalCents, 0);
    const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalCents, 0);
    const creditSales = sales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + s.totalCents, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.amountCents, 0);
    const itemStats = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const n = item.item.name;
        if (!itemStats[n]) itemStats[n] = { quantity: 0, revenue: 0, category: item.item.category };
        itemStats[n].quantity += item.quantity;
        itemStats[n].revenue += item.lineTotalCents;
      });
    });
    const topItems = Object.entries(itemStats).map(([name, s]) => ({ name, ...s })).sort((a,b) => b.quantity - a.quantity).slice(0,10);
    res.json({ summary: { totalSales, cashSales, creditSales, totalPurchases, netCash: cashSales - totalPurchases, totalTransactions: sales.length }, topItems, sales, purchases });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ error: 'Failed to fetch sales statistics' });
  }
});

// Create sale
app.post('/api/sales', async (req, res) => {
  try {
    const { items, paymentMethod, amountTenderedCents } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items in sale' });
    if (!['cash', 'credit'].includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method' });
    const dbItems = await prisma.item.findMany({ where: { id: { in: items.map(i => i.itemId) } } });
    const idToItem = new Map(dbItems.map(i => [i.id, i]));
    let subtotalCents = 0;
    for (const line of items) {
      const dbItem = idToItem.get(line.itemId);
      if (!dbItem) return res.status(400).json({ error: `Item not found: ${line.itemId}` });
      if (dbItem.stock < line.quantity) return res.status(400).json({ error: `Insufficient stock for ${dbItem.name}` });
      subtotalCents += dbItem.priceCents * line.quantity;
    }
    const totalCents = subtotalCents;
    let changeDueCents = 0;
    if (paymentMethod === 'cash') {
      if (typeof amountTenderedCents !== 'number') return res.status(400).json({ error: 'amountTenderedCents required for cash' });
      if (amountTenderedCents < totalCents) return res.status(400).json({ error: 'Insufficient cash tendered' });
      changeDueCents = amountTenderedCents - totalCents;
    }
    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({ data: { paymentMethod, subtotalCents, taxCents: 0, totalCents, amountTenderedCents: paymentMethod === 'cash' ? amountTenderedCents : null, changeDueCents: paymentMethod === 'cash' ? changeDueCents : null } });
      const packagingUsage = new Map();
      for (const line of items) {
        const dbItem = idToItem.get(line.itemId);
        await tx.saleItem.create({ data: { saleId: sale.id, itemId: dbItem.id, quantity: line.quantity, unitPriceCents: dbItem.priceCents, lineTotalCents: dbItem.priceCents * line.quantity } });
        await tx.item.update({ where: { id: dbItem.id }, data: { stock: { decrement: line.quantity } } });
        if (dbItem.packaging) packagingUsage.set(dbItem.packaging, (packagingUsage.get(dbItem.packaging) || 0) + line.quantity);
      }
      for (const [name, qty] of packagingUsage) await tx.packagingMaterial.updateMany({ where: { name }, data: { stock: { decrement: qty } } });
      return sale;
    });
    res.json({ ok: true, saleId: result.id, totalCents, changeDueCents });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// Get purchases history
app.get('/api/purchases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClause = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); whereClause.createdAt.lte = e; }
    }
    const purchases = await prisma.purchase.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } });
    res.json(purchases);
  } catch (error) { console.error('Error fetching purchases:', error); res.status(500).json({ error: 'Failed to fetch purchases' }); }
});

// Create purchase
app.post('/api/purchases', async (req, res) => {
  try {
    const { amountCents, description } = req.body;
    if (typeof amountCents !== 'number' || amountCents <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const purchase = await prisma.purchase.create({ data: { amountCents, description: description || 'Daily purchase' } });
    res.json({ ok: true, purchaseId: purchase.id, amountCents });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
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

// ==================
// INVENTORY ITEMS
// ==================
app.get('/api/inventory-items', async (_req, res) => {
  try {
    const { category } = _req.query;
    const where = category ? { category } : {};
    const items = await prisma.inventoryItem.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory-items', async (req, res) => {
  try {
    const { name, category, presentation, unit, unitsPurchased, costCents, salesTax } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        category,
        presentation: presentation || '',
        unit: unit || 'each',
        unitsPurchased: parseFloat(unitsPurchased) || 1,
        costCents: parseInt(costCents) || 0,
        salesTax: salesTax === true || salesTax === 'true',
      },
    });
    res.status(201).json(item);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'An item with that name already exists' });
    console.error('Error creating inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventory-items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, presentation, unit, unitsPurchased, costCents, salesTax } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(presentation !== undefined && { presentation }),
        ...(unit !== undefined && { unit }),
        ...(unitsPurchased !== undefined && { unitsPurchased: parseFloat(unitsPurchased) }),
        ...(costCents !== undefined && { costCents: parseInt(costCents) }),
        ...(salesTax !== undefined && { salesTax: salesTax === true || salesTax === 'true' }),
      },
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventory-items/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.inventoryItem.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => { console.log(`Server listening on ${PORT}`); });
