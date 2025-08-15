import React, { useEffect, useState } from 'react';

export default function Packaging() {
  const [packaging, setPackaging] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchPackaging();
  }, []);

  const fetchPackaging = async () => {
    try {
      const response = await fetch('/api/packaging');
      const data = await response.json();
      
      // Define the order for packaging materials
      const packagingOrder = [
        'elote chico',
        'elote grande', 
        'charolas',
        '16clear',
        '20clear',
        '24clear'
      ];
      
      // Sort the packaging materials according to the specified order
      const sortedPackaging = data.sort((a, b) => {
        const aIndex = packagingOrder.indexOf(a.name);
        const bIndex = packagingOrder.indexOf(b.name);
        
        // If both items are in the order list, sort by their position
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        // If only one is in the order list, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // If neither is in the order list, sort alphabetically
        return a.name.localeCompare(b.name);
      });
      
      setPackaging(sortedPackaging);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching packaging:', error);
      setLoading(false);
    }
  };

  const startEditing = (item) => {
    setEditingId(item.id);
    setEditValue(item.stock.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id) => {
    try {
      const stock = parseInt(editValue);
      if (isNaN(stock) || stock < 0) {
        alert('Please enter a valid stock number');
        return;
      }

      const response = await fetch(`/api/packaging/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      });

      if (response.ok) {
        await fetchPackaging(); // Refresh the list
        setEditingId(null);
        setEditValue('');
      } else {
        alert('Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock');
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading packaging inventory...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Packaging Materials Inventory</h3>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>
        Track containers and packaging materials. Stock automatically decreases when items are sold.
      </p>
      
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '2fr 1fr auto', 
          gap: 16, 
          padding: '12px 16px', 
          fontWeight: 600, 
          borderBottom: '2px solid #eee',
          background: '#f9fafb'
        }}>
          <div>Packaging Material</div>
          <div style={{ textAlign: 'center' }}>Current Stock</div>
          <div style={{ textAlign: 'center' }}>Actions</div>
        </div>
        
        {packaging.map((item) => (
          <div key={item.id} style={{ 
            display: 'grid', 
            gridTemplateColumns: '2fr 1fr auto', 
            gap: 16, 
            padding: '12px 16px', 
            alignItems: 'center', 
            borderBottom: '1px solid #f3f4f6',
            background: (item.name === 'sopas' && item.stock <= 3) || (item.name !== 'sopas' && item.stock <= 10) ? '#fef2f2' : '#fff'
          }}>
            <div>
              <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{item.name}</div>
              {((item.name === 'sopas' && item.stock <= 3) || (item.name !== 'sopas' && item.stock <= 10)) && (
                <div style={{ fontSize: '0.8em', color: '#dc2626', fontWeight: 500 }}>
                  ⚠️ Low Stock Alert
                </div>
              )}
            </div>
            
            <div style={{ textAlign: 'center' }}>
              {editingId === item.id ? (
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{
                    width: '80px',
                    padding: '4px 8px',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    textAlign: 'center'
                  }}
                  min="0"
                />
              ) : (
                <span style={{
                  fontWeight: 600,
                  color: (item.name === 'sopas' && item.stock <= 3) || (item.name !== 'sopas' && item.stock <= 10) ? '#dc2626' : 
                         (item.name === 'sopas' && item.stock <= 10) || (item.name !== 'sopas' && item.stock <= 25) ? '#f59e0b' : '#059669'
                }}>
                  {item.stock}
                </span>
              )}
            </div>
            
            <div style={{ textAlign: 'center' }}>
              {editingId === item.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => saveEdit(item.id)}
                    style={{
                      padding: '4px 8px',
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: '0.8em'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditing}
                    style={{
                      padding: '4px 8px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: '0.8em'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEditing(item)}
                  style={{
                    padding: '6px 12px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: '0.8em'
                  }}
                >
                  Edit Stock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: 24, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #0ea5e9' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>How it works:</h4>
        <ul style={{ margin: 0, paddingLeft: 20, color: '#0369a1' }}>
          <li>When customers buy items, the corresponding packaging stock automatically decreases</li>
          <li>Red background = critically low stock (≤10 units, sopas ≤3 units)</li>
          <li>Yellow numbers = low stock (≤25 units, sopas ≤10 units)</li>
          <li>Green numbers = good stock levels</li>
          <li>Click "Edit Stock" to manually adjust quantities when restocking</li>
        </ul>
      </div>
    </div>
  );
}

