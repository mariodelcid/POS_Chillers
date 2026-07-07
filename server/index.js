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
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Items (menu)
app.get('/api/items', async (_req, res) => {
  const items = await prisma.item.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(items);
});

app.post('/api/items/bulk', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
  const ops = items.map(it => prisma.item.upsert({
    where: { name: it.name },
    update: { category: it.category, priceCents: it.priceCents, stock: typeof it.stock === 'number' ? it.stock : undefined, imageUrl: it.imageUrl || null },
    create: { name: it.name, category: it.category, priceCents: it.priceCents, stock: typeof it.stock === 'number' ? it.stock : 0, imageUrl: it.imageUrl || null },
  }));
  await prisma.$transaction(ops);
  res.json({ ok: true });
});

// Inventory items (ingredients/packaging/disposables)
app.get('/api/inventory-items', async (_req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json(items);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory-items', async (req, res) => {
  try {
    const { name, category, presentation, unit, unitsPurchased, costCents, salesTax } = req.body;
    const item = await prisma.inventoryItem.upsert({
      where: { name },
      update: { category, presentation, unit, unitsPurchased, costCents, salesTax },
      create: { name, category: category || 'ingredient', presentation: presentation || unit || 'each', unit: unit || 'each', unitsPurchased: unitsPurchased || 1, costCents: costCents || 0, salesTax: salesTax || false },
    });
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update stock for an inventory item
app.patch('/api/inventory-items/:id/stock', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { add } = req.body; // positive = add stock, negative = remove
    if (typeof add !== 'number') return res.status(400).json({ error: 'add must be a number' });
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { stock: { increment: add } },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Packaging materials
app.get('/api/packaging', async (_req, res) => {
  const packaging = await prisma.packagingMaterial.findMany({ orderBy: { name: 'asc' } });
  res.json(packaging);
});

app.put('/api/packaging/:id', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;
  if (typeof stock !== 'number' || stock < 0) return res.status(400).json({ error: 'Invalid stock value' });
  try {
    const updated = await prisma.packagingMaterial.update({ where: { id: parseInt(id) }, data: { stock } });
    res.json(updated);
  } catch { res.status(404).json({ error: 'Not found' }); }
});

// Sales
app.get('/api/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.createdAt.lte = e; }
    }
    const sales = await prisma.sale.findMany({ where, include: { items: { include: { item: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(sales);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch sales' }); }
});

app.get('/api/sales/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.createdAt.lte = e; }
    }
    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({ where, include: { items: { include: { item: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.purchase.findMany({ where, orderBy: { createdAt: 'desc' } }),
    ]);
    const totalSales = sales.reduce((s, x) => s + x.totalCents, 0);
    const cashSales = sales.filter(x => x.paymentMethod === 'cash').reduce((s, x) => s + x.totalCents, 0);
    const creditSales = sales.filter(x => x.paymentMethod === 'credit').reduce((s, x) => s + x.totalCents, 0);
    const totalPurchases = purchases.reduce((s, x) => s + x.amountCents, 0);
    const itemStats = {};
    sales.forEach(sale => sale.items.forEach(si => {
      const n = si.item.name;
      if (!itemStats[n]) itemStats[n] = { quantity: 0, revenue: 0, category: si.item.category };
      itemStats[n].quantity += si.quantity;
      itemStats[n].revenue += si.lineTotalCents;
    }));
    const topItems = Object.entries(itemStats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    res.json({ summary: { totalSales, cashSales, creditSales, totalPurchases, netCash: cashSales - totalPurchases, totalTransactions: sales.length }, topItems, sales, purchases });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { items, paymentMethod, amountTenderedCents } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });
    if (!['cash', 'credit'].includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method' });
    const dbItems = await prisma.item.findMany({ where: { id: { in: items.map(i => i.itemId) } } });
    const idToItem = new Map(dbItems.map(i => [i.id, i]));
    let subtotalCents = 0;
    for (const line of items) {
      const dbItem = idToItem.get(line.itemId);
      if (!dbItem) return res.status(400).json({ error: 'Item not found' });
      subtotalCents += dbItem.priceCents * line.quantity;
    }
    const totalCents = subtotalCents;
    let changeDueCents = 0;
    if (paymentMethod === 'cash') {
      if (typeof amountTenderedCents !== 'number') return res.status(400).json({ error: 'amountTenderedCents required' });
      if (amountTenderedCents < totalCents) return res.status(400).json({ error: 'Insufficient cash' });
      changeDueCents = amountTenderedCents - totalCents;
    }
    const result = await prisma.$transaction(async tx => {
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
  } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// Purchases
app.get('/api/purchases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); where.createdAt.lte = e; }
    }
    const purchases = await prisma.purchase.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(purchases);
  } catch (e) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { amountCents, description } = req.body;
    if (typeof amountCents !== 'number' || amountCents <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const purchase = await prisma.purchase.create({ data: { amountCents, description: description || 'Daily purchase' } });
    res.json({ ok: true, purchaseId: purchase.id });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// Clock
app.post('/api/clock', async (req, res) => {
  try {
    const { action } = req.body;
    if (!['in', 'out'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    const entry = await prisma.clockEntry.create({ data: { action } });
    res.json({ ok: true, entry });
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/clock', async (_req, res) => {
  try {
    const entries = await prisma.clockEntry.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    res.json(entries);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
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
app.listen(PORT, () => console.log('Server listening on ' + PORT));
