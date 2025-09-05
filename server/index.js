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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test endpoint to debug server issues
app.get('/api/test', (req, res) => {
  try {
    res.json({ 
      message: 'Server is working',
      timestamp: new Date().toISOString(),
      prismaStatus: 'Prisma client initialized'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Test failed',
      details: error.message 
    });
  }
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
        // Force UTC-6 (America/Chicago) timezone conversion
        // When user selects "2025-09-01", we need to cover their local 00:00:00 to 23:59:59
        // In UTC-6, 00:00:00 local = 06:00:00 UTC
        
        // Create the start of the selected date in UTC-6
        const utcStartDate = new Date(startDate + 'T06:00:00.000Z');
        
        whereClause.createdAt.gte = utcStartDate;
        
        console.log('Sales API - Date Conversion (UTC-6):', { 
          startDate,
          utcStartDate: utcStartDate.toString(),
          utcStartDateISO: utcStartDate.toISOString()
        });
      }
      if (endDate) {
        // Force UTC-6 (America/Chicago) timezone conversion
        // When user selects "2025-09-01", we need to cover their local 23:59:59
        // In UTC-6, 23:59:59 local = 05:59:59 UTC (next day)
        
        // Create the end of the selected date in UTC-6
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const utcEndDate = new Date(nextDay.toISOString().split('T')[0] + 'T05:59:59.999Z');
        
        whereClause.createdAt.lte = utcEndDate;
        
        console.log('Sales API - Date Conversion (UTC-6):', { 
          endDate,
          utcEndDate: utcEndDate.toString(),
          utcEndDateISO: utcEndDate.toISOString()
        });
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
    
    console.log('Sales API - Query result:', { 
      startDate, 
      endDate, 
      whereClause, 
      salesCount: sales.length,
      firstSale: sales[0] ? sales[0].createdAt : null,
      lastSale: sales[sales.length - 1] ? sales[sales.length - 1].createdAt : null
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
        // Force UTC-6 (America/Chicago) timezone conversion
        // When user selects "2025-09-01", we need to cover their local 00:00:00 to 23:59:59
        // In UTC-6, 00:00:00 local = 06:00:00 UTC
        const utcStartDate = new Date(startDate + 'T06:00:00.000Z');
        whereClause.createdAt.gte = utcStartDate;
      }
      if (endDate) {
        // Force UTC-6 (America/Chicago) timezone conversion
        // When user selects "2025-09-01", we need to cover their local 23:59:59
        // In UTC-6, 23:59:59 local = 05:59:59 UTC (next day)
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const utcEndDate = new Date(nextDay.toISOString().split('T')[0] + 'T05:59:59.999Z');
        whereClause.createdAt.lte = utcEndDate;
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
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      totalSales,
      cashSales,
      creditSales,
      totalPurchases,
      netCash,
      totalTransactions,
      topItems
    });
  } catch (error) {
    console.error('Error fetching sales statistics:', error);
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
      // Note: We don't check item.stock here because we check packaging materials instead
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

    // Check if we have enough packaging materials before proceeding
    const packagingMaterials = await prisma.packagingMaterial.findMany();
    const packagingMap = new Map(packagingMaterials.map(p => [p.name, p]));

    // Check elote packaging (ounces)
    const eloteItems = items.filter(line => {
      const dbItem = idToItem.get(line.itemId);
      return dbItem && (dbItem.name === 'Elote Chico' || dbItem.name === 'Elote Grande');
    });

    let totalEloteOuncesNeeded = 0;
    if (eloteItems.length > 0) {
      const elotePackaging = packagingMap.get('elote');
      if (!elotePackaging) {
        return res.status(400).json({ error: 'Elote packaging material not found' });
      }

      for (const line of eloteItems) {
        const dbItem = idToItem.get(line.itemId);
        if (dbItem.name === 'Elote Chico') {
          totalEloteOuncesNeeded += line.quantity * 8; // 8 oz per elote chico
        } else if (dbItem.name === 'Elote Grande') {
          totalEloteOuncesNeeded += line.quantity * 14; // 14 oz per elote grande
        }
      }

      if (elotePackaging.stock < totalEloteOuncesNeeded) {
        return res.status(400).json({ error: `Insufficient elote stock. Need ${totalEloteOuncesNeeded} oz, have ${elotePackaging.stock} oz` });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Re-check stock levels inside transaction to prevent race conditions
      const txPackagingMaterials = await tx.packagingMaterial.findMany();
      const txPackagingMap = new Map(txPackagingMaterials.map(p => [p.name, p]));

      // Double-check elote stock inside transaction
      if (eloteItems.length > 0) {
        const txElotePackaging = txPackagingMap.get('elote');
        if (!txElotePackaging || txElotePackaging.stock < totalEloteOuncesNeeded) {
          throw new Error(`Insufficient elote stock. Need ${totalEloteOuncesNeeded} oz, have ${txElotePackaging?.stock || 0} oz`);
        }
      }

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
        
        // Note: We don't decrement item.stock here because we only manage packaging materials

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
        } else if (dbItem.name === 'Elote Entero') {
          // Elote Entero deducts from both charolas and elote entero
          const currentCharolas = packagingUsage.get('charolas') || 0;
          packagingUsage.set('charolas', currentCharolas + line.quantity);
          
          const currentEloteEntero = packagingUsage.get('elote entero') || 0;
          packagingUsage.set('elote entero', currentEloteEntero + line.quantity);
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
    console.error('❌ Error in /api/sales POST:', err);
    console.error('❌ Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    res.status(500).json({ 
      error: err.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Update sale
app.put('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { totalCents, paymentMethod } = req.body;
    
    if (!totalCents || !paymentMethod) {
      return res.status(400).json({ error: 'totalCents and paymentMethod are required' });
    }
    
    if (!['cash', 'credit'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    
    const updatedSale = await prisma.sale.update({
      where: { id: parseInt(id) },
      data: {
        totalCents: parseInt(totalCents),
        paymentMethod,
        subtotalCents: parseInt(totalCents), // Assuming no tax for simplicity
        taxCents: 0
      }
    });
    
    res.json({ ok: true, sale: updatedSale });
  } catch (err) {
    console.error('❌ Error updating sale:', err);
    res.status(500).json({ 
      error: err.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Delete sale
app.delete('/api/sales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete related sale items
    await prisma.saleItem.deleteMany({
      where: { saleId: parseInt(id) }
    });
    
    // Then delete the sale
    await prisma.sale.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error deleting sale:', err);
    res.status(500).json({ 
      error: err.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
        // Force UTC-6 (America/Chicago) timezone conversion
        // When user selects "2025-09-01", we need to cover their local 00:00:00 to 23:59:59
        // In UTC-6, 00:00:00 local = 06:00:00 UTC
        const utcStartDate = new Date(startDate + 'T06:00:00.000Z');
        whereClause.createdAt.gte = utcStartDate;
      }
      if (endDate) {
        // Force UTC-6 (America/Chicago) timezone conversion
        // When user selects "2025-09-01", we need to cover their local 23:59:59
        // In UTC-6, 23:59:59 local = 05:59:59 UTC (next day)
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const utcEndDate = new Date(nextDay.toISOString().split('T')[0] + 'T05:59:59.999Z');
        whereClause.createdAt.lte = utcEndDate;
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
    const { amountCents, description, paymentMethod } = req.body;
    if (typeof amountCents !== 'number' || amountCents <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!['cash', 'card'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    const purchase = await prisma.purchase.create({
      data: {
        amountCents: parseInt(amountCents),
        description: description || 'Daily purchase',
        paymentMethod: paymentMethod || 'cash',
        receiptUrl: null, // File upload disabled for now
      },
    });

    res.json({ ok: true, purchaseId: purchase.id, amountCents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Square payment endpoint
app.post('/api/square-payment', async (req, res) => {
  try {
    const { amountCents, sourceId, idempotencyKey } = req.body;
    
    if (!amountCents || !sourceId || !idempotencyKey) {
      return res.status(400).json({ error: 'Amount, source ID, and idempotency key are required' });
    }
    
    // Convert cents to dollars for Square API
    const amount = Math.round(amountCents / 100);
    
    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: idempotencyKey,
      amountMoney: {
        amount: amount,
        currency: 'USD'
      },
      locationId: process.env.SQUARE_LOCATION_ID
    };
    
    // Call Square API directly using fetch
    const response = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Square-Version': '2024-12-18',
        'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentRequest)
    });
    
    const result = await response.json();
    
    if (response.ok && result.payment && result.payment.status === 'COMPLETED') {
      res.json({ 
        success: true, 
        paymentId: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amountMoney.amount
      });
    } else {
      console.error('Square API error:', result);
      res.status(400).json({ 
        success: false, 
        error: 'Payment failed', 
        details: result.errors || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Square payment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Payment processing failed',
      details: error.message 
    });
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
        // Force UTC-6 (America/Chicago) timezone conversion
        // When user selects "2025-09-01", we need to cover their local 00:00:00 to 23:59:59
        // In UTC-6, 00:00:00 local = 06:00:00 UTC
        const utcStartDate = new Date(startDate + 'T06:00:00.000Z');
        whereClause.timestamp.gte = utcStartDate;
        console.log('Time Entries API - Start Date (UTC-6):', { 
          startDate, 
          utcStartDate, 
          utcStartDateISO: utcStartDate.toISOString()
        });
      }
      if (endDate) {
        // Force UTC-6 (America/Chicago) timezone conversion
        // When user selects "2025-09-01", we need to cover their local 23:59:59
        // In UTC-6, 23:59:59 local = 05:59:59 UTC (next day)
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const utcEndDate = new Date(nextDay.toISOString().split('T')[0] + 'T05:59:59.999Z');
        whereClause.timestamp.lte = utcEndDate;
        console.log('Time Entries API - End Date (UTC-6):', { 
          endDate, 
          utcEndDate, 
          utcEndDateISO: utcEndDate.toISOString()
        });
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

// Get accounting entries
app.get('/api/accounting', async (req, res) => {
  try {
    const entries = await prisma.accountingEntry.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(entries);
  } catch (error) {
    console.error('Error fetching accounting entries:', error);
    res.status(500).json({ error: 'Failed to fetch accounting entries' });
  }
});

// Create accounting entry
app.post('/api/accounting', async (req, res) => {
  try {
    const { date, cashSales, creditSales, squareFees, salesTax, deposits, taxPayments } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Convert date to start of day in local timezone
    const entryDate = new Date(date + 'T00:00:00.000Z');
    
    const entry = await prisma.accountingEntry.create({
      data: {
        date: entryDate,
        cashSales: parseInt(cashSales) || 0,
        creditSales: parseInt(creditSales) || 0,
        squareFees: parseInt(squareFees) || 0,
        salesTax: parseInt(salesTax) || 0,
        deposits: parseInt(deposits) || 0,
        taxPayments: parseInt(taxPayments) || 0,
      },
    });

    res.json({ ok: true, entryId: entry.id });
  } catch (err) {
    console.error('Error creating accounting entry:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update accounting entry
app.put('/api/accounting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, cashSales, creditSales, squareFees, salesTax, deposits, taxPayments } = req.body;
    
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Convert date to start of day in local timezone
    const entryDate = new Date(date + 'T00:00:00.000Z');
    
    const entry = await prisma.accountingEntry.update({
      where: { id: parseInt(id) },
      data: {
        date: entryDate,
        cashSales: parseInt(cashSales) || 0,
        creditSales: parseInt(creditSales) || 0,
        squareFees: parseInt(squareFees) || 0,
        salesTax: parseInt(salesTax) || 0,
        deposits: parseInt(deposits) || 0,
        taxPayments: parseInt(taxPayments) || 0,
      },
    });

    res.json({ ok: true, entry });
  } catch (err) {
    console.error('Error updating accounting entry:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete accounting entry
app.delete('/api/accounting/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.accountingEntry.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting accounting entry:', err);
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


