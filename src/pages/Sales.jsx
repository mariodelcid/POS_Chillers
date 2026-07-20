import React, { useEffect, useState, useMemo } from 'react';

// Always use Central Time (America/Chicago) for dates
function getCTDate(date) {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}
function getTodayCT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}
function getYesterdayCT() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}
function centsToUSD(cents) {
  return '$' + (cents / 100).toFixed(2);
}
function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-US', { timeZone: 'America/Chicago' });
}
function formatDateDisplay(ctDateStr) {
  // ctDateStr is YYYY-MM-DD in CT; display nicely
  const [y, m, d] = ctDateStr.split('-');
  return m + '/' + d + '/' + y;
}

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const [salesResp, purchasesResp] = await Promise.all([
        fetch('/api/sales?' + params.toString()),
        fetch('/api/purchases?' + params.toString())
      ]);
      const [salesData, purchasesData] = await Promise.all([
        salesResp.json(), purchasesResp.json()
      ]);
      setSales(Array.isArray(salesData) ? salesData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const resetFilters = () => { setStartDate(''); setEndDate(''); };

  const today = getTodayCT();

  const dailySummary = useMemo(() => {
    const map = new Map();
    sales.forEach(sale => {
      const date = getCTDate(sale.createdAt);
      if (!map.has(date)) map.set(date, { cash: 0, credit: 0, totalSales: 0, purchases: 0 });
      const d = map.get(date);
      if (sale.paymentMethod === 'cash') d.cash += sale.totalCents;
      else d.credit += sale.totalCents;
      d.totalSales += 1;
    });
    purchases.forEach(purchase => {
      const date = getCTDate(purchase.createdAt);
      if (!map.has(date)) map.set(date, { cash: 0, credit: 0, totalSales: 0, purchases: 0 });
      map.get(date).purchases += purchase.amountCents;
    });
    return Array.from(map.entries())
      .map(([date, d]) => ({ date, ...d, total: d.cash + d.credit, netCash: d.cash - d.purchases }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sales, purchases]);

  const itemSummary = useMemo(() => {
    const map = new Map();
    sales.forEach(sale => {
      sale.items.forEach(si => {
        const name = si.item.name;
        if (!map.has(name)) map.set(name, { name, category: si.item.category, quantity: 0, revenue: 0 });
        map.get(name).quantity += si.quantity;
        map.get(name).revenue += si.lineTotalCents;
      });
    });
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [sales]);

  if (loading) return <div style={{ padding: 16 }}>Loading sales...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Sales Reports</h3>

      {/* Date Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontWeight: 600, fontSize: '0.9em' }}>From:</label>
          <input type="date" value={startDate} max={today}
            onChange={e => setStartDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9em' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontWeight: 600, fontSize: '0.9em' }}>To:</label>
          <input type="date" value={endDate} max={today} min={startDate}
            onChange={e => setEndDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.9em' }} />
        </div>
        <button onClick={resetFilters}
          style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.9em' }}>
          Reset
        </button>

        {/* Quick presets — all use Central Time */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {[
            { label: 'Today', action: () => { const t = getTodayCT(); setStartDate(t); setEndDate(t); }, color: '#3b82f6' },
            { label: 'Yesterday', action: () => { const y = getYesterdayCT(); setStartDate(y); setEndDate(y); }, color: '#8b5cf6' },
            { label: 'This Week', action: () => {
              const now = new Date();
              const day = now.getDay();
              const start = new Date(now); start.setDate(now.getDate() - day);
              const end = new Date(now); end.setDate(now.getDate() + (6 - day));
              setStartDate(start.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
              setEndDate(end.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
            }, color: '#10b981' },
            { label: 'This Month', action: () => {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1);
              const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              setStartDate(start.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
              setEndDate(end.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
            }, color: '#f59e0b' },
          ].map(({ label, action, color }) => (
            <button key={label} onClick={action}
              style={{ padding: '6px 12px', backgroundColor: color, color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8em' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtered summary banner */}
      {(startDate || endDate) && (
        <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#eff6ff', borderRadius: 8, border: '1px solid #dbeafe' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Range</div>
              <div style={{ fontWeight: 600, color: '#1e40af' }}>{startDate && endDate ? startDate + ' → ' + endDate : startDate || endDate}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Total Sales</div>
              <div style={{ fontWeight: 700, color: '#059669' }}>{centsToUSD(sales.reduce((s, x) => s + x.totalCents, 0))}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Transactions</div>
              <div style={{ fontWeight: 700, color: '#7c3aed' }}>{sales.length}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85em', color: '#6b7280' }}>Purchases</div>
              <div style={{ fontWeight: 700, color: '#dc2626' }}>{centsToUSD(purchases.reduce((s, x) => s + x.amountCents, 0))}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #eee' }}>
        {[{ id: 'summary', label: 'Daily Summary' }, { id: 'items', label: 'Item Sales' }, { id: 'transactions', label: 'All Transactions' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 16px', border: 'none', background: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === tab.id ? '#2563eb' : '#666',
            fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer'
          }}>{tab.label}</button>
        ))}
      </div>

      {sales.length === 0 && !loading && <div style={{ opacity: 0.7 }}>No sales yet for this period.</div>}

      {/* Daily Summary */}
      {activeTab === 'summary' && (
        <div>
          <h4>Daily Sales Summary (Central Time)</h4>
          {dailySummary.length === 0 ? <div style={{ opacity: 0.7 }}>No data</div> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {dailySummary.map(day => (
                <div key={day.date} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto', gap: 12, alignItems: 'center' }}>
                    <div>
                      <strong>{formatDateDisplay(day.date)}</strong>
                      <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{day.totalSales} transactions</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#059669', fontSize: '0.85em' }}>Cash</div>
                      <div>{centsToUSD(day.cash)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#7c3aed', fontSize: '0.85em' }}>Credit</div>
                      <div>{centsToUSD(day.credit)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.85em' }}>Compras</div>
                      <div>{centsToUSD(day.purchases)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85em' }}>Net Cash</div>
                      <div style={{ fontWeight: 700, color: day.netCash >= 0 ? '#059669' : '#dc2626' }}>{centsToUSD(day.netCash)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85em' }}>Total</div>
                      <div style={{ fontSize: '1.1em', fontWeight: 700 }}>{centsToUSD(day.total)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Item Sales */}
      {activeTab === 'items' && (
        <div>
          <h4>Item Sales Summary</h4>
          {itemSummary.length === 0 ? <div style={{ opacity: 0.7 }}>No data</div> : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 16, padding: '8px 16px', fontWeight: 600, borderBottom: '1px solid #eee' }}>
                <div>Item</div><div>Category</div><div style={{ textAlign: 'center' }}>Qty</div><div style={{ textAlign: 'right' }}>Revenue</div>
              </div>
              {itemSummary.map(item => (
                <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 16, padding: '8px 16px', borderBottom: '1px solid #f3f4f6' }}>
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

      {/* All Transactions */}
      {activeTab === 'transactions' && (
        <div>
          <h4>All Transactions</h4>
          {sales.map(sale => (
            <div key={sale.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 10 }}>
                <div>
                  <strong>Sale #{sale.id}</strong>
                  <div style={{ fontSize: '0.85em', opacity: 0.7 }}>{formatDateTime(sale.createdAt)}</div>
                </div>
                <div>
                  <strong>Payment: {sale.paymentMethod}</strong>
                  {sale.paymentMethod === 'cash' && (
                    <div style={{ fontSize: '0.85em', opacity: 0.7 }}>
                      Tendered: {centsToUSD(sale.amountTenderedCents)} | Change: {centsToUSD(sale.changeDueCents)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}><strong>Total: {centsToUSD(sale.totalCents)}</strong></div>
              </div>
              <div style={{ borderTop: '1px solid #eee', paddingTop: 8 }}>
                {sale.items.map(si => (
                  <div key={si.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, padding: '4px 0' }}>
                    <div>{si.item.name}</div>
                    <div>{centsToUSD(si.unitPriceCents)}</div>
                    <div>× {si.quantity}</div>
                    <div style={{ textAlign: 'right', fontWeight: 600 }}>{centsToUSD(si.lineTotalCents)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
        }
