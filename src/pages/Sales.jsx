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
  const [bomItems, setBomItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const itemCostMap = useMemo(() => {
    const map = new Map();
    bomItems.forEach(item => {
      const total = item.bomLines.reduce((sum, l) => sum + l.costCents, 0);
      map.set(item.id, total);
    });
    return map;
  }, [bomItems]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const [salesRes, purchasesRes, bomRes] = await Promise.all([
        fetch(`/api/sales?${params.toString()}`),
        fetch(`/api/purchases?${params.toString()}`),
        fetch('/api/bom'),
      ]);
      const [salesData, purchasesData, bomData] = await Promise.all([
        salesRes.json(),
        purchasesRes.json(),
        bomRes.json(),
      ]);
      setSales(Array.isArray(salesData) ? salesData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setBomItems(Array.isArray(bomData) ? bomData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const handleDateChange = (type, value) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
  };

  const resetFilters = () => { setStartDate(''); setEndDate(''); };

  const today = new Date().toISOString().split('T')[0];

  const dailySummary = useMemo(() => {
    const dailyTotals = new Map();
    sales.forEach((sale) => {
      const date = formatDate(sale.createdAt);
      if (!dailyTotals.has(date)) {
        dailyTotals.set(date, { cash: 0, credit: 0, totalSales: 0, purchases: 0, costOfSales: 0 });
      }
      const day = dailyTotals.get(date);
      if (sale.paymentMethod === 'cash') day.cash += sale.totalCents;
      else day.credit += sale.totalCents;
      day.totalSales += 1;
      sale.items.forEach(si => {
        const bomCost = itemCostMap.get(si.itemId) || 0;
        day.costOfSales += bomCost * si.quantity;
      });
    });
    purchases.forEach((purchase) => {
      const date = formatDate(purchase.createdAt);
      if (!dailyTotals.has(date)) {
        dailyTotals.set(date, { cash: 0, credit: 0, totalSales: 0, purchases: 0, costOfSales: 0 });
      }
      dailyTotals.get(date).purchases += purchase.amountCents;
    });
    return Array.from(dailyTotals.entries())
      .map(([date, data]) => ({
        date, ...data,
        total: data.cash + data.credit,
        netCash: data.cash - data.purchases,
        grossProfit: (data.cash + data.credit) - data.costOfSales,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [sales, purchases, itemCostMap]);

  const todayStr = new Date().toLocaleDateString();
  const todayRow = dailySummary.find(d => d.date === todayStr);

  const itemSummary = useMemo(() => {
    const itemTotals = new Map();
    sales.forEach((sale) => {
      sale.items.forEach((si) => {
        const name = si.item.name;
        if (!itemTotals.has(name)) {
          itemTotals.set(name, { name, category: si.item.category, itemId: si.itemId, quantity: 0, revenue: 0 });
        }
        const d = itemTotals.get(name);
        d.quantity += si.quantity;
        d.revenue += si.lineTotalCents;
      });
    });
    return Array.from(itemTotals.values()).sort((a, b) => b.quantity - a.quantity);
  }, [sales]);

  const totalCostOfSales = dailySummary.reduce((s, d) => s + d.costOfSales, 0);
  const totalRevenue = dailySummary.reduce((s, d) => s + d.total, 0);
  const bomConfigured = bomItems.some(i => i.bomLines.length > 0);

  if (loading) return <div style={{ padding: 16 }}>Loading sales…</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Sales Reports</h3>

      {todayRow && bomConfigured && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24, padding: 16, background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', borderRadius: 10, color: 'white' }}>
          <div>
            <div style={{ fontSize: '0.75em', opacity: 0.8, marginBottom: 2 }}>TODAY’S SALES</div>
            <div style={{ fontSize: '1.5em', fontWeight: 700 }}>{centsToUSD(todayRow.total)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75em', opacity: 0.8, marginBottom: 2 }}>COST OF SALES</div>
            <div style={{ fontSize: '1.5em', fontWeight: 700 }}>{centsToUSD(todayRow.costOfSales)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75em', opacity: 0.8, marginBottom: 2 }}>GROSS PROFIT</div>
            <div style={{ fontSize: '1.5em', fontWeight: 700, color: todayRow.grossProfit >= 0 ? '#4ade80' : '#f87171' }}>{centsToUSD(todayRow.grossProfit)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75em', opacity: 0.8, marginBottom: 2 }}>TRANSACTIONS</div>
            <div style={{ fontSize: '1.5em', fontWeight: 700 }}>{todayRow.totalSales}</div>
          </div>
        </div>
      )}

     
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="startDate" style={{ fontWeight: 600, fontSize: '0.9em' }}>From:</label>
          <input id="startDate" type="date" value={startDate} onChange={(e) => handleDateChange('start', e.target.value)} max={today} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9em' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="endDate" style={{ fontWeight: 600, fontSize: '0.9em' }}>To:</label>
          <input id="endDate" type="date" value={endDate} onChange={(e) => handleDateChange('end', e.target.value)} max={today} min={startDate} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.9em' }} />
        </div>
        <button onClick={resetFilters} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9em' }}>Reset Filters</button>
        {(startDate || endDate) && (
          <div style={{ fontSize: '0.9em', color: '#059669', fontWeight: 600, backgroundColor: '#d1fae5', padding: '4px 12px', borderRadius: '6px' }}>Filtered by date range</div>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {[
            { label: 'Today', color: '#3b82f6', fn: () => { const t = new Date().toISOString().split('T')[0]; setStartDate(t); setEndDate(t); } },
            { label: 'Yesterday', color: '#8b5cf6', fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); const s = d.toISOString().split('T')[0]; setStartDate(s); setEndDate(s); } },
            { label: 'This Week', color: '#10b981', fn: () => { const n = new Date(); const s = new Date(n); s.setDate(n.getDate() - n.getDay()); const e = new Date(n); e.setDate(n.getDate() + (6 - n.getDay())); setStartDate(s.toISOString().split('T')[0]); setEndDate(e.toISOString().split('T')[0]); } },
            { label: 'This Month', color: '#f59e0b', fn: () => { const n = new Date(); setStartDate(new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0]); setEndDate(new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0]); } },
          ].map(btn => (
            <button key={btn.label} onClick={btn.fn} style={{ padding: '6px 12px', backgroundColor: btn.color, color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}>{btn.label}</button>
          ))}
        </div>
      </div>

      {(startDate || endDate) && (
        <div style={{ marginBottom: 24, padding: '16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e40af' }}>Filtered Data Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            {[
              { label: 'Date Range', value: startDate && endDate ? `${startDate} → ${endDate}` : startDate ? `From ${startDate}` : `Until ${endDate}`, color: '#1e40af' },
              { label: 'Total Sales', value: centsToUSD(totalRevenue), color: '#059669' },
              { label: 'Transactions', value: sales.length, color: '#7c3aed' },
              { label: 'Cost of Sales', value: bomConfigured ? centsToUSD(totalCostOfSales) : '—', color: '#dc2626' },
              { label: 'Gross Profit', value: bomConfigured ? centsToUSD(totalRevenue - totalCostOfSales) : '—', color: totalRevenue - totalCostOfSales >= 0 ? '#059669' : '#dc2626' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.85em', color: '#6b7280', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontWeight: 600, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #eee' }}>
        {[{ id: 'summary', label: 'Daily Summary' }, { id: 'items', label: 'Item Sales' }, { id: 'transactions', label: 'All Transactions' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '8px 16px', border: 'none', background: 'none', borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === tab.id ? '#2563eb' : '#666', fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer' }}>{tab.label}</button>
        ))}
      </div>

      {sales.length === 0 && <div style={{ opacity: 0.7 }}>No sales yet</div>}

      {activeTab === 'summary' && (
        <div>
          <h4>Daily Sales Summary</h4>
          {dailySummary.length === 0 ? <div style={{ opacity: 0.7 }}>No sales data</div> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {dailySummary.map((day) => (
                <div key={day.date} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto auto auto', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{day.date}</strong>
                      <div style={{ fontSize: '0.9em', opacity: 0.7 }}>{day.totalSales} transaction{day.totalSales !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#059669', fontSize: '0.8em' }}>Cash In</div>
                      <div>{centsToUSD(day.cash)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#7c3aed', fontSize: '0.8em' }}>Credit</div>
                      <div>{centsToUSD(day.credit)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8em' }}>Total Sales</div>
                      <div style={{ fontWeight: 700 }}>{centsToUSD(day.total)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.8em' }}>Compras</div>
                      <div>{centsToUSD(day.purchases)}</div>
                    </div>
                    {bomConfigured && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: '#f97316', fontSize: '0.8em' }}>Cost of Sales</div>
                        <div style={{ fontWeight: 600 }}>{centsToUSD(day.costOfSales)}</div>
                      </div>
                    )}
                    {bomConfigured && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 600, color: '#059669', fontSize: '0.8em' }}>Gross Profit</div>
                        <div style={{ fontWeight: 700, color: day.grossProfit >= 0 ? '#059669' : '#dc2626' }}>{centsToUSD(day.grossProfit)}</div>
                      </div>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#059669', fontSize: '0.8em' }}>Net Cash</div>
                      <div style={{ fontWeight: 700, color: day.netCash >= 0 ? '#059669' : '#dc2626' }}>{centsToUSD(day.netCash)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'items' && (
        <div>
          <h4>Item Sales Summary</h4>
          {itemSummary.length === 0 ? <div style={{ opacity: 0.7 }}>No item data</div> : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: bomConfigured ? '2fr 1fr auto auto auto' : '2fr 1fr auto auto', gap: 16, padding: '8px 16px', fontWeight: 600, borderBottom: '1px solid #eee' }}>
                <div>Item</div><div>Category</div>
                <div style={{ textAlign: 'center' }}>Qty Sold</div>
                <div style={{ textAlign: 'right' }}>Revenue</div>
                {bomConfigured && <div style={{ textAlign: 'right' }}>Cost of Sales</div>}
              </div>
              {itemSummary.map((item) => {
                const bomCostPerUnit = itemCostMap.get(item.itemId) || 0;
                const totalItemCost = bomCostPerUnit * item.quantity;
                return (
                  <div key={item.name} style={{ display: 'grid', gridTemplateColumns: bomConfigured ? '2fr 1fr auto auto auto' : '2fr 1fr auto auto', gap: 16, padding: '8px 16px', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                    <div>{item.name}</div>
                    <div style={{ opacity: 0.7 }}>{item.category}</div>
                    <div style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>{centsToUSD(item.revenue)}</div>
                    {bomConfigured && <div style={{ textAlign: 'right', color: totalItemCost > 0 ? '#f97316' : '#9ca3af' }}>{totalItemCost > 0 ? centsToUSD(totalItemCost) : '—'}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                    <div style={{ fontSize: '0.9em', opacity: 0.7 }}>Tendered: {centsToUSD(sale.amountTenderedCents)} | Change: {centsToUSD(sale.changeDueCents)}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}><strong>Total: {centsToUSD(sale.totalCents)}</strong></div>
              </div>
              <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                <strong>Items:</strong>
                <div style={{ marginTop: 8 }}>
                  {sale.items.map((si) => (
                    <div key={si.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, alignItems: 'center', padding: '4px 0' }}>
                      <div>{si.item.name}</div>
                      <div>{centsToUSD(si.unitPriceCents)}</div>
                      <div>× {si.quantity}</div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>{centsToUSD(si.lineTotalCents)}</div>
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
