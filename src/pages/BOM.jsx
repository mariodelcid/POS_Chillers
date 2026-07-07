import React, { useEffect, useState } from 'react';

const inp = {
  padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: 13, background: '#f9fafb', width: '100%', color: '#111827', boxSizing: 'border-box',
};

export default function BOM() {
  const [activeTab, setActiveTab] = useState('library');

  // Ingredient library
  const [ingredients, setIngredients] = useState([]);
  const [loadingIng, setLoadingIng] = useState(true);
  const [addForm, setAddForm] = useState({ name: '', category: 'ingredient', unit: 'oz', presentationQty: '', totalCostDollars: '' });
  const [addingSaving, setAddingSaving] = useState(false);

  // BOM editor
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [bomLines, setBomLines] = useState([]);
  const [loadingBom, setLoadingBom] = useState(false);
  const [newLine, setNewLine] = useState({ ingredientId: '', quantity: '' });
  const [addingLine, setAddingLine] = useState(false);

  useEffect(() => { fetchIngredients(); fetchMenuItems(); }, []);
  useEffect(() => {
    if (selectedItemId) fetchBomForItem(selectedItemId);
    else setBomLines([]);
  }, [selectedItemId]);

  const fetchIngredients = async () => {
    setLoadingIng(true);
    try {
      const res = await fetch('/api/ingredients');
      const data = await res.json();
      setIngredients(Array.isArray(data) ? data : []);
    } catch (e) { setIngredients([]); }
    finally { setLoadingIng(false); }
  };

  const fetchMenuItems = async () => {
    try {
      const res = await fetch('/api/items');
      const data = await res.json();
      setMenuItems(Array.isArray(data) ? data : []);
    } catch (e) { setMenuItems([]); }
  };

  const fetchBomForItem = async (itemId) => {
    setLoadingBom(true);
    try {
      const res = await fetch('/api/bom/' + itemId);
      const data = await res.json();
      setBomLines(Array.isArray(data) ? data : []);
    } catch (e) { setBomLines([]); }
    finally { setLoadingBom(false); }
  };

  const addIngredient = async () => {
    if (!addForm.name.trim() || !addForm.presentationQty || !addForm.totalCostDollars) {
      alert('Fill in all fields'); return;
    }
    const presentationQty = parseFloat(addForm.presentationQty);
    const totalCost = parseFloat(addForm.totalCostDollars);
    const costCents = Math.round((totalCost / presentationQty) * 100);
    setAddingSaving(true);
    try {
      const res = await fetch('/api/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(), category: addForm.category,
          unit: addForm.unit, presentationQty, presentationUnit: addForm.unit,
          costCents, stock: 0,
        }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed'); return; }
      setAddForm({ name: '', category: 'ingredient', unit: 'oz', presentationQty: '', totalCostDollars: '' });
      await fetchIngredients();
    } catch (e) { alert('Failed to add'); }
    finally { setAddingSaving(false); }
  };

  const deleteIngredient = async (id) => {
    if (!confirm('Delete this ingredient?')) return;
    await fetch('/api/ingredients/' + id, { method: 'DELETE' });
    await fetchIngredients();
  };

  const addBomLine = async () => {
    if (!newLine.ingredientId || !newLine.quantity) { alert('Select ingredient and enter quantity'); return; }
    setAddingLine(true);
    try {
      const res = await fetch('/api/bom/' + selectedItemId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientId: parseInt(newLine.ingredientId),
          quantity: parseFloat(newLine.quantity),
        }),
      });
      if (!res.ok) { const e = await res.json(); alert(e.error || 'Failed'); return; }
      setNewLine({ ingredientId: '', quantity: '' });
      await fetchBomForItem(selectedItemId);
    } catch (e) { alert('Failed to add'); }
    finally { setAddingLine(false); }
  };

  const deleteBomLine = async (bomId) => {
    if (!confirm('Remove this ingredient from the recipe?')) return;
    await fetch('/api/bom/line/' + bomId, { method: 'DELETE' });
    await fetchBomForItem(selectedItemId);
  };

  const selectedItem = menuItems.find(i => i.id === selectedItemId);
  const totalBomCents = bomLines.reduce((sum, l) => sum + Math.round(l.quantity * l.ingredient.costCents), 0);

  const ingByCategory = {
    ingredient: ingredients.filter(i => i.category === 'ingredient'),
    Packaging: ingredients.filter(i => i.category === 'Packaging'),
    disposables: ingredients.filter(i => i.category === 'disposables'),
  };

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#fff', padding: '0 8px' }}>
        {[{ id: 'library', label: 'Ingredient Library' }, { id: 'bom', label: 'Recipe / BOM Editor' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent',
            borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
            color: activeTab === tab.id ? '#2563eb' : '#6b7280',
            fontWeight: activeTab === tab.id ? 700 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -2,
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── Ingredient Library ── */}
      {activeTab === 'library' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f9fafb' }}>
          {/* Add form */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Add Ingredient / Supply</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Name</div>
                <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Elote Desgraando" style={inp} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Category</div>
                <select value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                  <option value="ingredient">Ingredient</option>
                  <option value="Packaging">Packaging</option>
                  <option value="disposables">Disposables</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Unit</div>
                <input value={addForm.unit} onChange={e => setAddForm(f => ({ ...f, unit: e.target.value }))} placeholder="oz, each..." style={inp} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Qty per purchase</div>
                <input type="number" value={addForm.presentationQty} onChange={e => setAddForm(f => ({ ...f, presentationQty: e.target.value }))} placeholder="e.g. 2400" style={{ ...inp, textAlign: 'right' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Total cost ($)</div>
                <input type="number" value={addForm.totalCostDollars} onChange={e => setAddForm(f => ({ ...f, totalCostDollars: e.target.value }))} placeholder="e.g. 40.50" style={{ ...inp, textAlign: 'right' }} />
              </div>
              <button onClick={addIngredient} disabled={addingSaving}
                style={{ padding: '8px 18px', background: addingSaving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {addingSaving ? '...' : '+ Add'}
              </button>
            </div>
            {addForm.presentationQty && addForm.totalCostDollars && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#059669' }}>
                Unit cost: ${(parseFloat(addForm.totalCostDollars) / parseFloat(addForm.presentationQty)).toFixed(4)} per {addForm.unit || 'unit'}
              </div>
            )}
          </div>

          {/* Tables by category */}
          {[['ingredient', 'Ingredients'], ['Packaging', 'Packaging'], ['disposables', 'Disposables']].map(([cat, label]) => (
            <div key={cat} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label} ({ingByCategory[cat].length})
              </div>
              {ingByCategory[cat].length === 0 ? (
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>None added yet.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['Name', 'Unit', 'Qty/Purchase', 'Unit Cost', 'Stock', ''].map(h => (
                        <th key={h} style={{ padding: '8px 16px', textAlign: h === 'Name' ? 'left' : 'right', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ingByCategory[cat].map((ing, i) => (
                      <tr key={ing.id} style={{ borderTop: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '9px 16px', fontWeight: 500 }}>{ing.name}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right' }}>{ing.unit}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right' }}>{ing.presentationQty}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                          ${(ing.costCents / 100).toFixed(4)}/{ing.unit}
                        </td>
                        <td style={{ padding: '9px 16px', textAlign: 'right', color: '#374151' }}>{ing.stock} {ing.unit}</td>
                        <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                          <button onClick={() => deleteIngredient(ing.id)}
                            style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #fca5a5', borderRadius: 5, background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── BOM Editor ── */}
      {activeTab === 'bom' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr', overflow: 'hidden' }}>
          {/* Left: menu items */}
          <div style={{ borderRight: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 10px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e5e7eb' }}>Menu Items</div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {menuItems.map(item => (
                <div key={item.id} onClick={() => setSelectedItemId(item.id)} style={{
                  padding: '9px 16px', cursor: 'pointer',
                  borderLeft: selectedItemId === item.id ? '3px solid #2563eb' : '3px solid transparent',
                  background: selectedItemId === item.id ? '#eff6ff' : 'transparent',
                  fontSize: 13, fontWeight: selectedItemId === item.id ? 600 : 400,
                  color: selectedItemId === item.id ? '#1d4ed8' : '#111827',
                }}>
                  {item.name}
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>${(item.priceCents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: BOM */}
          <div style={{ overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column' }}>
            {!selectedItem ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14 }}>
                ← Select a menu item to edit its recipe
              </div>
            ) : (
              <>
                <div style={{ padding: '14px 24px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{selectedItem.name}</span>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>Sell price: ${(selectedItem.priceCents / 100).toFixed(2)}</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                  {loadingBom ? <div style={{ color: '#9ca3af' }}>Loading...</div> : (
                    <>
                      {bomLines.length === 0 && (
                        <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16, fontStyle: 'italic' }}>No ingredients in recipe yet.</div>
                      )}
                      {bomLines.map(line => (
                        <div key={line.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px 50px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{line.ingredient.name}</span>
                          <span style={{ fontSize: 12, color: '#6b7280', textAlign: 'right' }}>{line.quantity} {line.ingredient.unit}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', color: '#374151' }}>
                            ${(line.quantity * line.ingredient.costCents / 100).toFixed(4)}
                          </span>
                          <button onClick={() => deleteBomLine(line.id)}
                            style={{ fontSize: 11, padding: '3px 7px', border: '1px solid #fca5a5', borderRadius: 5, background: '#fff', color: '#dc2626', cursor: 'pointer' }}>
                            x
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Add ingredient to recipe */}
                  <div style={{ marginTop: 20, padding: '16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Add to Recipe</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: 8, alignItems: 'end' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Ingredient</div>
                        <select value={newLine.ingredientId} onChange={e => setNewLine(l => ({ ...l, ingredientId: e.target.value }))} style={inp}>
                          <option value="">Select ingredient...</option>
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} (${(ing.costCents / 100).toFixed(4)}/{ing.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Quantity used</div>
                        <input type="number" value={newLine.quantity} onChange={e => setNewLine(l => ({ ...l, quantity: e.target.value }))}
                          placeholder="e.g. 8" style={{ ...inp, textAlign: 'right' }} min="0.001" step="any" />
                      </div>
                      <button onClick={addBomLine} disabled={addingLine}
                        style={{ padding: '8px 18px', background: addingLine ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', height: 36, alignSelf: 'flex-end' }}>
                        {addingLine ? '...' : '+ Add'}
                      </button>
                    </div>
                    {newLine.ingredientId && newLine.quantity && (() => {
                      const ing = ingredients.find(i => i.id === parseInt(newLine.ingredientId));
                      return ing ? (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#059669' }}>
                          Cost for this line: ${(ing.costCents * parseFloat(newLine.quantity) / 100).toFixed(4)}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div style={{ padding: '12px 24px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Total Recipe Cost</span>
                  {totalBomCents > 0 ? (
                    <span style={{ fontSize: 14, fontWeight: 700, color: (selectedItem.priceCents - totalBomCents) >= 0 ? '#059669' : '#dc2626' }}>
                      ${(totalBomCents / 100).toFixed(4)} &middot; Margin: ${((selectedItem.priceCents - totalBomCents) / 100).toFixed(2)} ({Math.round((selectedItem.priceCents - totalBomCents) / selectedItem.priceCents * 100)}%)
                    </span>
                  ) : (
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>No recipe cost yet</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
                       }
