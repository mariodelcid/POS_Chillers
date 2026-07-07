// changed
// x
import React, { useState, useEffect, useMemo } from 'react';

const CAT_COLOR = { ingredient: '#059669', packaging: '#2563eb', disposable: '#7c3aed' };
const CAT_LABEL = { ingredient: 'Ingredient', packaging: 'Packaging', disposable: 'Disposable' };

const BLANK = { name: '', category: 'ingredient', unit: '', unitsPurchased: '', costCents: 0 };

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadItems = () => {
    fetch('/api/inventory-items')
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); })
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

  const categoryOrder = filterCat === 'all' ? ['ingredient', 'packaging', 'disposable'] : [filterCat];

  const handleAdd = async () => {
    if (!form.name.trim() || !form.unit.trim() || !form.unitsPurchased) {
      setError('Name, Unit, and Units Purchased are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/inventory-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          unit: form.unit.trim(),
          unitsPurchased: Number(form.unitsPurchased),
          costCents: 0,
          salesTax: false,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setForm(BLANK);
      setShowForm(false);
      loadItems();
    } catch {
      setError('Could not save item. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading inventory...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ margin: 0 }}>Inventory</h2>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); setForm(BLANK); }}
          style={{
            padding: '8px 20px', background: '#1e293b', color: 'white',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9em'
          }}
        >
          {showForm ? 'Cancel' : '+ Add Item'}
        </button>
      </div>
      <p style={{ color: '#6b7280', marginTop: 4, marginBottom: 20 }}>
        All ingredients, packaging, and disposables.
      </p>

      {/* Add Item Form */}
      {showForm && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
          padding: 20, marginBottom: 24
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.95em', marginBottom: 14, color: '#1e293b' }}>New Inventory Item</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: '0.75em', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Name *</div>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Azucar Regular"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.88em', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.75em', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Category *</div>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.88em', boxSizing: 'border-box' }}
              >
                <option value="ingredient">Ingredient</option>
                <option value="packaging">Packaging</option>
                <option value="disposable">Disposable</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: '0.75em', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Unit *</div>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="e.g. kg, L, pcs"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.88em', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.75em', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Units Purchased *</div>
              <input
                type="number"
                value={form.unitsPurchased}
                onChange={e => setForm(f => ({ ...f, unitsPurchased: e.target.value }))}
                placeholder="e.g. 25"
                min="0"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.88em', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: '0.82em', marginBottom: 10 }}>{error}</div>}
          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              padding: '8px 24px', background: '#059669', color: 'white',
              border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '0.88em', opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Item'}
          </button>
        </div>
      )}

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
          No items found. Add one above or use the Edit page.
        </div>
      ) : (
        categoryOrder.filter(cat => grouped[cat] && grouped[cat].length > 0).map(cat => (
          <div key={cat} style={{ marginBottom: 32 }}>
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

            <div style={{
              display: 'grid', gridTemplateColumns: '2.5fr 120px 160px',
              gap: 12, padding: '8px 14px', fontWeight: 700, fontSize: '0.78em',
              color: '#374151', borderBottom: '2px solid #e5e7eb', background: '#f8fafc',
              borderRadius: '6px 6px 0 0'
            }}>
              <div>Name</div>
              <div>Unit</div>
              <div>Units Purchased</div>
            </div>

            {grouped[cat].map((item, idx) => {
              const qty = item.unitsPurchased || 1;
              return (
                <div key={item.id} style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 120px 160px',
                  gap: 12, padding: '10px 14px', alignItems: 'center',
                  borderBottom: '1px solid #f3f4f6',
                  background: idx % 2 === 0 ? 'white' : '#fafafa'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92em' }}>{item.name}</div>
                  <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{item.unit}</div>
                  <div style={{ fontSize: '0.85em' }}>
                    {qty}{item.presentation && item.presentation !== item.unit ? <span style={{ color: '#6b7280' }}> ({item.presentation})</span> : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      {filtered.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '14px 20px',
          background: '#1e293b', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: '0.92em'
        }}>
          <span>Total Items: {filtered.length}</span>
        </div>
      )}
    </div>
  );
              }import React, { useState, useEffect, useMemo } from 'react';

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
        All ingredients, packaging, and disposables. Add or edit items in the <strong>Edit</strong> page.
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

            <div style={{
              display: 'grid', gridTemplateColumns: '2.5fr 120px 160px',
              gap: 12, padding: '8px 14px', fontWeight: 700, fontSize: '0.78em',
              color: '#374151', borderBottom: '2px solid #e5e7eb', background: '#f8fafc',
              borderRadius: '6px 6px 0 0'
            }}>
              <div>Name</div>
              <div>Unit</div>
              <div>Units Purchased</div>
            </div>

            {grouped[cat].map((item, idx) => {
              const qty = item.unitsPurchased || 1;
              return (
                <div key={item.id} style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 120px 160px',
                  gap: 12, padding: '10px 14px', alignItems: 'center',
                  borderBottom: '1px solid #f3f4f6',
                  background: idx % 2 === 0 ? 'white' : '#fafafa'
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.92em' }}>{item.name}</div>
                  <div style={{ fontSize: '0.85em', color: '#6b7280' }}>{item.unit}</div>
                  <div style={{ fontSize: '0.85em' }}>
                    {qty}{item.presentation && item.presentation !== item.unit ? <span style={{ color: '#6b7280' }}> ({item.presentation})</span> : ''}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}

      {filtered.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '14px 20px',
          background: '#1e293b', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: '0.92em'
        }}>
          <span>Total Items: {filtered.length}</span>
        </div>
      )}
    </div>
  );
      }
