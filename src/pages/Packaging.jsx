import React, { useState, useEffect, useMemo } from 'react';

const CAT_COLOR = { ingredient: '#059669', packaging: '#2563eb', disposable: '#7c3aed' };
const CAT_LABEL = { ingredient: 'Ingredient', packaging: 'Packaging', disposable: 'Disposable' };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/inventory-items')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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

  const categoryOrder = filterCat === 'all' ? ['ingredient', 'packaging', 'disposable'] : [filterCat];

  if (loading) return <div style={{ padding: 24 }}>Loading inventory...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 4px 0' }}>Inventory</h2>
      <p style={{ color: '#6b7280', marginTop: 0, marginBottom: 20 }}>
        All ingredients, packaging, and disposables. Add or edit items in the <strong>Edit</strong> page. Cost per unit = Cost ÷ Units Purchased.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'ingredient', 'packaging', 'disposable'].map(c => (
          <button key={c} onClick={() => setFilterCat(c)} style={{
            padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 20, cursor: 'pointer',
            fontSize: '0.85em', fontWeight: filterCat === c ? 700 : 400,
            background: filterCat === c ? '#1e293b' : 'white',
            color: filterCat === c ? 'white' : '#374151'
          }}>
            {c === 'all' ? 'All' : CAT_LABEL[c]}
          </button>
        ))}
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 20, fontSize: '0.85em', marginLeft: 'auto', width: 180 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
          No items found. Add ingredients in the <strong>Edit</strong> page.
        </div>
      ) : (
        categoryOrder.filter(cat => grouped[cat] && grouped[cat].length > 0).map(cat => (
          <div key={cat} style={{ marginBottom: 32 }}>
            {/* Category header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
              padding: '8px 14px', background: (CAT_COLOR[cat] || '#374151') + '15',
              borderLeft: `4px solid ${CAT_COLOR[cat] || '#374151'}`, borderRadius: '0 6px 6px 0'
            }}>
              <span style={{ fontWeight: 700, color: CAT_COLOR[cat] || '#374151', fontSize: '0.95em' }}>
                {CAT_LABEL[cat] || cat}
              </span>
              <span style={{ fontSize: '0.8em', color: '#6b7280' }}>({grouped[cat].length} items)</span>
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2.5fr 80px 160px 110px 100px',
              gap: 12, padding: '8px 14px', fontWeight: 700, fontSize: '0.78em',
              color: '#374151', borderBottom: '2px solid #e5e7eb', background: '#f8fafc',
              borderRadius: '6px 6px 0 0'
            }}>
              <div>Name</div>
              <div>Unit</div>
              <div>Units Purchased</div>
              <div>Cost</div>
              <div>Cost / Unit</div>
            </div>

            {/* Rows */}
            {grouped[cat].map((item, idx) => {
              const cost = item.costCents / 100;
              const qty = item.unitsPurchased || 1;
              const costPerUnit = qty > 0 ? cost / qty : 0;
              return (
                <div key={item.id} style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 80px 160px 110px 100px',
                  gap: 12, padding: '10px 14px', alignItems: 'center',
                  borderBottom: '1px solid #f3f4f6',
                  background: idx % 2 === 0 ? 'white' : '#fafafa'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92em' }}>{item.name}</div>
                  <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{item.unit}</div>
                  <div style={{ fontSize: '0.85em' }}>
                    {qty}{item.presentation && item.presentation !== item.unit ? <span style={{ color: '#6b7280' }}> ({item.presentation})</span> : ''}
                  </div>
                  <div style={{ fontSize: '0.88em', fontWeight: 600 }}>${cost.toFixed(2)}</div>
                  <div style={{ fontSize: '0.88em', fontWeight: 700, color: CAT_COLOR[cat] || '#374151' }}>
                    ${costPerUnit.toFixed(3)}
                  </div>
                </div>
              );
            })}

            {/* Category subtotal */}
            <div style={{
              display: 'grid', gridTemplateColumns: '2.5fr 80px 160px 110px 100px',
              gap: 12, padding: '8px 14px', borderTop: '2px solid #e5e7eb',
              background: '#f8fafc', fontSize: '0.82em'
            }}>
              <div style={{ fontWeight: 700, color: '#374151' }}>Subtotal</div>
              <div></div><div></div>
              <div style={{ fontWeight: 700, color: '#374151' }}>
                ${grouped[cat].reduce((s, i) => s + i.costCents / 100, 0).toFixed(2)}
              </div>
              <div></div>
            </div>
          </div>
        ))
      )}

      {/* Grand total */}
      {filtered.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '14px 20px',
          background: '#1e293b', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: '0.92em'
        }}>
          <span>Total Items: {filtered.length}</span>
          <span>Total Cost: ${filtered.reduce((s, i) => s + i.costCents / 100, 0).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
