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
        // Create date in local timezone and adjust for timezone offset
        // When user selects "2025-09-01", we want all sales from their local 00:00:00 to 23:59:59
        const startDateTime = new Date(startDate + 'T00:00:00.000');
        // Adjust for timezone offset to ensure we get the full local day
        const timezoneOffset = startDateTime.getTimezoneOffset() * 60000; // Convert to milliseconds
        const adjustedStartDateTime = new Date(startDateTime.getTime() - timezoneOffset);
        whereClause.createdAt.gte = adjustedStartDateTime;
        console.log('Sales API - Start Date:', { 
          startDate, 
          startDateTime, 
          timezoneOffset: timezoneOffset / 60000, // Show offset in minutes
          adjustedStartDateTime,
          startDateTimeISO: startDateTime.toISOString(),
          adjustedStartDateTimeISO: adjustedStartDateTime.toISOString()
        });
      }
      if (endDate) {
        // Create date in local timezone and adjust for timezone offset
        const endDateTime = new Date(endDate + 'T23:59:59.999');
        // Adjust for timezone offset to ensure we get the full local day
        const timezoneOffset = endDateTime.getTimezoneOffset() * 60000; // Convert to milliseconds
        const adjustedEndDateTime = new Date(endDateTime.getTime() - timezoneOffset);
        whereClause.createdAt.lte = adjustedEndDateTime;
        console.log('Sales API - End Date:', { 
          endDate, 
          endDateTime, 
          timezoneOffset: timezoneOffset / 60000, // Show offset in minutes
          adjustedEndDateTime,
          endDateTimeISO: endDateTime.toISOString(),
          adjustedEndDateTimeISO: adjustedEndDateTime.toISOString()
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
        // Use date-only comparison (start of day in local timezone)
        const startDateTime = new Date(startDate + 'T00:00:00');
        whereClause.createdAt.gte = startDateTime;
      }
      if (endDate) {
        // Use date-only comparison (end of day in local timezone)
        const endDateTime = new Date(endDate + 'T23:59:59.999');
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

    if (eloteItems.length > 0) {
      const elotePackaging = packagingMap.get('elote');
      if (!elotePackaging) {
        return res.status(400).json({ error: 'Elote packaging material not found' });
      }

      let totalEloteOuncesNeeded = 0;
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

// Get purchases history
app.get('/api/purchases', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = {};
    
    // Add date filtering if provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        // Use date-only comparison (start of day in local timezone)
        const startDateTime = new Date(startDate + 'T00:00:00');
        whereClause.createdAt.gte = startDateTime;
      }
      if (endDate) {
        // Use date-only comparison (end of day in local timezone)
        const endDateTime = new Date(endDate + 'T23:59:59.999');
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
        // Create date in local timezone without timezone conversion
        const startDateTime = new Date(startDate + 'T00:00:00.000');
        whereClause.timestamp.gte = startDateTime;
        console.log('Time Entries API - Start Date:', { 
          startDate, 
          startDateTime, 
          startDateTimeISO: startDateTime.toISOString(),
          startDateTimeLocal: startDateTime.toString()
        });
      }
      if (endDate) {
        // Create date in local timezone without timezone conversion
        const endDateTime = new Date(endDate + 'T23:59:59.999');
        whereClause.timestamp.lte = endDateTime;
        console.log('Time Entries API - End Date:', { 
          endDate, 
          endDateTime, 
          endDateTimeISO: endDateTime.toISOString(),
          endDateTimeLocal: endDateTime.toString()
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


