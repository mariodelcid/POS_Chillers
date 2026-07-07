import React, { useState, useEffect, useMemo } from 'react';

const CAT_COLOR = { ingredient: '#059669', Packaging: '#2563eb', disposables: '#7c3aed' };
const CAT_LABEL = { ingredient: 'Ingredients', Packaging: 'Packaging', disposables: 'Disposables' };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState({});
  const [saving, setSaving] = useState(null);

  const loadItems = () => {
    fetch('/api/ingredients')
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadItems(); }, []);

  const filtered = useMemo(() => {
    let list = filterCat === 'all' ? items : items.filter(i => i.category === filterCat);
    if (search.trim()) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, filterCat, search]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(i => {
      const c = i.category || 'ingredient';
      if (!map[c]) map[c] = [];
      map[c].push(i);
    });
    return map;
  }, [filtered]);

  const categoryOrder = filterCat === 'all' ? ['ingredient', 'Packaging', 'disposables'] : [filterCat];

  const handleAddStock = async (item) => {
    const amt = parseFloat(adding[item.id]);
    if (!amt || isNaN(amt)) return;
    setSaving(item.id);
    try {
      await fetch('/api/ingredients/' + item.id + '/restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: amt }),
      });
      setAdding(a => ({ ...a, [item.id]: '' }));
      loadItems();
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading inventory...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px 0' }}>Inventory</h2>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 20 }}>
        Track stock levels. Enter an amount and click + to add to stock.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['all', 'All'], ['ingredient', 'Ingredients'], ['Packaging', 'Packaging'], ['disposables', 'Disposables']].map(([val, label]) => (
          <button key={val} onClick={() => setFilterCat(val)} style={{
            padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 20, cursor: 'pointer',
            fontSize: '0.85em', fontWeight: filterCat === val ? 700 : 400,
            background: filterCat === val ? '#1e293b' : 'white',
            color: filterCat === val ? 'white' : '#374151'
          }}>
            {label}
          </button>
        ))}
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 20, fontSize: '0.85em', marginLeft: 'auto', width: 180 }} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No items found.</div>
      ) : (
        categoryOrder.filter(cat => grouped[cat]?.length > 0).map(cat => (
          <div key={cat} style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
              padding: '8px 14px', background: (CAT_COLOR[cat] || '#374151') + '15',
              borderLeft: `4px solid ${CAT_COLOR[cat] || '#374151'}`, borderRadius: '0 6px 6px 0'
            }}>
              <span style={{ fontWeight: 700, color: CAT_COLOR[cat] || '#374151', fontSize: '0.95em' }}>{CAT_LABEL[cat] || cat}</span>
              <span style={{ fontSize: '0.8em', color: '#6b7280' }}>({grouped[cat].length} items)</span>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 80px 100px 180px',
              gap: 12, padding: '8px 14px', fontWeight: 700, fontSize: '0.78em',
              color: '#374151', borderBottom: '2px solid #e5e7eb', background: '#f8fafc', borderRadius: '6px 6px 0 0'
            }}>
              <div>Name</div><div>Unit</div><div style={{ textAlign: 'center' }}>In Stock</div><div>Add to Stock</div>
            </div>

            {grouped[cat].map((item, idx) => (
              <div key={item.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 80px 100px 180px',
                gap: 12, padding: '10px 14px', alignItems: 'center',
                borderBottom: '1px solid #f3f4f6',
                background: idx % 2 === 0 ? 'white' : '#fafafa'
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.92em' }}>{item.name}</div>
                <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{item.unit}</div>
                <div style={{
                  textAlign: 'center', fontWeight: 700, fontSize: '1em',
                  color: (item.stock || 0) <= 0 ? '#dc2626' : (item.stock || 0) < 5 ? '#f59e0b' : '#059669'
                }}>
                  {(item.stock || 0) % 1 === 0 ? (item.stock || 0) : (item.stock || 0).toFixed(2)}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number" min="0" step="any" placeholder="qty"
                    value={adding[item.id] || ''}
                    onChange={e => setAdding(a => ({ ...a, [item.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddStock(item)}
                    style={{ width: 70, padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.85em' }}
                  />
                  <button
                    onClick={() => handleAddStock(item)}
                    disabled={saving === item.id || !adding[item.id]}
                    style={{
                      padding: '5px 12px', background: '#059669', color: 'white',
                      border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '0.85em',
                      opacity: saving === item.id ? 0.6 : 1
                    }}
                  >
                    {saving === item.id ? '...' : '+'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 20px',
          background: '#1e293b', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: '0.92em' }}>
          <span>Total Items: {filtered.length}</span>
        </div>
      )}
    </div>
  );
}
