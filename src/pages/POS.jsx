import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

function centsToUSD(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ââ Confetti burst (CSS-only, no emoji) âââââââââââââââââââââââââââââââââââââââ
function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#facc15','#22c55e','#3b82f6','#f472b6','#a78bfa','#fb923c','#34d399','#f87171'];
    const shapes = ['circle', 'rect', 'rect'];
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.4}s`,
      duration: `${1.0 + Math.random() * 0.8}s`,
      w: `${8 + Math.random() * 10}px`,
      h: `${6 + Math.random() * 8}px`,
      shape: shapes[i % shapes.length],
      startRotate: Math.random() * 360,
    }));
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 2147483646, overflow: 'hidden' }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-30px) rotate(0deg) scaleX(1);   opacity: 1; }
          50%  { transform: translateY(50vh)  rotate(360deg) scaleX(-1); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg) scaleX(1);  opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: 0, left: p.left,
          width: p.w, height: p.h,
          background: p.color,
          borderRadius: p.shape === 'circle' ? '50%' : '2px',
          animation: `confettiFall ${p.duration} ${p.delay} ease-in forwards`,
          transform: `rotate(${p.startRotate}deg)`,
        }} />
      ))}
    </div>
  );
}

// ââ Full-screen sale complete overlay âââââââââââââââââââââââââââââââââââââââââ
function SaleCompleteOverlay({ sale, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isCash   = sale.paymentMethod === 'cash';
  const hasChange = isCash && sale.changeDueCents > 0;
  const bg = isCash ? '#059669' : '#1d4ed8';

  return createPortal(
    <>
      <Confetti />
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        zIndex: 2147483647,
        background: bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        margin: 0, padding: 0, boxSizing: 'border-box',
      }} onClick={onDismiss}>
        <style>{`
          @keyframes saleZoomIn {
            from { transform: scale(0.4); opacity: 0; }
            to   { transform: scale(1);   opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(40px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* SALE COMPLETE label */}
        <div style={{
          fontSize: 'clamp(20px, 3vw, 36px)',
          fontWeight: 900,
          color: 'rgba(255,255,255,0.75)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          animation: 'slideUp 0.25s ease-out both',
          marginBottom: 4,
        }}>
          SALE COMPLETE
        </div>

        {/* MASSIVE total â camera-readable from above */}
        <div style={{
          fontSize: 'min(30vw, 38vh)',
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          animation: 'saleZoomIn 0.3s 0.05s cubic-bezier(0.34,1.56,0.64,1) both',
          textShadow: '0 6px 48px rgba(0,0,0,0.3)',
        }}>
          {centsToUSD(sale.totalCents)}
        </div>

        {/* Change due */}
        {hasChange && (
          <div style={{
            marginTop: 16,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 16,
            padding: '12px 36px',
            textAlign: 'center',
            animation: 'slideUp 0.3s 0.15s ease-out both',
          }}>
            <div style={{ fontSize: 'clamp(14px, 2vw, 24px)', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
              CHANGE DUE
            </div>
            <div style={{
              fontSize: 'clamp(36px, 7vw, 100px)',
              fontWeight: 900, color: '#fff',
              lineHeight: 1, letterSpacing: '-0.02em',
            }}>
              {centsToUSD(sale.changeDueCents)}
            </div>
          </div>
        )}

        {/* Credit badge */}
        {!isCash && (
          <div style={{
            marginTop: 12,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 12,
            padding: '10px 28px',
            fontSize: 'clamp(16px, 2vw, 26px)', fontWeight: 700, color: '#fff',
            animation: 'slideUp 0.3s 0.15s ease-out both',
          }}>
            CREDIT CARD
          </div>
        )}
      </div>
    </>,
    document.body
  );
}

// ââ Celebration sound via Web Audio API âââââââââââââââââââââââââââââââââââââââ
function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const play = (freq, start, dur, vol = 0.25) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(vol, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    };

    // Happy ascending arpeggio
    play(523, 0.00, 0.18); // C5
    play(659, 0.12, 0.18); // E5
    play(784, 0.24, 0.18); // G5
    play(1047,0.36, 0.30); // C6

    // Little shimmer after
    play(1319,0.55, 0.15, 0.12);
    play(1175,0.65, 0.15, 0.10);
    play(1047,0.75, 0.20, 0.08);
  } catch (e) {
    console.log('Audio play failed:', e);
  }
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
  const [saleComplete, setSaleComplete] = useState(null); // { saleId, totalCents, changeDueCents, paymentMethod }

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
      'Elote Chico', 'Elote Grande', 'Elote Entero',
      'Takis', 'Cheetos', 'Conchitas', 'Tostitos',
    ];

    const categoryOrder = ['SNACKS', 'CHAMOYADAS', 'REFRESHERS', 'MILK SHAKES', 'BOBAS'];

    const sortedCategories = Array.from(map.entries()).sort(([a], [b]) => {
      const aI = categoryOrder.indexOf(a);
      const bI = categoryOrder.indexOf(b);
      if (aI !== -1 && bI !== -1) return aI - bI;
      if (aI !== -1) return -1;
      if (bI !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedCategories.map(([category, list]) => {
      let sortedList = list;
      if (category === 'SNACKS') {
        sortedList = list.sort((a, b) => {
          const aI = snacksOrder.indexOf(a.name);
          const bI = snacksOrder.indexOf(b.name);
          if (aI !== -1 && bI !== -1) return aI - bI;
          if (aI !== -1) return -1;
          if (bI !== -1) return 1;
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

  async function completeOrder() {
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

      // Show celebration popup
      setSaleComplete({
        saleId: data.saleId,
        totalCents: data.totalCents,
        changeDueCents: data.changeDueCents || 0,
        paymentMethod,
      });

      playCelebrationSound();
      setCart([]);
      setTender('');
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

  const quickTenderAmounts = [5, 10, 20, 50, 100];

  return (
    <>
      {/* Sale complete overlay */}
      {saleComplete && (
        <SaleCompleteOverlay
          sale={saleComplete}
          onDismiss={() => setSaleComplete(null)}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 60px)', gap: 0 }}>
        {/* Left Side - All Items (Scrollable) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          borderRight: '2px solid #e5e7eb',
          height: '100%',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '20px',
            overflow: 'auto',
            flex: 1,
            backgroundColor: '#ffffff',
            height: '100%',
          }}>
            {grouped.map(({ category, list }) => (
              <div key={category} style={{ marginBottom: '32px' }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e5e7eb',
                  marginBottom: '16px',
                  borderRadius: '8px',
                }}>
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>
                    {category}
                  </h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {list.map((it) => {
                    let backgroundColor = '#ffffff';
                    let borderColor = '#e5e7eb';
                    if (it.category === 'SNACKS')      { backgroundColor = '#f0fdf4'; borderColor = '#22c55e'; }
                    else if (it.category === 'CHAMOYADAS') { backgroundColor = '#fefce8'; borderColor = '#fbbf24'; }
                    else if (it.category === 'REFRESHERS') { backgroundColor = '#eff6ff'; borderColor = '#3b82f6'; }
                    else if (it.category === 'MILK SHAKES') { backgroundColor = '#fee2e2'; borderColor = '#ef4444'; }
                    else if (it.category === 'BOBAS')  { backgroundColor = '#fdf2f8'; borderColor = '#ec4899'; }

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
                          justifyContent: 'center',
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
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb',
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
                fontWeight: '500',
              }}
            >
              Clear Cart
            </button>
          </div>

          {/* Cart Items */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px',
            border: '1px solid #e5e7eb',
          }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '16px', padding: '40px 20px' }}>
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
                    border: '1px solid #e5e7eb',
                  }}>
                    <div style={{ fontWeight: '500', fontSize: '16px' }}>{l.name}</div>
                    <div style={{ fontSize: '16px', color: '#059669', fontWeight: '600' }}>
                      {centsToUSD(l.priceCents)}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button onClick={() => updateQty(l.itemId, -1)}
                        style={{ width: '32px', height: '32px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
                        -
                      </button>
                      <span style={{ margin: '0 8px', fontSize: '16px', fontWeight: '600', minWidth: '20px', textAlign: 'center' }}>
                        {l.quantity}
                      </span>
                      <button onClick={() => updateQty(l.itemId, 1)}
                        style={{ width: '32px', height: '32px', border: '1px solid #d1d5db', borderRadius: '4px', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}>
                        +
                      </button>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: '700', color: '#059669' }}>
                      {centsToUSD(l.priceCents * l.quantity)}
                    </div>
                    <button onClick={() => removeFromCart(l.itemId)}
                      style={{ padding: '4px 8px', border: '1px solid #dc2626', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>
                      X
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', fontSize: '16px' }}>
              <div style={{ color: '#6b7280' }}>Total</div>
              <div style={{ fontWeight: '600' }}>{centsToUSD(totalCents)}</div>
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>Payment Method</h3>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {['cash', 'credit'].map(pm => (
                <label key={pm} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '12px 16px',
                  border: `2px solid ${paymentMethod === pm ? '#2563eb' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  backgroundColor: paymentMethod === pm ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer', flex: 1, justifyContent: 'center', fontWeight: '500',
                }}>
                  <input type="radio" name="pm" value={pm} checked={paymentMethod === pm}
                    onChange={() => setPaymentMethod(pm)} style={{ margin: 0 }} />
                  {pm === 'cash' ? 'Cash' : 'Credit'}
                </label>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Amount Tendered:
                  </label>
                  <input
                    type="number" step="0.01" value={tender}
                    onChange={(e) => setTender(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '18px', fontWeight: '600' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {quickTenderAmounts.map(amount => (
                    <button key={amount} onClick={() => setTender(amount.toString())}
                      style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                      ${amount}
                    </button>
                  ))}
                </div>
                {tenderCents > 0 && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: changeCents >= 0 ? '#f0fdf4' : '#fef2f2',
                    borderRadius: '8px',
                    border: `1px solid ${changeCents >= 0 ? '#22c55e' : '#dc2626'}`,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: changeCents >= 0 ? '#059669' : '#dc2626' }}>
                      Change: {centsToUSD(changeCents)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Complete Order */}
          <button
            disabled={cart.length === 0 || submitting || (paymentMethod === 'cash' && tenderCents < totalCents)}
            onClick={completeOrder}
            style={{
              width: '100%', padding: '20px',
              background: cart.length === 0 || submitting || (paymentMethod === 'cash' && tenderCents < totalCents)
                ? '#9ca3af' : '#059669',
              color: '#ffffff', border: 'none', borderRadius: '12px',
              fontSize: '20px', fontWeight: '700',
              cursor: cart.length === 0 || submitting || (paymentMethod === 'cash' && tenderCents < totalCents)
                ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', marginBottom: '12px',
            }}
          >
            {submitting ? 'Processing...' : 'Complete Order'}
          </button>

          {/* Compras */}
          <div style={{ marginBottom: '12px' }}>
            {!showPurchaseInput ? (
              <button onClick={() => setShowPurchaseInput(true)}
                style={{ width: '100%', padding: '16px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: '700', cursor: 'pointer' }}>
                Compras
              </button>
            ) : (
              <div style={{ padding: '16px', border: '2px solid #dc2626', borderRadius: '12px', backgroundColor: '#fef2f2' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#dc2626' }}>
                    Purchase Amount ($)
                  </label>
                  <input type="number" step="0.01" min="0" value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)} placeholder="0.00"
                    style={{ width: '100%', padding: '12px', border: '1px solid #dc2626', borderRadius: '8px', fontSize: '16px', fontWeight: '600' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={recordPurchase} disabled={submitting || !purchaseAmount}
                    style={{ flex: 1, padding: '12px', background: submitting || !purchaseAmount ? '#9ca3af' : '#dc2626', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: submitting || !purchaseAmount ? 'not-allowed' : 'pointer' }}>
                    {submitting ? 'Recording...' : 'Record Purchase'}
                  </button>
                  <button onClick={() => { setShowPurchaseInput(false); setPurchaseAmount(''); }}
                    style={{ padding: '12px 16px', background: '#6b7280', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {message && (
            <div style={{
              marginTop: '16px', padding: '12px',
              backgroundColor: '#fef2f2', border: '1px solid #dc2626',
              borderRadius: '8px', color: '#dc2626',
              fontSize: '16px', fontWeight: '500', textAlign: 'center',
            }}>
              {message}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
