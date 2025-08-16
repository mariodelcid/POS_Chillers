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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Function to fetch data with date filters
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const [salesResponse, purchasesResponse] = await Promise.all([
        fetch(`/api/sales?${params.toString()}`),
        fetch(`/api/purchases?${params.toString()}`)
      ]);
      
      const [salesData, purchasesData] = await Promise.all([
        salesResponse.json(),
        purchasesResponse.json()
      ]);
      
      setSales(salesData);
      setPurchases(purchasesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or date filters change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Handle date filter changes
  const handleDateChange = (type, value) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  // Reset date filters
  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Get today's date in YYYY-MM-DD format for max attribute
  const today = new Date().toISOString().split('T')[0];

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
      
      {/* Date Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24, 
        padding: '16px', 
        backgroundColor: '#f8fafc', 
        borderRadius: '8px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="startDate" style={{ fontWeight: 600, fontSize: '0.9em' }}>From:</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            max={today}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9em'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="endDate" style={{ fontWeight: 600, fontSize: '0.9em' }}>To:</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            max={today}
            min={startDate}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9em'
            }}
          />
        </div>
        
        <button
          onClick={resetFilters}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9em'
          }}
        >
          Reset Filters
        </button>
        
        {(startDate || endDate) && (
          <div style={{ 
            fontSize: '0.9em', 
            color: '#059669', 
            fontWeight: 600,
            backgroundColor: '#d1fae5',
            padding: '4px 12px',
            borderRadius: '6px'
          }}>
            Filtered by date range
          </div>
        )}
        
        {/* Quick Date Presets */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setStartDate(today);
              setEndDate(today);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            Today
          </button>
          <button
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              setStartDate(yesterdayStr);
              setEndDate(yesterdayStr);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay());
              const endOfWeek = new Date(now);
              endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
              
              setStartDate(startOfWeek.toISOString().split('T')[0]);
              setEndDate(endOfWeek.toISOString().split('T')[0]);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            This Week
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              
              setStartDate(startOfMonth.toISOString().split('T')[0]);
              setEndDate(endOfMonth.toISOString().split('T')[0]);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            This Month
          </button>
        </div>
      </div>
      
      {/* Filtered Data Summary */}
      {(startDate || endDate) && (
        <div style={{ 
          marginBottom: 24, 
          padding: '16px', 
          backgroundColor: '#eff6ff', 
          borderRadius: '8px',
          border: '1px solid #dbeafe'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e40af' }}>Filtered Data Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '4px' }}>Date Range</div>
              <div style={{ fontWeight: 600, color: '#1e40af' }}>
                {startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : `Until ${endDate}`}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '4px' }}>Total Sales</div>
              <div style={{ fontWeight: 600, color: '#059669' }}>
                {centsToUSD(sales.reduce((sum, sale) => sum + sale.totalCents, 0))}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '4px' }}>Transactions</div>
              <div style={{ fontWeight: 600, color: '#7c3aed' }}>
                {sales.length}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '4px' }}>Total Purchases</div>
              <div style={{ fontWeight: 600, color: '#dc2626' }}>
                {centsToUSD(purchases.reduce((sum, purchase) => sum + purchase.amountCents, 0))}
              </div>
            </div>
          </div>
        </div>
      )}
      
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
