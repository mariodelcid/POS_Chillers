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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Items
app.get('/api/items', async (_req, res) => {
  const items = await prisma.item.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(items);
});

app.get('/api/inventory', async (_req, res) => {
  const items = await prisma.item.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(items);
});

app.post('/api/items/bulk', async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
  const ops = items.map((it) =>
    prisma.item.upsert({
      where: { name: it.name },
      update: { category: it.category, priceCents: it.priceCents, stock: typeof it.stock === 'number' ? it.stock : undefined, imageUrl: it.imageUrl || null },
      create: { name: it.name, category: it.category, priceCents: it.priceCents, stock: typeof it.stock === 'number' ? it.stock : 0, imageUrl: it.imageUrl || null },
    })
  );
  await prisma.$transaction(ops);
  res.json({ ok: true });
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, priceCents, stock } = req.body;
  try {
    const item = await prisma.item.update({
      where: { id: parseInt(id) },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(priceCents !== undefined && { priceCents: parseInt(priceCents) }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
      },
    });
    res.json(item);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
  } catch (error) { res.status(404).json({ error: 'Packaging material not found' }); }
});

app.post('/api/packaging', async (req, res) => {
  const { name, stock } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const created = await prisma.packagingMaterial.upsert({ where: { name }, update: { stock: typeof stock === 'number' ? stock : 0 }, create: { name, stock: typeof stock === 'number' ? stock : 0 } });
    res.json(created);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClause = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate + 'T06:00:00.000Z');
      if (endDate) {
        const nextDay = new Date(endDate); nextDay.setDate(nextDay.getDate() + 1);
        whereClause.createdAt.lte = new Date(nextDay.toISOString().split('T')[0] + 'T05:59:59.999Z');
      }
    }
    const sales = await prisma.sale.findMany({ where: whereClause, include: { items: { include: { item: true } } }, orderBy: { createdAt: 'desc' } });
    res.json(sales);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch sales' }); }
});

app.get('/api/sales/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClause = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate + 'T06:00:00.000Z');
      if (endDate) {
        const nextDay = new Date(endDate); nextDay.setDate(nextDay.getDate() + 1);
        whereClause.createdAt.lte = new Date(nextDay.toISOString().split('T')[0] + 'T05:59:59.999Z');
      }
    }
    const [sales, purchases] = await Promise.all([
      prisma.sale.findMany({ where: whereClause, include: { items: { include: { item: true } } }, orderBy: { createdAt: 'desc' } }),
      prisma.purchase.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } })
    ]);
    const totalSales = sales.reduce((s, sale) => s + sale.totalCents, 0);
    const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((s, sale) => s + sale.totalCents, 0);
    const creditSales = sales.filter(s => s.paymentMethod === 'credit').reduce((s, sale) => s + sale.totalCents, 0);
    const totalPurchases = purchases.reduce((s, p) => s + p.amountCents, 0);
    const itemStats = {};
    sales.forEach(sale => { sale.items.forEach(si => { if (!itemStats[si.item.name]) itemStats[si.item.name] = { quantity: 0, revenue: 0, category: si.item.category }; itemStats[si.item.name].quantity += si.quantity; itemStats[si.item.name].revenue += si.lineTotalCents; }); });
    const topItems = Object.entries(itemStats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    res.json({ totalSales, cashSales, creditSales, totalPurchases, netCash: cashSales - totalPurchases, totalTransactions: sales.length, topItems });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch sales statistics' }); }
});

// Create sale — records all items + payment, deducts inventory via BOM
app.post('/api/sales', async (req, res) => {
  try {
    const { items, paymentMethod, amountTenderedCents } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items in sale' });
    if (!['cash', 'credit'].includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method' });

    const itemIds = items.map(i => i.itemId);
    const dbItems = await prisma.item.findMany({ where: { id: { in: itemIds } } });
    const idToItem = new Map(dbItems.map(i => [i.id, i]));

    let subtotalCents = 0;
    for (const line of items) {
      const dbItem = idToItem.get(line.itemId);
      if (!dbItem) return res.status(400).json({ error: `Item not found: ${line.itemId}` });
      subtotalCents += dbItem.priceCents * line.quantity;
    }
    const totalCents = subtotalCents;

    let changeDueCents = 0;
    if (paymentMethod === 'cash') {
      if (typeof amountTenderedCents !== 'number') return res.status(400).json({ error: 'amountTenderedCents required for cash' });
      if (amountTenderedCents < totalCents) return res.status(400).json({ error: 'Insufficient cash tendered' });
      changeDueCents = amountTenderedCents - totalCents;
    }

    // Optional: only block if elote material is configured AND out of stock
    const eloteItems = items.filter(line => { const d = idToItem.get(line.itemId); return d && (d.name === 'Elote Chico' || d.name === 'Elote Grande'); });
    let totalEloteOzNeeded = 0;
    for (const line of eloteItems) {
      const d = idToItem.get(line.itemId);
      if (d.name === 'Elote Chico') totalEloteOzNeeded += line.quantity * 8;
      else if (d.name === 'Elote Grande') totalEloteOzNeeded += line.quantity * 14;
    }
    if (totalEloteOzNeeded > 0) {
      const allPkg = await prisma.packagingMaterial.findMany();
      const elotePkg = allPkg.find(p => p.name === 'elote');
      if (elotePkg && elotePkg.stock < totalEloteOzNeeded) {
        return res.status(400).json({ error: `Insufficient elote stock. Need ${totalEloteOzNeeded} oz, have ${elotePkg.stock} oz` });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: { paymentMethod, subtotalCents, taxCents: 0, totalCents, amountTenderedCents: paymentMethod === 'cash' ? amountTenderedCents : null, changeDueCents: paymentMethod === 'cash' ? changeDueCents : null },
      });

      const packagingUsage = new Map();
      for (const line of items) {
        const dbItem = idToItem.get(line.itemId);
        await tx.saleItem.create({ data: { saleId: sale.id, itemId: dbItem.id, quantity: line.quantity, unitPriceCents: dbItem.priceCents, lineTotalCents: dbItem.priceCents * line.quantity } });
        if (dbItem.packaging) packagingUsage.set(dbItem.packaging, (packagingUsage.get(dbItem.packaging) || 0) + line.quantity);
        if (dbItem.name === 'Elote Chico') packagingUsage.set('elote', (packagingUsage.get('elote') || 0) + line.quantity * 8);
        else if (dbItem.name === 'Elote Grande') packagingUsage.set('elote', (packagingUsage.get('elote') || 0) + line.quantity * 14);
        else if (dbItem.name === 'Elote Entero') {
          packagingUsage.set('charolas', (packagingUsage.get('charolas') || 0) + line.quantity);
          packagingUsage.set('elote entero', (packagingUsage.get('elote entero') || 0) + line.quantity);
        }
      }

      for (const [pkgName, qty] of packagingUsage) {
        await tx.packagingMaterial.updateMany({ where: { name: pkgName }, data: { stock: { decrement: qty } } });
      }

      // BOM-based ingredient deduction
      const bomLines = await tx.itemBOM.findMany({ where: { itemId: { in: itemIds } } });
      const ingredientUsage = new Map();
      for (const line of items) {
        for (const bomLine of bomLines.filter(b => b.itemId === line.itemId)) {
          ingredientUsage.set(bomLine.ingredientId, (ingredientUsage.get(bomLine.ingredientId) || 0) + bomLine.quantity * line.quantity);
        }
      }
      for (const [ingredientId, qty] of ingredientUsage) {
        await tx.ingredient.update({ where: { id: ingredientId }, data: { stock: { decrement: qty } } });
      }

      return sale;
    });

    res.json({ ok: true, saleId: result.id, totalCents, changeDueCents });
  } catch (err) {
    console.error('Error in POST /api/sales:', err.message);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.put('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { totalCents, paymentMethod } = req.body;
    if (!totalCents || !paymentMethod) return res.status(400).json({ error: 'totalCents and paymentMethod are required' });
    if (!['cash', 'credit'].includes(paymentMethod)) return res.status(400).json({ error: 'Invalid payment method' });
    const updatedSale = await prisma.sale.update({ where: { id: parseInt(id) }, data: { totalCents: parseInt(totalCents), paymentMethod, subtotalCents: parseInt(totalCents), taxCents: 0 } });
    res.json({ ok: true, sale: updatedSale });
  } catch (err) { res.status(500).json({ error: err.message || 'Server error' }); }
});

app.delete('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({ where: { id: parseInt(id) }, include: { items: { include: { item: true } } } });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    const packagingReplenishment = new Map();
    for (const si of sale.items) {
      const item = si.item;
      if (item.packaging) packagingReplenishment.set(item.packaging, (packagingReplenishment.get(item.packaging) || 0) + si.quantity);
      if (item.name === 'Elote Chico') packagingReplenishment.set('elote', (packagingReplenishment.get('elote') || 0) + si.quantity * 8);
      else if (item.name === 'Elote Grande') packagingReplenishment.set('elote', (packagingReplenishment.get('elote') || 0) + si.quantity * 14);
      else if (item.name === 'Elote Entero') { packagingReplenishment.set('charolas', (packagingReplenishment.get('charolas') || 0) + si.quantity); packagingReplenishment.set('elote entero', (packagingReplenishment.get('elote entero') || 0) + si.quantity); }
    }
    await prisma.$transaction(async (tx) => {
      for (const [pkgName, qty] of packagingReplenishment) { await tx.packagingMaterial.updateMany({ where: { name: pkgName }, data: { stock: { increment: qty } } }); }
      await tx.saleItem.deleteMany({ where: { saleId: parseInt(id) } });
      await tx.sale.delete({ where: { id: parseInt(id) } });
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message || 'Server error' }); }
});

app.get('/api/purchases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let whereClause = {};
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate + 'T06:00:00.000Z');
      if (endDate) { const nextDay = new Date(endDate); nextDay.setDate(nextDay.getDate() + 1); whereClause.createdAt.lte = new Date(nextDay.toISOString().split('T')[0] + 'T05:59:59.999Z'); }
    }
    const purchases = await prisma.purchase.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } });
    res.json(purchases);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch purchases' }); }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { amountCents, description, paymentMethod } = req.body;
    if (typeof amountCents !== 'number' || amountCents <= 0) return res.status(400).json({ error: 'Invalid amount' });
    const purchase = await prisma.purchase.create({ data: { amountCents: parseInt(amountCents), description: description || 'Daily purchase', paymentMethod: paymentMethod || 'cash', receiptUrl: null } });
    res.json({ ok: true, purchaseId: purchase.id, amountCents });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/square-callback', (req, res) => {
  const { transaction_id, status, payment_id, error } = req.query;
  let paymentStatus = status || 'unknown';
  if (error) paymentStatus = 'error';
  else if (payment_id && !error) paymentStatus = 'success';
  res.redirect(`/?square_callback=1&status=${encodeURIComponent(paymentStatus)}&transaction_id=${encodeURIComponent(transaction_id || payment_id || '')}`);
});

app.get('/api/time-entries', async (req, res) => {
  try {
    const { startDate, endDate, employeeName } = req.query;
    let whereClause = {};
    if (startDate || endDate) { whereClause.timestamp = {}; if (startDate) whereClause.timestamp.gte = new Date(startDate + 'T06:00:00.000Z'); if (endDate) { const nextDay = new Date(endDate); nextDay.setDate(nextDay.getDate() + 1); whereClause.timestamp.lte = new Date(nextDay.toISOString().split('T')[0] + 'T05:59:59.999Z'); } }
    if (employeeName) whereClause.employeeName = employeeName;
    const timeEntries = await prisma.timeEntry.findMany({ where: whereClause, orderBy: { timestamp: 'desc' } });
    res.json(timeEntries);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch time entries' }); }
});

app.post('/api/time-entries', async (req, res) => {
  try {
    const { employeeName, type, timestamp } = req.body;
    if (!employeeName || !type || !timestamp) return res.status(400).json({ error: 'Missing required fields' });
    if (!['clock_in', 'clock_out'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
    const timeEntry = await prisma.timeEntry.create({ data: { employeeName: employeeName.trim(), type, timestamp: new Date(timestamp) } });
    res.json({ ok: true, timeEntryId: timeEntry.id });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/accounting', async (req, res) => {
  try { const entries = await prisma.accountingEntry.findMany({ orderBy: { date: 'desc' } }); res.json(entries); }
  catch (error) { res.status(500).json({ error: 'Failed to fetch accounting entries' }); }
});

app.post('/api/accounting', async (req, res) => {
  try {
    const { date, cashSales, creditSales, squareFees, salesTax, deposits, taxPayments } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const entry = await prisma.accountingEntry.create({ data: { date: new Date(date + 'T00:00:00.000Z'), cashSales: parseInt(cashSales)||0, creditSales: parseInt(creditSales)||0, squareFees: parseInt(squareFees)||0, salesTax: parseInt(salesTax)||0, deposits: parseInt(deposits)||0, taxPayments: parseInt(taxPayments)||0 } });
    res.json({ ok: true, entryId: entry.id });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.put('/api/accounting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, cashSales, creditSales, squareFees, salesTax, deposits, taxPayments } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    const entry = await prisma.accountingEntry.update({ where: { id: parseInt(id) }, data: { date: new Date(date + 'T00:00:00.000Z'), cashSales: parseInt(cashSales)||0, creditSales: parseInt(creditSales)||0, squareFees: parseInt(squareFees)||0, salesTax: parseInt(salesTax)||0, deposits: parseInt(deposits)||0, taxPayments: parseInt(taxPayments)||0 } });
    res.json({ ok: true, entry });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/accounting/:id', async (req, res) => {
  try { await prisma.accountingEntry.delete({ where: { id: parseInt(req.params.id) } }); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: 'Server error' }); }
});

// Ingredients
app.get('/api/ingredients', async (_req, res) => {
  try { const ingredients = await prisma.ingredient.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }); res.json(ingredients); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ingredients', async (req, res) => {
  const { name, category, unit, presentationQty, presentationUnit, stock, costCents } = req.body;
  if (!name || !category || !unit) return res.status(400).json({ error: 'name, category, and unit are required' });
  try {
    const ingredient = await prisma.ingredient.create({ data: { name, category, unit, presentationQty: parseFloat(presentationQty)||1, presentationUnit: presentationUnit||unit, stock: parseFloat(stock)||0, costCents: parseInt(costCents)||0 } });
    res.json(ingredient);
  } catch (e) { if (e.code === 'P2002') return res.status(400).json({ error: 'Ingredient name already exists' }); res.status(500).json({ error: e.message }); }
});

app.put('/api/ingredients/:id', async (req, res) => {
  const { name, category, unit, presentationQty, presentationUnit, stock, costCents } = req.body;
  try {
    const ingredient = await prisma.ingredient.update({ where: { id: parseInt(req.params.id) }, data: { ...(name !== undefined && { name }), ...(category !== undefined && { category }), ...(unit !== undefined && { unit }), ...(presentationQty !== undefined && { presentationQty: parseFloat(presentationQty) }), ...(presentationUnit !== undefined && { presentationUnit }), ...(stock !== undefined && { stock: parseFloat(stock) }), ...(costCents !== undefined && { costCents: parseInt(costCents) }) } });
    res.json(ingredient);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ingredients/:id/restock', async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity <= 0) return res.status(400).json({ error: 'quantity must be positive' });
  try {
    const ingredient = await prisma.ingredient.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!ingredient) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.ingredient.update({ where: { id: parseInt(req.params.id) }, data: { stock: { increment: parseFloat(quantity) * ingredient.presentationQty } } });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/ingredients/:id', async (req, res) => {
  try { await prisma.itemBOM.deleteMany({ where: { ingredientId: parseInt(req.params.id) } }); await prisma.ingredient.delete({ where: { id: parseInt(req.params.id) } }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// BOM
app.get('/api/bom/:itemId', async (req, res) => {
  try { const bom = await prisma.itemBOM.findMany({ where: { itemId: parseInt(req.params.itemId) }, include: { ingredient: true }, orderBy: { ingredient: { category: 'asc' } } }); res.json(bom); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bom/:itemId', async (req, res) => {
  const { ingredientId, quantity } = req.body;
  if (!ingredientId || quantity == null) return res.status(400).json({ error: 'ingredientId and quantity required' });
  try {
    const line = await prisma.itemBOM.upsert({ where: { itemId_ingredientId: { itemId: parseInt(req.params.itemId), ingredientId: parseInt(ingredientId) } }, update: { quantity: parseFloat(quantity) }, create: { itemId: parseInt(req.params.itemId), ingredientId: parseInt(ingredientId), quantity: parseFloat(quantity) }, include: { ingredient: true } });
    res.json(line);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/bom/line/:bomId', async (req, res) => {
  const { quantity } = req.body;
  if (quantity == null) return res.status(400).json({ error: 'quantity required' });
  try { const line = await prisma.itemBOM.update({ where: { id: parseInt(req.params.bomId) }, data: { quantity: parseFloat(quantity) }, include: { ingredient: true } }); res.json(line); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/bom/line/:bomId', async (req, res) => {
  try { await prisma.itemBOM.delete({ where: { id: parseInt(req.params.bomId) } }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).end();
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server listening on ${PORT}`); });
