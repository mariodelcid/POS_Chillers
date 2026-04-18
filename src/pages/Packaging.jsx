import React, { useState, useEffect } from 'react';

export default function Inventory() {
  const [packaging, setPackaging] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClockIn, setShowClockIn] = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [addValue, setAddValue] = useState('');

  useEffect(() => {
    fetchPackaging();
  }, []);

  const fetchPackaging = async () => {
    try {
      const response = await fetch('/api/packaging');
      const data = await response.json();
      const packagingOrder = [
        '24clear', '20clear', '16clear', 'nievecup', 'elote grande',
        'elote chico', 'elote', 'charolas', 'chetos', 'conchitas',
        'sopas', 'takis', 'tostitos', 'doritos'
      ];
      const sortedPackaging = data.sort((a, b) => {
        const aIndex = packagingOrder.indexOf(a.name);
        const bIndex = packagingOrder.indexOf(b.name);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      setPackaging(sortedPackaging);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching packaging:', error);
      setLoading(false);
    }
  };

  const startAdding = (item) => {
    setAddingId(item.id);
    setAddValue('');
  };

  const cancelAdding = () => {
    setAddingId(null);
    setAddValue('');
  };

  const saveAdd = async (id, currentStock) => {
    try {
      const amount = parseInt(addValue);
      if (isNaN(amount) || amount <= 0) {
        alert('Please enter a valid amount to add');
        return;
      }
      const newStock = currentStock + amount;
      const response = await fetch('/api/packaging/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock }),
      });
      if (response.ok) {
        await fetchPackaging();
        setAddingId(null);
        setAddValue('');
      } else {
        alert('Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock');
    }
  };

  const handleClockIn = async () => {
    if (!employeeName.trim()) { alert('Please enter employee name'); return; }
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName: employeeName.trim(), type: 'clock_in', timestamp: new Date().toISOString() })
      });
      if (response.ok) {
        alert('Employee ' + employeeName + ' clocked in successfully!');
        setEmployeeName('');
        setShowClockIn(false);
      } else { alert('Failed to clock in. Please try again.'); }
    } catch { alert('Failed to clock in. Please try again.'); }
  };

  const handleClockOut = async () => {
    if (!employeeName.trim()) { alert('Please enter employee name'); return; }
    try {
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName: employeeName.trim(), type: 'clock_out', timestamp: new Date().toISOString() })
      });
      if (response.ok) {
        alert('Employee ' + employeeName + ' clocked out successfully!');
        setEmployeeName('');
        setShowClockOut(false);
      } else { alert('Failed to clock out. Please try again.'); }
    } catch { alert('Failed to clock out. Please try again.'); }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading inventory...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Inventory</h3>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        Track containers and packaging materials. Stock automatically decreases when items are sold.
      </p>

      {/* Clock In/Out Section */}
      <div style={{ marginBottom: 24, padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <h4 style={{ margin: '0 0 16px 0' }}>Employee Time Tracking</h4>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setShowClockIn(true)} style={{ padding: '12px 24px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Clock In</button>
          <button onClick={() => setShowClockOut(true)} style={{ padding: '12px 24px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Clock Out</button>
        </div>

        {showClockIn && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', minWidth: '300px' }}>
              <h4 style={{ margin: '0 0 16px 0' }}>Clock In</h4>
              <input type="text" placeholder="Enter employee name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '16px' }} onKeyPress={(e) => e.key === 'Enter' && handleClockIn()} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleClockIn} style={{ padding: '8px 16px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Clock In</button>
                <button onClick={() => { setShowClockIn(false); setEmployeeName(''); }} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showClockOut && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', minWidth: '300px' }}>
              <h4 style={{ margin: '0 0 16px 0' }}>Clock Out</h4>
              <input type="text" placeholder="Enter employee name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '16px' }} onKeyPress={(e) => e.key === 'Enter' && handleClockOut()} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleClockOut} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Clock Out</button>
                <button onClick={() => { setShowClockOut(false); setEmployeeName(''); }} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inventory Table */}
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 16, padding: '8px 16px', fontWeight: 600, borderBottom: '1px solid #eee' }}>
          <div>Packaging Material</div>
          <div>Current Stock</div>
          <div>Add Stock</div>
        </div>
        {packaging.map((item) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 16, padding: '8px 16px', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{item.name}</div>
              {item.name === 'elote' && (
                <div style={{ fontSize: '0.8em', color: '#6b7280' }}>Box: 480 oz | Elote Chico: -8 oz | Elote Grande: -14 oz</div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontWeight: 600, color: item.stock < 50 ? '#dc2626' : item.stock < 100 ? '#f59e0b' : '#059669' }}>
                {item.name === 'elote' ? (item.stock / 480).toFixed(2) + ' boxes' : item.stock}
              </span>
            </div>
            <div style={{ textAlign: 'center' }}>
              {addingId === item.id ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    value={addValue}
                    onChange={(e) => setAddValue(e.target.value)}
                    placeholder="Qty"
                    style={{ width: '70px', padding: '4px 8px', border: '1px solid #ddd', borderRadius: 4, textAlign: 'center' }}
                    min="1"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && saveAdd(item.id, item.stock)}
                  />
                  <button onClick={() => saveAdd(item.id, item.stock)} style={{ padding: '4px 8px', background: '#059669', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8em' }}>Add</button>
                  <button onClick={cancelAdding} style={{ padding: '4px 8px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8em' }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => startAdding(item)} style={{ padding: '6px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.8em' }}>+ Add</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f8fafc', borderRadius: 8 }}>
        <h4 style={{ margin: '0 0 12px 0' }}>How It Works</h4>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>When customers buy items, the corresponding packaging stock automatically decreases</li>
          <li>Elote items deduct ounces from the elote box (480 oz per box)</li>
          <li>Red numbers indicate low stock (below 50)</li>
          <li>Yellow numbers indicate medium stock (below 100)</li>
          <li>Green numbers indicate good stock levels</li>
        </ul>
      </div>
    </div>
  );
}
