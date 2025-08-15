import React, { useEffect, useState, useMemo } from 'react';

function centsToUSD(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString();
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'items', 'transactions'

  useEffect(() => {
    Promise.all([
      fetch('/api/sales').then(r => r.json()),
      fetch('/api/purchases').then(r => r.json())
    ])
      .then(([salesData, purchasesData]) => {
        setSales(salesData);
        setPurchases(purchasesData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Calculate daily summaries
  const dailySummary = useMemo(() => {
    const dailyTotals = new Map();
    
    // Process sales
    sales.forEach((sale) => {
      const date = formatDate(sale.createdAt);
      if (!dailyTotals.has(date)) {
        dailyTotals.set(date, { 
          cash: 0, 
          credit: 0, 
          totalSales: 0,
          purchases: 0,
          netCash: 0
        });
      }
      const dayData = dailyTotals.get(date);
      if (sale.paymentMethod === 'cash') {
        dayData.cash += sale.totalCents;
      } else {
        dayData.credit += sale.totalCents;
      }
      dayData.totalSales += 1;
    });

    // Process purchases
    purchases.forEach((purchase) => {
      const date = formatDate(purchase.createdAt);
      if (!dailyTotals.has(date)) {
        dailyTotals.set(date, { 
          cash: 0, 
          credit: 0, 
          totalSales: 0,
          purchases: 0,
          netCash: 0
        });
      }
      const dayData = dailyTotals.get(date);
      dayData.purchases += purchase.amountCents;
    });

    return Array.from(dailyTotals.entries())
      .map(([date, data]) => ({ 
        date, 
        ...data, 
        total: data.cash + data.credit,
        netCash: data.cash - data.purchases
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, purchases]);

  // Calculate item summaries
  const itemSummary = useMemo(() => {
    const itemTotals = new Map();
    
    sales.forEach((sale) => {
      sale.items.forEach((saleItem) => {
        const itemName = saleItem.item.name;
        if (!itemTotals.has(itemName)) {
          itemTotals.set(itemName, { 
            name: itemName, 
            category: saleItem.item.category,
            quantity: 0, 
            revenue: 0 
          });
        }
        const itemData = itemTotals.get(itemName);
        itemData.quantity += saleItem.quantity;
        itemData.revenue += saleItem.lineTotalCents;
      });
    });

    return Array.from(itemTotals.values())
      .sort((a, b) => b.quantity - a.quantity);
  }, [sales]);

  if (loading) return <div style={{ padding: 16 }}>Loading sales...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Sales Reports</h3>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #eee' }}>
        {[
          { id: 'summary', label: 'Daily Summary' },
          { id: 'items', label: 'Item Sales' },
          { id: 'transactions', label: 'All Transactions' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab.id ? '#2563eb' : '#666',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sales.length === 0 && <div style={{ opacity: 0.7 }}>No sales yet</div>}

      {/* Daily Summary Tab */}
      {activeTab === 'summary' && (
        <div>
          <h4>Daily Sales Summary</h4>
          {dailySummary.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No sales data</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {dailySummary.map((day) => (
                <div key={day.date} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto auto', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{day.date}</strong>
                      <div style={{ fontSize: '0.9em', opacity: 0.7 }}>{day.totalSales} transactions</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#059669' }}>Cash In</div>
                      <div>{centsToUSD(day.cash)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#dc2626' }}>Compras</div>
                      <div>{centsToUSD(day.purchases)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#059669' }}>Net Cash</div>
                      <div style={{ 
                        color: day.netCash >= 0 ? '#059669' : '#dc2626',
                        fontWeight: '700'
                      }}>{centsToUSD(day.netCash)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#7c3aed' }}>Credit</div>
                      <div>{centsToUSD(day.credit)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>Total Sales</div>
                      <div style={{ fontSize: '1.1em', fontWeight: 700 }}>{centsToUSD(day.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Item Sales Tab */}
      {activeTab === 'items' && (
        <div>
          <h4>Item Sales Summary</h4>
          {itemSummary.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No item data</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 16, padding: '8px 16px', fontWeight: 600, borderBottom: '1px solid #eee' }}>
                <div>Item</div>
                <div>Category</div>
                <div style={{ textAlign: 'center' }}>Qty Sold</div>
                <div style={{ textAlign: 'right' }}>Revenue</div>
              </div>
              {itemSummary.map((item) => (
                <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 16, padding: '8px 16px', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                  <div>{item.name}</div>
                  <div style={{ opacity: 0.7 }}>{item.category}</div>
                  <div style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>{centsToUSD(item.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Transactions Tab */}
      {activeTab === 'transactions' && (
        <div>
          <h4>All Transactions</h4>
          {sales.map((sale) => (
            <div key={sale.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 12 }}>
                <div>
                  <strong>Sale #{sale.id}</strong>
                  <div style={{ fontSize: '0.9em', opacity: 0.7 }}>{formatDateTime(sale.createdAt)}</div>
                </div>
                <div>
                  <strong>Payment: {sale.paymentMethod}</strong>
                  {sale.paymentMethod === 'cash' && (
                    <div style={{ fontSize: '0.9em', opacity: 0.7 }}>
                      Tendered: {centsToUSD(sale.amountTenderedCents)} | Change: {centsToUSD(sale.changeDueCents)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Total: {centsToUSD(sale.totalCents)}</strong>
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                <strong>Items:</strong>
                <div style={{ marginTop: 8 }}>
                  {sale.items.map((saleItem) => (
                    <div key={saleItem.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                      <div>{saleItem.item.name}</div>
                      <div>{centsToUSD(saleItem.unitPriceCents)}</div>
                      <div>× {saleItem.quantity}</div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>{centsToUSD(saleItem.lineTotalCents)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
