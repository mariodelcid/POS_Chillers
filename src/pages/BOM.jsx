import React, { useEffect, useState, useMemo } from 'react';

function centsToUSD(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const SECTIONS = [
  { key: 'ingredient', label: 'Ingredients',  emoji: 'ð§' },
  { key: 'packaging',  label: 'Packaging',    emoji: 'ð¦' },
  { key: 'disposable', label: 'Disposables',  emoji: 'ð¥¤' },
];

const S = {
  shell: {
    display: 'grid',
    gridTemplateColumns: '260px 1fr',
    height: 'calc(100vh - 56px)',
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
  },
  // ââ Left panel âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  left: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid #e5e7eb',
    overflow: 'hidden',
    background: '#f9fafb',
  },
  leftHeader: {
    padding: '14px 16px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid #e5e7eb',
  },
  leftScroll: { overflowY: 'auto', flex: 1 },
  catLabel: {
    padding: '10px 16px 4px',
    fontSize: 11,
    fontWeight: 600,
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  itemRow: (active) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '9px 16px',
    cursor: 'pointer',
    borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
    background: active ? '#eff6ff' : 'transparent',
    transition: 'background 0.1s',
  }),
  itemName: (active) => ({
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    color: active ? '#1d4ed8' : '#111827',
  }),
  badgeSet: {
    fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 600,
    background: '#d1fae5', color: '#065f46',
  },
  badgeNone: {
    fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500,
    background: '#f3f4f6', color: '#9ca3af', border: '1px solid #e5e7eb',
  },
  // ââ Right panel ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  right: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#fff',
  },
  rightHeader: {
    padding: '14px 24px 12px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexShrink: 0,
  },
  rightTitle: { fontSize: 18, fontWeight: 700, color: '#111827' },
  rightPrice: { fontSize: 13, color: '#6b7280' },
  sections: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  sectionCard: {
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '9px 14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  sectionSub: { fontSize: 12, color: '#6b7280' },
  sectionBody: { padding: '10px 14px', background: '#fff' },
  lineRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 100px',
    gap: 8,
    alignItems: 'center',
    padding: '5px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  lineName: { fontSize: 13, color: '#111827' },
  lineCost: { fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'right' },
  lineActs: { display: 'flex', gap: 4, justifyContent: 'flex-end' },
  btnEdit: {
    fontSize: 11, padding: '3px 9px', border: '1px solid #d1d5db',
    borderRadius: 5, background: '#fff', color: '#374151', cursor: 'pointer',
  },
  btnDel: {
    fontSize: 11, padding: '3px 7px', border: '1px solid #fca5a5',
    borderRadius: 5, background: '#fff', color: '#dc2626', cursor: 'pointer',
  },
  addRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 80px 100px',
    gap: 8,
    alignItems: 'center',
    paddingTop: 10,
  },
  inp: {
    padding: '6px 9px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 13, background: '#f9fafb', width: '100%', color: '#111827',
  },
  inpNum: {
    padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 13, background: '#f9fafb', width: '100%', textAlign: 'right',
    color: '#111827',
  },
  btnAdd: (saving) => ({
    padding: '6px 0', border: 'none', borderRadius: 6,
    background: saving ? '#93c5fd' : '#2563eb', color: '#fff',
    cursor: saving ? 'default' : 'pointer', fontSize: 13, fontWeight: 600,
    width: '100%',
  }),
  totalsBar: {
    padding: '12px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f9fafb',
    flexShrink: 0,
  },
  totalLabel: { fontSize: 13, fontWeight: 600, color: '#374151' },
  totalVal: { fontSize: 14, fontWeight: 700 },
  emptyRight: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: 14,
  },
};

export default function BOM() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [newLines, setNewLines]     = useState({});
  const [editingLine, setEditingLine]   = useState(null);
  const [editValues, setEditValues]     = useState({ ingredient: '', cost: '' });
  const [saving, setSaving]         = useState(null);

  useEffect(() => { fetchBOM(); }, []);

  const fetchBOM = async () => {
    try {
      const res  = await fetch('/api/bom');
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

  const selectedItem = items.find(i => i.id === selectedId) || null;

  if (loading) return <div style={{ padding: 24 }}>Loadingâ¦</div>;
  if (items.length === 0) return <div style={{ padding: 24, color: '#6b7280' }}>No items found.</div>;

  const bomTotal  = selectedItem ? selectedItem.bomLines.reduce((s, l) => s + l.costCents, 0) : 0;
  const margin    = selectedItem ? selectedItem.priceCents - bomTotal : 0;
  const marginPct = selectedItem && selectedItem.priceCents > 0
    ? Math.round((margin / selectedItem.priceCents) * 100) : 0;

  return (
    <div style={S.shell}>
      {/* ââ Left panel âââââââââââââââââââââââââââââââââââ */}
      <div style={S.left}>
        <div style={S.leftHeader}>Bill of Materials</div>
        <div style={S.leftScroll}>
          {Object.entries(categories).map(([cat, catItems]) => (
            <div key={cat}>
              <div style={S.catLabel}>{cat}</div>
              {catItems.map(item => {
                const active    = item.id === selectedId;
                const hasLines  = item.bomLines.length > 0;
                return (
                  <div
                    key={item.id}
                    style={S.itemRow(active)}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span style={S.itemName(active)}>{item.name}</span>
                    {hasLines
                      ? <span style={S.badgeSet}>{item.bomLines.length} lines</span>
                      : <span style={S.badgeNone}>No BOM</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ââ Right panel ââââââââââââââââââââââââââââââââââ */}
      <div style={S.right}>
        {!selectedItem ? (
          <div style={S.emptyRight}>â Select an item to edit its BOM</div>
        ) : (
          <>
            <div style={S.rightHeader}>
              <span style={S.rightTitle}>{selectedItem.name}</span>
              <span style={S.rightPrice}>Sell price: {centsToUSD(selectedItem.priceCents)}</span>
            </div>

            <div style={S.sections}>
              {SECTIONS.map(({ key: type, label, emoji }) => {
                const lines       = selectedItem.bomLines.filter(l => (l.type || 'ingredient') === type);
                const sectionSub  = lines.reduce((s, l) => s + l.costCents, 0);
                const nl          = getNewLine(selectedItem.id, type);
                const isSaving    = saving === `${selectedItem.id}_${type}`;

                return (
                  <div key={type} style={S.sectionCard}>
                    <div style={S.sectionHead}>
                      <span style={S.sectionTitle}>{emoji} {label}</span>
                      <span style={S.sectionSub}>
                        {sectionSub > 0 ? `Subtotal: ${centsToUSD(sectionSub)}` : 'â'}
                      </span>
                    </div>
                    <div style={S.sectionBody}>
                      {lines.length === 0 && (
                        <div style={{ fontSize: 12, color: '#9ca3af', paddingBottom: 6, fontStyle: 'italic' }}>
                          None added yet.
                        </div>
                      )}

                      {lines.map(line => (
                        <div key={line.id} style={S.lineRow}>
                          {editingLine === line.id ? (
                            <>
                              <input
                                autoFocus
                                value={editValues.ingredient}
                                onChange={e => setEditValues(v => ({ ...v, ingredient: e.target.value }))}
                                style={S.inp}
                                onKeyDown={e => e.key === 'Enter' && saveEdit(line.id)}
                              />
                              <input
                                type="number"
                                value={editValues.cost}
                                onChange={e => setEditValues(v => ({ ...v, cost: e.target.value }))}
                                style={S.inpNum}
                                min="0" step="0.01"
                                onKeyDown={e => e.key === 'Enter' && saveEdit(line.id)}
                              />
                              <div style={S.lineActs}>
                                <button
                                  onClick={() => saveEdit(line.id)}
                                  style={{ ...S.btnEdit, background: '#2563eb', color: '#fff', border: 'none' }}>
                                  Save
                                </button>
                                <button onClick={() => setEditingLine(null)} style={S.btnEdit}>
                                  Cancel
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <span style={S.lineName}>{line.ingredient}</span>
                              <span style={S.lineCost}>{centsToUSD(line.costCents)}</span>
                              <div style={S.lineActs}>
                                <button onClick={() => startEdit(line)} style={S.btnEdit}>Edit</button>
                                <button onClick={() => deleteLine(line.id)} style={S.btnDel}>â</button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add row */}
                      <div style={S.addRow}>
                        <input
                          value={nl.ingredient}
                          onChange={e => setNewLine(selectedItem.id, type, { ...nl, ingredient: e.target.value })}
                          placeholder={`Add ${label.slice(0, -1).toLowerCase()}â¦`}
                          style={S.inp}
                          onKeyDown={e => e.key === 'Enter' && addBomLine(selectedItem.id, type)}
                        />
                        <input
                          type="number"
                          value={nl.cost}
                          onChange={e => setNewLine(selectedItem.id, type, { ...nl, cost: e.target.value })}
                          placeholder="0.00"
                          style={S.inpNum}
                          min="0" step="0.01"
                          onKeyDown={e => e.key === 'Enter' && addBomLine(selectedItem.id, type)}
                        />
                        <button
                          onClick={() => addBomLine(selectedItem.id, type)}
                          disabled={isSaving}
                          style={S.btnAdd(isSaving)}
                        >
                          {isSaving ? 'Savingâ¦' : '+ Add'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals bar */}
            <div style={S.totalsBar}>
              <span style={S.totalLabel}>Total BOM Cost</span>
              {bomTotal > 0 ? (
                <span style={{ ...S.totalVal, color: margin >= 0 ? '#059669' : '#dc2626' }}>
                  {centsToUSD(bomTotal)}
                  <span style={{ color: '#6b7280', fontWeight: 500, fontSize: 13 }}>
                    {' '}Â· Margin: {centsToUSD(margin)} ({marginPct}%)
                  </span>
                </span>
              ) : (
                <span style={{ ...S.totalVal, color: '#9ca3af' }}>No cost lines yet</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
