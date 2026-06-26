import React, { useEffect, useState, useMemo } from 'react';

function centsToUSD(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const SECTIONS = [
  { key: 'ingredient', label: 'Ingredients' },
  { key: 'packaging',  label: 'Packaging' },
  { key: 'disposable', label: 'Disposables' },
];

export default function BOM() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState(null);
  // newLines: { "itemId_type": { ingredient, cost } }
  const [newLines, setNewLines] = useState({});
  const [editingLine, setEditingLine] = useState(null);
  const [editValues, setEditValues] = useState({ ingredient: '', cost: '' });
  const [saving, setSaving] = useState(null);

  useEffect(() => { fetchBOM(); }, []);

  const fetchBOM = async () => {
    try {
      const res = await fetch('/api/bom');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching BOM:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const getNewLine = (itemId, type) =>
    newLines[`${itemId}_${type}`] || { ingredient: '', cost: '' };

  const setNewLine = (itemId, type, val) =>
    setNewLines(prev => ({ ...prev, [`${itemId}_${type}`]: val }));

  const addBomLine = async (itemId, type) => {
    const line = getNewLine(itemId, type);
    if (!line.ingredient.trim() || line.cost === '') return;
    const costCents = Math.round(parseFloat(line.cost) * 100);
    if (isNaN(costCents) || costCents < 0) { alert('Invalid cost'); return; }

    const key = `${itemId}_${type}`;
    setSaving(key);
    try {
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ingredient: line.ingredient.trim(), costCents, type }),
      });
      if (!res.ok) throw new Error('Save failed');
      setNewLine(itemId, type, { ingredient: '', cost: '' });
      await fetchBOM();
    } catch (err) {
      console.error(err);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (line) => {
    setEditingLine(line.id);
    setEditValues({ ingredient: line.ingredient, cost: (line.costCents / 100).toFixed(2) });
  };

  const saveEdit = async (lineId) => {
    if (!editValues.ingredient.trim() || editValues.cost === '') return;
    const costCents = Math.round(parseFloat(editValues.cost) * 100);
    if (isNaN(costCents) || costCents < 0) { alert('Invalid cost'); return; }
    try {
      const res = await fetch(`/api/bom/${lineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient: editValues.ingredient.trim(), costCents }),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditingLine(null);
      await fetchBOM();
    } catch (err) {
      console.error(err);
      alert('Failed to update.');
    }
  };

  const deleteLine = async (lineId) => {
    if (!confirm('Delete this line?')) return;
    try {
      await fetch(`/api/bom/${lineId}`, { method: 'DELETE' });
      await fetchBOM();
    } catch (err) {
      console.error(err);
    }
  };

  const categories = useMemo(() => {
    const cats = {};
    items.forEach(item => {
      if (!cats[item.category]) cats[item.category] = [];
      cats[item.category].push(item);
    });
    return cats;
  }, [items]);

  if (loading) return <div style={{ padding: 16 }}>Loading BOM data…</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Bill of Materials</h3>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: '0.9em' }}>
        Click any item to define its ingredients, packaging, and disposables.
        These costs feed into the daily Cost of Sales on the Sales report.
      </p>

      {Object.entries(categories).map(([category, catItems]) => (
        <div key={category} style={{ marginBottom: 32 }}>
          {/* Category header */}
          <div style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            borderRadius: 6,
            marginBottom: 8,
            borderLeft: '4px solid #2563eb',
            fontWeight: 700,
            fontSize: '0.9em',
            color: '#1e40af',
          }}>
            {category}
          </div>

          {catItems.map(item => {
            const bomTotal   = item.bomLines.reduce((s, l) => s + l.costCents, 0);
            const isExpanded = expandedItem === item.id;
            const margin     = item.priceCents - bomTotal;
            const marginPct  = item.priceCents > 0
              ? Math.round((margin / item.priceCents) * 100) : 0;

            return (
              <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>

                {/* Item header */}
                <div
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: 16,
                    padding: '11px 16px',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? '#eff6ff' : '#fff',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{item.name}</div>

                  <div style={{ fontSize: '0.82em', color: '#6b7280', textAlign: 'right' }}>
                    Sell: {centsToUSD(item.priceCents)}
                  </div>

                  <div style={{
                    fontWeight: 700,
                    color: bomTotal > 0 ? '#059669' : '#9ca3af',
                    minWidth: 140,
                    textAlign: 'right',
                    fontSize: '0.88em',
                  }}>
                    {bomTotal > 0
                      ? `BOM: ${centsToUSD(bomTotal)} · ${marginPct}% margin`
                      : 'No BOM set'}
                  </div>

                  <div style={{ color: '#9ca3af', fontSize: '0.78em', minWidth: 64, textAlign: 'right' }}>
                    {item.bomLines.length} line{item.bomLines.length !== 1 ? 's' : ''} {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {/* Expanded BOM detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '16px 16px 12px', background: '#fafafa' }}>

                    {SECTIONS.map(({ key: type, label }) => {
                      const lines        = item.bomLines.filter(l => (l.type || 'ingredient') === type);
                      const nl           = getNewLine(item.id, type);
                      const sectionTotal = lines.reduce((s, l) => s + l.costCents, 0);
                      const isSaving     = saving === `${item.id}_${type}`;

                      return (
                        <div key={type} style={{ marginBottom: 20 }}>

                          {/* Section header */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontWeight: 700,
                            fontSize: '0.82em',
                            color: '#374151',
                            borderBottom: '2px solid #e5e7eb',
                            paddingBottom: 5,
                            marginBottom: 8,
                          }}>
                            <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                            {sectionTotal > 0 && (
                              <span style={{ fontWeight: 500, color: '#6b7280' }}>
                                Subtotal: {centsToUSD(sectionTotal)}
                              </span>
                            )}
                          </div>

                          {lines.length === 0 && (
                            <div style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '0.84em', marginBottom: 8 }}>
                              None added yet.
                            </div>
                          )}

                          {/* Existing lines */}
                          {lines.map(line => (
                            <div key={line.id} style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 90px 110px',
                              gap: 8,
                              alignItems: 'center',
                              padding: '4px 0',
                              borderBottom: '1px solid #f3f4f6',
                            }}>
                              {editingLine === line.id ? (
                                <>
                                  <input
                                    value={editValues.ingredient}
                                    onChange={e => setEditValues(v => ({ ...v, ingredient: e.target.value }))}
                                    style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.88em' }}
                                    autoFocus
                                  />
                                  <input
                                    type="number"
                                    value={editValues.cost}
                                    onChange={e => setEditValues(v => ({ ...v, cost: e.target.value }))}
                                    style={{ padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.88em', textAlign: 'right' }}
                                    min="0" step="0.01"
                                  />
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => saveEdit(line.id)}
                                      style={{ padding: '3px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.78em' }}>
                                      Save
                                    </button>
                                    <button onClick={() => setEditingLine(null)}
                                      style={{ padding: '3px 8px', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.78em' }}>
                                      Cancel
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: '0.9em' }}>{line.ingredient}</div>
                                  <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.9em', textAlign: 'right' }}>
                                    {centsToUSD(line.costCents)}
                                  </div>
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => startEdit(line)}
                                      style={{ padding: '2px 8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75em' }}>
                                      Edit
                                    </button>
                                    <button onClick={() => deleteLine(line.id)}
                                      style={{ padding: '2px 6px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75em' }}>
                                      ✕
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Add row */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 90px 110px',
                            gap: 8,
                            marginTop: 8,
                            alignItems: 'center',
                          }}>
                            <input
                              value={nl.ingredient}
                              onChange={e => setNewLine(item.id, type, { ...nl, ingredient: e.target.value })}
                              placeholder={`Add ${label.slice(0, -1).toLowerCase()}…`}
                              style={{ padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.84em' }}
                              onKeyDown={e => e.key === 'Enter' && addBomLine(item.id, type)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <span style={{ color: '#6b7280', fontSize: '0.84em' }}>$</span>
                              <input
                                type="number"
                                value={nl.cost}
                                onChange={e => setNewLine(item.id, type, { ...nl, cost: e.target.value })}
                                placeholder="0.00"
                                style={{ padding: '5px 6px', border: '1px solid #d1d5db', borderRadius: 4, width: '100%', fontSize: '0.84em', textAlign: 'right' }}
                                min="0" step="0.01"
                                onKeyDown={e => e.key === 'Enter' && addBomLine(item.id, type)}
                              />
                            </div>
                            <button
                              onClick={() => addBomLine(item.id, type)}
                              disabled={isSaving}
                              style={{
                                padding: '5px 0',
                                background: isSaving ? '#93c5fd' : '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: isSaving ? 'default' : 'pointer',
                                fontSize: '0.8em',
                                fontWeight: 600,
                                width: '100%',
                              }}
                            >
                              {isSaving ? 'Saving…' : '+ Add'}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Total BOM summary */}
                    {bomTotal > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 0 0',
                        borderTop: '2px solid #e5e7eb',
                        fontWeight: 700,
                        fontSize: '0.9em',
                      }}>
                        <span>Total BOM Cost</span>
                        <span style={{ color: margin >= 0 ? '#059669' : '#dc2626' }}>
                          {centsToUSD(bomTotal)} &nbsp;·&nbsp; Margin: {centsToUSD(margin)} ({marginPct}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
