import React, { useEffect, useState, useMemo } from 'react';

function centsToUSD(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BOM() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState(null);
  const [newLine, setNewLine] = useState({ ingredient: '', cost: '' });
  const [editingLine, setEditingLine] = useState(null);
  const [editValues, setEditValues] = useState({ ingredient: '', cost: '' });

  useEffect(() => { fetchBOM(); }, []);

  const fetchBOM = async () => {
    try {
      const res = await fetch('/api/bom');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error('Error fetching BOM:', err);
    } finally {
      setLoading(false);
    }
  };

  const addBomLine = async (itemId) => {
    if (!newLine.ingredient.trim() || newLine.cost === '') return;
    const costCents = Math.round(parseFloat(newLine.cost) * 100);
    if (isNaN(costCents) || costCents < 0) { alert('Invalid cost'); return; }
    try {
      await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ingredient: newLine.ingredient.trim(), costCents }),
      });
      setNewLine({ ingredient: '', cost: '' });
      await fetchBOM();
    } catch (err) {
      console.error('Error adding BOM line:', err);
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
      await fetch(`/api/bom/${lineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient: editValues.ingredient.trim(), costCents }),
      });
      setEditingLine(null);
      await fetchBOM();
    } catch (err) {
      console.error('Error updating BOM line:', err);
    }
  };

  const deleteLine = async (lineId) => {
    if (!confirm('Delete this ingredient?')) return;
    try {
      await fetch(`/api/bom/${lineId}`, { method: 'DELETE' });
      await fetchBOM();
    } catch (err) {
      console.error('Error deleting BOM line:', err);
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
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: '0.95em' }}>
        Define ingredient costs for each menu item. These costs are used to calculate the cost of sales in the Sales report.
        Click any item row to expand it and add or edit ingredients.
      </p>

      {Object.entries(categories).map(([category, catItems]) => (
        <div key={category} style={{ marginBottom: 32 }}>
          <div style={{ padding: '8px 16px', background: '#f3f4f6', borderRadius: 6, margin: '0 0 8px 0', borderLeft: '4px solid #2563eb', fontWeight: 700, fontSize: '0.95em', color: '#1e40af' }}>
            {category}
          </div>

          {catItems.map(item => {
            const bomTotal = item.bomLines.reduce((sum, l) => sum + l.costCents, 0);
            const isExpanded = expandedItem === item.id;
            const margin = item.priceCents - bomTotal;
            const marginPct = item.priceCents > 0 ? Math.round((margin / item.priceCents) * 100) : 0;

            return (
              <div key={item.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 6, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16, padding: '12px 16px', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#eff6ff' : '#fff', userSelect: 'none' }}
                >
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: '0.85em', color: '#6b7280', textAlign: 'right' }}>Sell price: {centsToUSD(item.priceCents)}</div>
                  <div style={{ fontWeight: 700, color: bomTotal > 0 ? '#059669' : '#9ca3af', minWidth: 110, textAlign: 'right', fontSize: '0.9em' }}>
                    {bomTotal > 0 ? `BOM: ${centsToUSD(bomTotal)} (${marginPct}% margin)` : 'No BOM set'}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.8em', minWidth: 80, textAlign: 'right' }}>
                    {item.bomLines.length} ingredient{item.bomLines.length !== 1 ? 's' : ''} {isExpanded ? '▲' : '▼'}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #e5e7eb', padding: '14px 16px', background: '#fafafa' }}>
                    {item.bomLines.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: 8, padding: '0 0 6px 0', fontWeight: 600, fontSize: '0.8em', color: '#6b7280', borderBottom: '1px solid #e5e7eb', marginBottom: 6 }}>
                        <div>Ingredient</div>
                        <div style={{ textAlign: 'right' }}>Cost / serving</div>
                        <div style={{ textAlign: 'center' }}>Actions</div>
                      </div>
                    )}

                    {item.bomLines.length === 0 && (
                      <div style={{ color: '#9ca3af', fontStyle: 'italic', marginBottom: 12, fontSize: '0.9em' }}>No ingredients defined. Add the first one below.</div>
                    )}

                    {item.bomLines.map(line => (
                      <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: 8, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}>
                        {editingLine === line.id ? (
                          <>
                            <input value={editValues.ingredient} onChange={e => setEditValues(v => ({ ...v, ingredient: e.target.value }))} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9em' }} placeholder="Ingredient name" autoFocus />
                            <input type="number" value={editValues.cost} onChange={e => setEditValues(v => ({ ...v, cost: e.target.value }))} style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, width: '100%', fontSize: '0.9em', textAlign: 'right' }} min="0" step="0.01" placeholder="0.00" />
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button onClick={() => saveEdit(line.id)} style={{ padding: '4px 10px', background: '#059669', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8em' }}>Save</button>
                              <button onClick={() => setEditingLine(null)} style={{ padding: '4px 10px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8em' }}>Cancel</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: '0.9em' }}>{line.ingredient}</div>
                            <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.9em', textAlign: 'right' }}>{centsToUSD(line.costCents)}</div>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                              <button onClick={() => startEdit(line)} style={{ padding: '3px 10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75em' }}>Edit</button>
                              <button onClick={() => deleteLine(line.id)} style={{ padding: '3px 8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75em' }}>✕</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}

                    {item.bomLines.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: 8, padding: '8px 0 4px', borderTop: '2px solid #e5e7eb', marginTop: 4, fontWeight: 700, fontSize: '0.9em' }}>
                        <div style={{ color: '#374151' }}>Total BOM Cost</div>
                        <div style={{ textAlign: 'right', color: '#059669' }}>{centsToUSD(bomTotal)}</div>
                        <div style={{ textAlign: 'center', color: margin >= 0 ? '#059669' : '#dc2626' }}>Margin: {centsToUSD(margin)} ({marginPct}%)</div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: 8, marginTop: 14, paddingTop: 12, borderTop: '1px dashed #d1d5db', alignItems: 'center' }}>
                      <input
                        value={newLine.ingredient}
                        onChange={e => setNewLine(v => ({ ...v, ingredient: e.target.value }))}
                        placeholder="New ingredient (e.g. milk, cup, syrup)"
                        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: '0.9em' }}
                        onKeyDown={e => e.key === 'Enter' && addBomLine(item.id)}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ color: '#6b7280', fontSize: '0.9em' }}>$</span>
                        <input
                          type="number"
                          value={newLine.cost}
                          onChange={e => setNewLine(v => ({ ...v, cost: e.target.value }))}
                          placeholder="0.00"
                          style={{ padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, width: '100%', fontSize: '0.9em', textAlign: 'right' }}
                          min="0" step="0.01"
                          onKeyDown={e => e.key === 'Enter' && addBomLine(item.id)}
                        />
                      </div>
                      <button onClick={() => addBomLine(item.id)} style={{ padding: '6px 0', background: '#2563eb', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.85em', fontWeight: 600, width: '100%' }}>
                        + Add Ingredient
                      </button>
                    </div>
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
