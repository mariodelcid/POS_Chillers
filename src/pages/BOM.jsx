import React, { useEffect, useState, useMemo } from 'react';

function centsToUSD(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

const SECTIONS = [
  { key: 'ingredient', label: 'Ingredients' },
  { key: 'packaging', label: 'Packaging' },
  { key: 'disposable', label: 'Disposables' },
];

const S = {
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
  },
  sectionSub: { fontSize: 12, color: '#6b7280' },
  sectionBody: { padding: '10px 14px', background: '#fff' },
  lineRow: hasQty => ({
    display: 'grid',
    gridTemplateColumns: '1fr 45px 80px 100px',
    gap: 8,
    alignItems: 'center',
    padding: '5px 0',
    borderBottom: '1px solid #f3f4f6',
  }),
  lineName: { fontSize: 13, color: '#111827' },
  lineQty: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
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
  inp: {
    padding: '6px 9px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 13, background: '#f9fafb', width: '100%', color: '#111827',
    boxSizing: 'border-box',
  },
  inpNum: {
    padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6,
    fontSize: 13, background: '#f9fafb', width: '100%', textAlign: 'right',
    color: '#111827', boxSizing: 'border-box',
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
  const [activeTab, setActiveTab] = useState('bom');
  const [items, setItems] = useState([]);
  const [invItems, setInvItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [newLines, setNewLines] = useState({});
  const [editingLine, setEditingLine] = useState(null);
  const [editValues, setEditValues] = useState({ ingredient: '', cost: '', qty: '1' });
  const [saving, setSaving] = useState(null);

  // P&L state
  const [pnlDate, setPnlDate] = useState(new Date().toISOString().split('T')[0]);
  const [pnlData, setPnlData] = useState(null);
  const [pnlLoading, setPnlLoading] = useState(false);

  useEffect(() => {
    fetchBOM();
    fetchInvItems();
  }, []);

  useEffect(() => {
    if (activeTab === 'pnl') fetchPnl();
  }, [activeTab, pnlDate]);

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

  const fetchInvItems = async () => {
    try {
      const res = await fetch('/api/inventory-items');
      const data = await res.json();
      setInvItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching inventory items:', err);
    }
  };

  const fetchPnl = async () => {
    setPnlLoading(true);
    try {
      const res = await fetch(`/api/daily-pnl?date=${pnlDate}`);
      const data = await res.json();
      setPnlData(data);
    } catch (err) {
      console.error('Error fetching P&L:', err);
      setPnlData(null);
    } finally {
      setPnlLoading(false);
    }
  };

  const getNewLine = (itemId, type) =>
    newLines[`${itemId}_${type}`] || { mode: 'library', libItemId: '', ingredient: '', qty: '1', cost: '' };

  const setNewLine = (itemId, type, val) =>
    setNewLines(prev => ({ ...prev, [`${itemId}_${type}`]: val }));

  const calcLibCost = (invId, qty) => {
    const inv = invItems.find(i => i.id === parseInt(invId));
    if (!inv || !invId) return '';
    const unitCostCents = inv.costCents / inv.unitsPurchased;
    return (unitCostCents * parseFloat(qty || 1) / 100).toFixed(2);
  };

  const handleLibSelect = (itemId, type, invId) => {
    const nl = getNewLine(itemId, type);
    const cost = invId ? calcLibCost(invId, nl.qty) : '';
    setNewLine(itemId, type, { ...nl, libItemId: invId, cost });
  };

  const handleQtyChange = (itemId, type, qty) => {
    const nl = getNewLine(itemId, type);
    const newCost = nl.mode === 'library' && nl.libItemId ? calcLibCost(nl.libItemId, qty) : nl.cost;
    setNewLine(itemId, type, { ...nl, qty, cost: newCost });
  };

  const addBomLine = async (itemId, type) => {
    const nl = getNewLine(itemId, type);
    let ingredientName = '';

    if (nl.mode === 'library') {
      const inv = invItems.find(i => i.id === parseInt(nl.libItemId));
      if (!inv) { alert('Select an ingredient from the library.'); return; }
      ingredientName = inv.name;
    } else {
      if (!nl.ingredient.trim()) { alert('Enter an ingredient name.'); return; }
      ingredientName = nl.ingredient.trim();
    }

    if (nl.cost === '' || nl.cost === undefined) { alert('Enter a cost.'); return; }
    const costCents = Math.round(parseFloat(nl.cost) * 100);
    if (isNaN(costCents) || costCents < 0) { alert('Invalid cost'); return; }

    const qty = parseFloat(nl.qty) || 1;
    const invItemId = nl.mode === 'library' && nl.libItemId ? parseInt(nl.libItemId) : undefined;

    const key = `${itemId}_${type}`;
    setSaving(key);
    try {
      const res = await fetch('/api/bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          ingredient: ingredientName,
          costCents,
          type,
          quantity: qty,
          ...(invItemId && { inventoryItemId: invItemId }),
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setNewLine(itemId, type, { mode: 'library', libItemId: '', ingredient: '', qty: '1', cost: '' });
      await fetchBOM();
    } catch (err) {
      console.error(err);
      alert('Failed to save. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const startEdit = (line) => {
    setEditingLine(line.id);
    setEditValues({
      ingredient: line.ingredient,
      cost: (line.costCents / 100).toFixed(2),
      qty: String(line.quantity || 1),
    });
  };

  const saveEdit = async (lineId) => {
    if (!editValues.ingredient.trim() || editValues.cost === '') return;
    const costCents = Math.round(parseFloat(editValues.cost) * 100);
    if (isNaN(costCents) || costCents < 0) { alert('Invalid cost'); return; }
    try {
      const res = await fetch(`/api/bom/${lineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient: editValues.ingredient.trim(),
          costCents,
          quantity: parseFloat(editValues.qty) || 1,
        }),
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

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;

  const bomTotal = selectedItem ? selectedItem.bomLines.reduce((s, l) => s + l.costCents, 0) : 0;
  const margin = selectedItem ? selectedItem.priceCents - bomTotal : 0;
  const marginPct = selectedItem && selectedItem.priceCents > 0
    ? Math.round((margin / selectedItem.priceCents) * 100) : 0;

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#fff', flexShrink: 0, paddingLeft: 8 }}>
        {[{ id: 'bom', label: 'BOM Editor' }, { id: 'pnl', label: 'Daily P&L' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab.id ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === tab.id ? 700 : 400,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: -2,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'bom' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', overflow: 'hidden' }}>
          <div style={S.left}>
            <div style={S.leftHeader}>Menu Items</div>
            <div style={S.leftScroll}>
              {items.length === 0 ? (
                <div style={{ padding: 16, color: '#9ca3af', fontSize: 13 }}>No items found.</div>
              ) : (
                Object.entries(categories).map(([cat, catItems]) => (
                  <div key={cat}>
                    <div style={S.catLabel}>{cat}</div>
                    {catItems.map(item => {
                      const active = item.id === selectedId;
                      return (
                        <div key={item.id} style={S.itemRow(active)} onClick={() => setSelectedId(item.id)}>
                          <span style={S.itemName(active)}>{item.name}</span>
                          {item.bomLines.length > 0
                            ? <span style={S.badgeSet}>{item.bomLines.length} lines</span>
                            : <span style={S.badgeNone}>No BOM</span>}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={S.right}>
            {!selectedItem ? (
              <div style={S.emptyRight}>&#8592; Select an item to edit its BOM</div>
            ) : (
              <>
                <div style={S.rightHeader}>
                  <span style={S.rightTitle}>{selectedItem.name}</span>
                  <span style={S.rightPrice}>Sell price: {centsToUSD(selectedItem.priceCents)}</span>
                </div>

                <div style={S.sections}>
                  {SECTIONS.map(({ key: type, label }) => {
                    const lines = selectedItem.bomLines.filter(l => (l.type || 'ingredient') === type);
                    const sectionSub = lines.reduce((s, l) => s + l.costCents, 0);
                    const nl = getNewLine(selectedItem.id, type);
                    const isSaving = saving === `${selectedItem.id}_${type}`;

                    const libItems = invItems.filter(inv => inv.category === type);
                    const displayLibItems = libItems.length > 0 ? libItems : invItems;

                    return (
                      <div key={type} style={S.sectionCard}>
                        <div style={S.sectionHead}>
                          <span style={S.sectionTitle}>{label}</span>
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
                            <div key={line.id} style={S.lineRow()}>
                              {editingLine === line.id ? (
                                <>
                                  <input autoFocus value={editValues.ingredient}
                                    onChange={e => setEditValues(v => ({ ...v, ingredient: e.target.value }))}
                                    style={S.inp} onKeyDown={e => e.key === 'Enter' && saveEdit(line.id)} />
                                  <input type="number" value={editValues.qty}
                                    onChange={e => setEditValues(v => ({ ...v, qty: e.target.value }))}
                                    style={S.inpNum} min="0.01" step="any" title="Qty" />
                                  <input type="number" value={editValues.cost}
                                    onChange={e => setEditValues(v => ({ ...v, cost: e.target.value }))}
                                    style={S.inpNum} min="0" step="0.01"
                                    onKeyDown={e => e.key === 'Enter' && saveEdit(line.id)} />
                                  <div style={S.lineActs}>
                                    <button onClick={() => saveEdit(line.id)}
                                      style={{ ...S.btnEdit, background: '#2563eb', color: '#fff', border: 'none' }}>Save</button>
                                    <button onClick={() => setEditingLine(null)} style={S.btnEdit}>Cancel</button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span style={S.lineName}>{line.ingredient}</span>
                                  <span style={S.lineQty}>x{line.quantity || 1}</span>
                                  <span style={S.lineCost}>{centsToUSD(line.costCents)}</span>
                                  <div style={S.lineActs}>
                                    <button onClick={() => startEdit(line)} style={S.btnEdit}>Edit</button>
                                    <button onClick={() => deleteLine(line.id)} style={S.btnDel}>x</button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Mode toggle */}
                          <div style={{ display: 'flex', gap: 6, paddingTop: 10, marginBottom: 6 }}>
                            {['library', 'manual'].map(mode => (
                              <button key={mode}
                                onClick={() => setNewLine(selectedItem.id, type, { ...nl, mode, libItemId: '', ingredient: '', cost: '' })}
                                style={{
                                  fontSize: 11, padding: '3px 10px', borderRadius: 99, cursor: 'pointer', fontWeight: 600,
                                  border: '1px solid',
                                  borderColor: nl.mode === mode ? '#2563eb' : '#d1d5db',
                                  background: nl.mode === mode ? '#eff6ff' : '#fff',
                                  color: nl.mode === mode ? '#2563eb' : '#6b7280',
                                }}
                              >
                                {mode === 'library' ? 'From Library' : 'Manual'}
                              </button>
                            ))}
                          </div>

                          {/* Add row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 55px 80px 70px', gap: 6, alignItems: 'center' }}>
                            {nl.mode === 'library' ? (
                              <select value={nl.libItemId || ''}
                                onChange={e => handleLibSelect(selectedItem.id, type, e.target.value)}
                                style={S.inp}>
                                <option value="">Select ingredient...</option>
                                {displayLibItems.map(inv => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.name} ({centsToUSD(Math.round(inv.costCents / inv.unitsPurchased))}/{inv.unit})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input value={nl.ingredient}
                                onChange={e => setNewLine(selectedItem.id, type, { ...nl, ingredient: e.target.value })}
                                placeholder={`${label.slice(0, -1)} name...`}
                                style={S.inp}
                                onKeyDown={e => e.key === 'Enter' && addBomLine(selectedItem.id, type)} />
                              )}
                            <input type="number" value={nl.qty}
                              onChange={e => handleQtyChange(selectedItem.id, type, e.target.value)}
                              style={S.inpNum} min="0.01" step="any" title="Qty" />
                            <input type="number" value={nl.cost}
                              onChange={e => setNewLine(selectedItem.id, type, { ...nl, cost: e.target.value })}
                              placeholder="0.00"
                              style={{
                                ...S.inpNum,
                                background: nl.mode === 'library' && nl.libItemId ? '#f0fdf4' : '#f9fafb',
                              }}
                              min="0" step="0.01"
                              onKeyDown={e => e.key === 'Enter' && addBomLine(selectedItem.id, type)} />
                            <button onClick={() => addBomLine(selectedItem.id, type)}
                              disabled={isSaving} style={S.btnAdd(isSaving)}>
                              {isSaving ? '...' : '+ Add'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={S.totalsBar}>
                  <span style={S.totalLabel}>Total BOM Cost</span>
                  {bomTotal > 0 ? (
                    <span style={{ ...S.totalVal, color: margin >= 0 ? '#059669' : '#dc2626' }}>
                      {centsToUSD(bomTotal)}
                      <span style={{ color: '#6b7280', fontWeight: 500, fontSize: 13 }}>
                        {' '}&middot; Margin: {centsToUSD(margin)} ({marginPct}%)
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
      )}

      {activeTab === 'pnl' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f9fafb' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24 }}>
            <input type="date" value={pnlDate}
              onChange={e => setPnlDate(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' }} />
            <button onClick={fetchPnl}
              style={{ padding: '8px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Refresh
            </button>
            {pnlLoading && <span style={{ fontSize: 13, color: '#9ca3af' }}>Loading...</span>}
          </div>

          {!pnlData && !pnlLoading && (
            <div style={{ color: '#9ca3af', fontSize: 14 }}>Select a date and click Refresh.</div>
          )}

          {pnlData && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Revenue', value: centsToUSD(pnlData.revenueCents), color: '#1d4ed8' },
                  { label: 'COGS', value: centsToUSD(pnlData.cogsCents), color: '#dc2626' },
                  { label: 'Gross Profit', value: centsToUSD(pnlData.profitCents), color: pnlData.profitCents >= 0 ? '#059669' : '#dc2626' },
                  { label: 'Margin', value: `${pnlData.marginPct}%`, color: pnlData.marginPct >= 0 ? '#059669' : '#dc2626' },
                ].map(card => (
                  <div key={card.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 20px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>{card.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 16, fontSize: 13, color: '#6b7280' }}>
                {pnlData.transactions} transaction{pnlData.transactions !== 1 ? 's' : ''} on {pnlDate}
                {pnlData.cogsCents === 0 && pnlData.transactions > 0 && (
                  <span style={{ color: '#f59e0b', marginLeft: 8 }}>
                    &mdash; Set up BOM for your items to calculate COGS
                  </span>
                )}
              </div>

              {pnlData.itemBreakdown && pnlData.itemBreakdown.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Item Breakdown
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Item', 'Qty', 'Revenue', 'COGS', 'Profit'].map(h => (
                          <th key={h} style={{ padding: '8px 16px', textAlign: h === 'Item' ? 'left' : 'right', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...pnlData.itemBreakdown].sort((a, b) => b.revenue - a.revenue).map((row, i) => {
                        const profit = row.revenue - row.cogs;
                        return (
                          <tr key={row.name} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '9px 16px', color: '#111827', fontWeight: 500 }}>{row.name}</td>
                            <td style={{ padding: '9px 16px', textAlign: 'right', color: '#374151' }}>{row.qty}</td>
                            <td style={{ padding: '9px 16px', textAlign: 'right', color: '#1d4ed8', fontWeight: 600 }}>{centsToUSD(row.revenue)}</td>
                            <td style={{ padding: '9px 16px', textAlign: 'right', color: '#dc2626' }}>{centsToUSD(row.cogs)}</td>
                            <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 600, color: profit >= 0 ? '#059669' : '#dc2626' }}>{centsToUSD(profit)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {pnlData.transactions === 0 && (
                <div style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', marginTop: 40 }}>
                  No sales recorded for this date.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
