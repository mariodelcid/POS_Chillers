import React, { useEffect, useMemo, useState } from 'react';

function centsToUSD(cents) {
  if (Math.abs(cents) < 100) {
    const prefix = cents < 0 ? '-$' : '$';
    return prefix + Math.abs(cents / 100).toFixed(2);
  }
  return '$' + Math.round(cents / 100);
}

export default function POS() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]); // {itemId, name, priceCents, quantity}
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tender, setTender] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [showPurchaseInput, setShowPurchaseInput] = useState(false);
  const [showClockIn, setShowClockIn] = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAmount, setCelebrationAmount] = useState('');

  useEffect(() => {
    fetch('/api/items').then((r) => r.json()).then(setItems);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category).push(it);
    }

    const snacksOrder = [
      'Elote Chico',
      'Elote Grande',
      'Elote Entero',
      'Takis',
      'Cheetos',
      'Conchitas',
      'Tostitos'
    ];

    const categoryOrder = ['SNACKS', 'CHAMOYADAS', 'REFRESHERS', 'MILK SHAKES', 'BOBAS'];

    const sortedCategories = Array.from(map.entries()).sort(([a], [b]) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedCategories.map(([category, list]) => {
      let sortedList = list;
      if (category === 'SNACKS') {
        sortedList = list.sort((a, b) => {
          const aIndex = snacksOrder.indexOf(a.name);
          const bIndex = snacksOrder.indexOf(b.name);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
      } else {
        sortedList = list.sort((a, b) => a.name.localeCompare(b.name));
      }
      return { category, list: sortedList };
    });
  }, [items]);

  const subtotalCents = cart.reduce((s, l) => s + l.priceCents * l.quantity, 0);
  const totalCents = subtotalCents;
  const tenderCents = Math.round(parseFloat(tender || '0') * 100);
  const changeCents = paymentMethod === 'cash' ? Math.max(0, tenderCents - totalCents) : 0;

  function addToCart(item) {
    setCart((prev) => {
      const found = prev.find((l) => l.itemId === item.id);
      if (found) {
        return prev.map((l) => (l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { itemId: item.id, name: item.name, priceCents: item.priceCents, quantity: 1 }];
    });
  }

  function updateQty(itemId, delta) {
    setCart((prev) => prev
      .map((l) => (l.itemId === itemId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
      .filter((l) => l.quantity > 0));
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function playCashDrawerSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }

  async function completeOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
          paymentMethod,
          amountTenderedCents: paymentMethod === 'cash' ? tenderCents : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete order');
      setMessage(`Sale ${data.saleId} complete. Total ${centsToUSD(data.totalCents)}${paymentMethod === 'cash' ? `, Change ${centsToUSD(data.changeDueCents)}` : ''}`);
      setCart([]);
        setCelebrationAmount(centsToUSD(data.totalCents));
        setShowCelebration(true);
        setTimeout(() => { setShowCelebration(false); setCelebrationAmount(''); }, 3000);
      setTender('');
      playCashDrawerSound();
      fetch('/api/items').then((r) => r.json()).then(setItems);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function clearCart() {
    setCart([]);
    setTender('');
    setMessage('');
  }

  async function recordPurchase() {
    if (!purchaseAmount || parseFloat(purchaseAmount) <= 0) {
      setMessage('Please enter a valid purchase amount');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const purchaseCents = Math.round(parseFloat(purchaseAmount) * 100);
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: purchaseCents, description: 'Daily purchase' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record purchase');
      setMessage(`Purchase recorded: ${centsToUSD(purchaseCents)}`);
      setPurchaseAmount('');
      setShowPurchaseInput(false);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const handleClockIn = async () => {
    if (!employeeName.trim()) { alert('Please enter employee name'); return; }
    try {
      const response = await fetch('/api/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName: employeeName.trim(), type: 'clock_in', timestamp: new Date().toISOString() })
      });
      if (response.ok) {
        alert(`${employeeName} clocked in!`);
        setEmployeeName('');
        setShowClockIn(false);
      } else {
        alert('Failed to clock in. Please try again.');
      }
    } catch {
      alert('Failed to clock in. Please try again.');
    }
  };

  const handleClockOut = async () => {
    if (!employeeName.trim()) { alert('Please enter employee name'); return; }
    try {
      const response = await fetch('/api/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName: employeeName.trim(), type: 'clock_out', timestamp: new Date().toISOString() })
      });
      if (response.ok) {
        alert(`${employeeName} clocked out!`);
        setEmployeeName('');
        setShowClockOut(false);
      } else {
        alert('Failed to clock out. Please try again.');
      }
    } catch {
      alert('Failed to clock out. Please try again.');
    }
  };

  const quickTenderAmounts = [5, 10, 20, 50, 100];

  const canComplete = cart.length > 0 && !submitting &&
    (paymentMethod === 'credit' || tenderCents >= totalCents);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 60px)', gap: 0 }}>
      {/* Left Side - All Items (Scrollable) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        borderRight: '2px solid #e5e7eb',
        height: '100%',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          overflow: 'auto',
          flex: 1,
          backgroundColor: '#ffffff',
          height: '100%'
        }}>
          {grouped.map(({ category, list }) => (
            <div key={category} style={{ marginBottom: '32px' }}>
              <div style={{
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderBottom: '2px solid #e5e7eb',
                marginBottom: '16px',
                borderRadius: '8px'
              }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>
                  {category}
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {list.map((it) => {
                  let backgroundColor = '#ffffff';
                  let borderColor = '#e5e7eb';
                  if (it.category === 'SNACKS') { backgroundColor = '#f0fdf4'; borderColor = '#22c55e'; }
                  else if (it.category === 'CHAMOYADAS') { backgroundColor = '#fefce8'; borderColor = '#fbbf24'; }
                  else if (it.category === 'REFRESHERS') { backgroundColor = '#eff6ff'; borderColor = '#3b82f6'; }
                  else if (it.category === 'MILK SHAKES') { backgroundColor = '#fee2e2'; borderColor = '#ef4444'; }
                  else if (it.category === 'BOBAS') { backgroundColor = '#fdf2f8'; borderColor = '#ec4899'; }

                  return (
                    <button
                      key={it.id}
                      onClick={() => addToCart(it)}
                      style={{
                        padding: '12px',
                        textAlign: 'left',
                        border: `2px solid ${borderColor}`,
                        borderRadius: '12px',
                        background: backgroundColor,
                        cursor: 'pointer',
                        fontSize: '16px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        minHeight: '80px',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ fontWeight: '600', fontSize: '16px', lineHeight: '1.1' }}>{it.name}</div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669', marginTop: 'auto' }}>
                        {centsToUSD(it.priceCents)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Cart and Checkout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        padding: '20px',
        height: '100%',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
            Current Order
          </h2>
          <button
            onClick={clearCart}
            style={{
              padding: '8px 16px',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Clear Cart
          </button>
        </div>

        {/* Cart Items */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          border: '1px solid #e5e7eb',
          minHeight: '80px'
        }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '16px', padding: '20px' }}>
              No items in cart
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cart.map((l) => (
                <div key={l.itemId} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto auto auto',
                  gap: '12px',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontWeight: '500', fontSize: '16px' }}>{l.name}</div>
                  <div style={{ fontSize: '16px', color: '#059669', fontWeight: '600' }}>
                    {centsToUSD(l.priceCents)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => updateQty(l.itemId, -1)} style={{ width: '32px', height: '32px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>-</button>
                    <span style={{ margin: '0 8px', fontSize: '16px', fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>{l.quantity}</span>
                    <button onClick={() => updateQty(l.itemId, 1)} style={{ width: '32px', height: '32px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>+</button>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: '700', color: '#059669' }}>
                    {centsToUSD(l.priceCents * l.quantity)}
                  </div>
                  <button onClick={() => removeFromCart(l.itemId)} style={{ padding: '4px 8px', border: '1px solid #dc2626', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>Ã</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Total */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', fontSize: '16px' }}>
            <div style={{ color: '#6b7280' }}>Total</div>
            <div style={{ fontWeight: '700', fontSize: '20px' }}>{centsToUSD(totalCents)}</div>
          </div>
        </div>

        {/* Payment Method */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Payment Method</h3>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px',
              border: `2px solid ${paymentMethod === 'cash' ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: '8px', backgroundColor: paymentMethod === 'cash' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer', flex: 1, justifyContent: 'center', fontWeight: '500'
            }}>
              <input type="radio" name="pm" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} style={{ margin: 0 }} />
              Cash
            </label>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px',
              border: `2px solid ${paymentMethod === 'credit' ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: '8px', backgroundColor: paymentMethod === 'credit' ? '#eff6ff' : '#ffffff',
              cursor: 'pointer', flex: 1, justifyContent: 'center', fontWeight: '500'
            }}>
              <input type="radio" name="pm" value="credit" checked={paymentMethod === 'credit'} onChange={() => setPaymentMethod('credit')} style={{ margin: 0 }} />
              Credit
            </label>
          </div>

          {paymentMethod === 'cash' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Amount Tendered:</label>
                <input
                  type="number" step="0.01" value={tender}
                  onChange={(e) => setTender(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '18px', fontWeight: '600' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {quickTenderAmounts.map(amount => (
                  <button key={amount} onClick={() => setTender(amount.toString())} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    ${amount}
                  </button>
                ))}
              </div>
              {tenderCents > 0 && (
                <div style={{ padding: '12px', backgroundColor: changeCents >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '8px', border: `1px solid ${changeCents >= 0 ? '#22c55e' : '#dc2626'}`, textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: changeCents >= 0 ? '#059669' : '#dc2626' }}>
                    Change: {centsToUSD(changeCents)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Complete Order Button */}
        <button
          disabled={!canComplete}
          onClick={completeOrder}
          style={{
            width: '100%',
            padding: '20px',
            background: canComplete ? '#059669' : '#9ca3af',
            color: '#ffffff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '20px',
            fontWeight: '700',
            cursor: canComplete ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            marginBottom: '12px'
          }}
        >
          {submitting ? 'Processing...' : 'Complete Order'}
        </button>

        {/* Compras Button */}
        <div style={{ marginBottom: '12px' }}>
          {!showPurchaseInput ? (
            <button
              onClick={() => setShowPurchaseInput(true)}
              style={{ width: '100%', padding: '16px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Compras
            </button>
          ) : (
            <div style={{ padding: '16px', border: '2px solid #dc2626', borderRadius: '12px', backgroundColor: '#fef2f2' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#dc2626' }}>Purchase Amount ($)</label>
                <input
                  type="number" step="0.01" min="0" value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px', border: '1px solid #dc2626', borderRadius: '8px', fontSize: '16px', fontWeight: '600' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={recordPurchase} disabled={submitting || !purchaseAmount} style={{ flex: 1, padding: '12px', background: submitting || !purchaseAmount ? '#9ca3af' : '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: submitting || !purchaseAmount ? 'not-allowed' : 'pointer' }}>
                  {submitting ? 'Recording...' : 'Record Purchase'}
                </button>
                <button onClick={() => { setShowPurchaseInput(false); setPurchaseAmount(''); }} style={{ padding: '12px 16px', background: '#6b7280', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message */}
        {message && (
          <div style={{
            marginBottom: '12px',
            padding: '12px',
            backgroundColor: message.includes('complete') || message.includes('recorded') ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.includes('complete') || message.includes('recorded') ? '#22c55e' : '#dc2626'}`,
            borderRadius: '8px',
            color: message.includes('complete') || message.includes('recorded') ? '#059669' : '#dc2626',
            fontSize: '16px',
            fontWeight: '500',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {/* Employee Time Tracking */}
        <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>Employee Time Tracking</h4>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowClockIn(true)} style={{ flex: 1, padding: '12px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>
              Clock In
            </button>
            <button onClick={() => setShowClockOut(true)} style={{ flex: 1, padding: '12px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>
              Clock Out
            </button>
          </div>
        </div>

        {/* Clock In Modal */}
        {showClockIn && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', minWidth: '300px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700' }}>Clock In</h4>
              <input
                type="text" placeholder="Enter employee name" value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleClockIn()}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '16px', fontSize: '16px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleClockIn} style={{ flex: 1, padding: '10px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>Clock In</button>
                <button onClick={() => { setShowClockIn(false); setEmployeeName(''); }} style={{ padding: '10px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Clock Out Modal */}
        {showClockOut && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', minWidth: '300px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700' }}>Clock Out</h4>
              <input
                type="text" placeholder="Enter employee name" value={employeeName}
                onChange={e => setEmployeeName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleClockOut()}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '16px', fontSize: '16px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleClockOut} style={{ flex: 1, padding: '10px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>Clock Out</button>
                <button onClick={() => { setShowClockOut(false); setEmployeeName(''); }} style={{ padding: '10px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showCelebration && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,140,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '336px', fontWeight: '900', color: 'white', textShadow: '0 4px 20px rgba(0,0,0,0.5)', lineHeight: 1 }}>{celebrationAmount}</div>
          <div style={{ fontSize: '52px', fontWeight: 'bold', color: 'white', textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>SALE COMPLETE!</div>
        </div>
      )}
    </div>
  );
}
