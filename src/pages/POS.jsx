import React, { useEffect, useMemo, useState } from 'react';

function centsToUSD(cents) { return `$${(cents / 100).toFixed(2)}`; }

export default function POS() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tender, setTender] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [showPurchaseInput, setShowPurchaseInput] = useState(false);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('cash');
  const [purchaseReceipt, setPurchaseReceipt] = useState(null);
  const [showClockIn, setShowClockIn] = useState(false);
  const [showClockOut, setShowClockOut] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAmount, setCelebrationAmount] = useState('');

  useEffect(() => {
    fetch('/api/items').then((r) => r.json()).then(setItems);

    const urlParams = new URLSearchParams(window.location.search);
    const squareCallback = urlParams.get('square_callback');
    const status = urlParams.get('status');
    const transactionId = urlParams.get('transaction_id');

    if (squareCallback === '1') {
      window.history.replaceState({}, document.title, window.location.pathname);
      const savedCart = JSON.parse(localStorage.getItem('pendingSquareCart') || 'null');
      const savedPaymentMethod = localStorage.getItem('pendingSquarePaymentMethod') || 'credit';
      localStorage.removeItem('pendingSquareCart');
      localStorage.removeItem('pendingSquarePaymentMethod');

      if ((status === 'ok' || status === 'success' || status === 'COMPLETED') && savedCart && savedCart.length > 0) {
        const autoComplete = async () => {
          try {
            const res = await fetch('/api/sales', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: savedCart.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
                paymentMethod: savedPaymentMethod,
              }),
            });
            const data = await res.json();
            if (res.ok) {
              setCelebrationAmount(centsToUSD(data.totalCents));
              setShowCelebration(true);
              setTimeout(() => { setShowCelebration(false); setCelebrationAmount(''); }, 2500);
              setMessage('Sale ' + data.saleId + ' complete. Total ' + centsToUSD(data.totalCents) + (transactionId ? ' | Tx: ' + transactionId : ''));
              playCashDrawerSound();
              fetch('/api/items').then((r) => r.json()).then(setItems);
            } else {
              setMessage('Payment received but sale recording failed: ' + (data.error || 'unknown error'));
            }
          } catch (e) {
            setMessage('Payment received but sale recording failed: ' + e.message);
          }
        };
        autoComplete();
      } else if (status === 'cancel' || status === 'CANCELED') {
        if (savedCart) setCart(savedCart);
        setPaymentMethod('credit');
        setMessage('Payment was cancelled. Your cart has been restored.');
      } else if (status === 'error' || status === 'FAILED') {
        if (savedCart) setCart(savedCart);
        setPaymentMethod('credit');
        setMessage('Payment failed. Your cart has been restored. Please try again.');
      } else {
        setMessage('Payment processed. Status: ' + (status || 'unknown') + (transactionId ? ' | Transaction: ' + transactionId : ''));
      }
    }
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.category)) map.set(it.category, []);
      map.get(it.category).push(it);
    }
    const snacksOrder = ['Elote Chico', 'Elote Grande', 'Elote Entero', 'Takis', 'Cheetos', 'Conchitas', 'Tostitos'];
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
      if (found) return prev.map((l) => (l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { itemId: item.id, name: item.name, priceCents: item.priceCents, quantity: 1 }];
    });
  }

  function updateQty(itemId, delta) {
    setCart((prev) =>
      prev.map((l) => (l.itemId === itemId ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  function removeFromCart(itemId) {
    setCart((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function playCashDrawerSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }

  const handleCreditSelection = () => {
    setPaymentMethod('credit');
    setMessage('');
  };

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
      if (!res.ok) throw new Error(data.error || `Server error: ${res.status}`);
      setCelebrationAmount(centsToUSD(data.totalCents));
      setShowCelebration(true);
      setTimeout(() => { setShowCelebration(false); setCelebrationAmount(''); }, 2500);
      setMessage(`Sale ${data.saleId} complete. Total ${centsToUSD(data.totalCents)}${paymentMethod === 'cash' ? `, Change ${centsToUSD(data.changeDueCents)}` : ''}`);
      setCart([]);
      setTender('');
      playCashDrawerSound();
      fetch('/api/items').then((r) => r.json()).then(setItems);
    } catch (e) {
      setMessage(`Error: ${e.message}`);
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
        body: JSON.stringify({ amountCents: purchaseCents, description: 'Daily purchase', paymentMethod: purchasePaymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record purchase');
      setMessage(`Purchase recorded: ${centsToUSD(purchaseCents)} (${purchasePaymentMethod})`);
      setPurchaseAmount('');
      setPurchasePaymentMethod('cash');
      setPurchaseReceipt(null);
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
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeName: employeeName.trim(), type: 'clock_in', timestamp: new Date().toISOString() })
      });
      if (response.ok) { alert(`Employee ${employeeName} clocked in successfully!`); setEmployeeName(''); setShowClockIn(false); }
      else alert('Failed to clock in. Please try again.');
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
      if (response.ok) { alert(`Employee ${employeeName} clocked out successfully!`); setEmployeeName(''); setShowClockOut(false); }
      else alert('Failed to clock out. Please try again.');
    } catch { alert('Failed to clock out. Please try again.'); }
  };

  const quickTenderAmounts = [5, 10, 20, 50, 100];

  function buildSquareUrl(amountCents) {
  const callbackUrl = 'https://texasstores.up.railway.app/square-callback';
  const appId = 'sq0idp-Ebcvj7QSCwSoum4AWqNSDA';
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (isAndroid) {
    // Android: intent URL using Square POS API extras format
    return (
      'intent:#Intent' +
      ';action=com.squareup.pos.action.CHARGE' +
      ';package=com.squareup' +
      ';S.com.squareup.pos.WEB_CALLBACK_URI=' + encodeURIComponent(callbackUrl) +
      ';S.com.squareup.pos.CLIENT_ID=' + appId +
      ';S.com.squareup.pos.API_VERSION=v2.0' +
      ';i.com.squareup.pos.TOTAL_AMOUNT=' + amountCents +
      ';S.com.squareup.pos.CURRENCY_CODE=USD' +
      ';S.com.squareup.pos.TENDER_TYPES=com.squareup.pos.TENDER_CARD,com.squareup.pos.TENDER_CARD_ON_FILE' +
      ';end'
    );
  }
  // iOS: square-commerce-v1 URL scheme with JSON data payload
  const iosParams = {
    amount_money: { amount: amountCents, currency_code: 'USD' },
    callback_url: callbackUrl,
    client_id: appId,
    version: '1.3',
  };
  return 'square-commerce-v1://payment/create?data=' + encodeURIComponent(JSON.stringify(iosParams));
}

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: 'calc(100vh - 60px)', gap: 0 }}>
      {showCelebration && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '360px', fontWeight: '900', marginBottom: '20px', color: '#22c55e' }}>{celebrationAmount}</div>
            <div style={{ fontSize: '48px', fontWeight: '700' }}>SALE COMPLETE!</div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeInOut { 0%{opacity:0} 20%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
        @keyframes scaleIn { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', borderRight:'2px solid #e5e7eb', height:'100%', overflow:'hidden' }}>
        <div style={{ padding:'20px', overflow:'auto', flex:1, backgroundColor:'#fff', height:'100%' }}>
          {grouped.map(({ category, list }) => (
            <div key={category} style={{ marginBottom:'32px' }}>
              <div style={{ padding:'12px 16px', backgroundColor:'#f8fafc', borderBottom:'2px solid #e5e7eb', marginBottom:'16px', borderRadius:'8px' }}>
                <h3 style={{ margin:0, fontSize:'20px', fontWeight:'700', color:'#1f2937' }}>{category}</h3>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px' }}>
                {list.map((it) => {
                  let bg='#fff', border='#e5e7eb';
                  if(it.category==='SNACKS'){bg='#f0fdf4';border='#22c55e';}
                  else if(it.category==='CHAMOYADAS'){bg='#fefce8';border='#fbbf24';}
                  else if(it.category==='REFRESHERS'){bg='#eff6ff';border='#3b82f6';}
                  else if(it.category==='MILK SHAKES'){bg='#fee2e2';border='#ef4444';}
                  else if(it.category==='BOBAS'){bg='#fdf2f8';border='#ec4899';}
                  return (
                    <button key={it.id} onClick={() => addToCart(it)} style={{ padding:'12px', textAlign:'left', border:`2px solid ${border}`, borderRadius:'12px', background:bg, cursor:'pointer', fontSize:'16px', transition:'all 0.2s', display:'flex', flexDirection:'column', gap:'4px', minHeight:'80px', justifyContent:'center' }}
                      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)';}}
                      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}
                    >
                      <div style={{ fontWeight:'600', fontSize:'16px', lineHeight:'1.1' }}>{it.name}</div>
                      <div style={{ fontSize:'18px', fontWeight:'700', color:'#059669', marginTop:'auto' }}>{centsToUSD(it.priceCents)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', backgroundColor:'#f8fafc', padding:'20px', height:'100%', overflow:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', paddingBottom:'16px', borderBottom:'2px solid #e5e7eb' }}>
          <h2 style={{ margin:0, fontSize:'24px', fontWeight:'700', color:'#1f2937' }}>Current Order</h2>
          <button onClick={clearCart} style={{ padding:'8px 16px', border:'1px solid #dc2626', borderRadius:'6px', backgroundColor:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>Clear Cart</button>
        </div>

        <div style={{ flex:1, overflow:'auto', backgroundColor:'#fff', borderRadius:'12px', padding:'16px', marginBottom:'20px', border:'1px solid #e5e7eb', minHeight:'200px', maxHeight:'400px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:'center', color:'#6b7280', fontSize:'16px', padding:'40px 20px' }}>No items in cart</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {cart.map((l) => (
                <div key={l.itemId} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto auto', gap:'12px', alignItems:'center', padding:'12px', backgroundColor:'#f9fafb', borderRadius:'8px', border:'1px solid #e5e7eb' }}>
                  <div style={{ fontWeight:'500', fontSize:'16px' }}>{l.name}</div>
                  <div style={{ fontSize:'16px', color:'#059669', fontWeight:'600' }}>{centsToUSD(l.priceCents)}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <button onClick={()=>updateQty(l.itemId,-1)} style={{ width:'32px', height:'32px', border:'1px solid #d1d5db', borderRadius:'4px', backgroundColor:'#fff', cursor:'pointer', fontSize:'18px', fontWeight:'bold' }}>-</button>
                    <span style={{ margin:'0 8px', fontSize:'16px', fontWeight:'600', minWidth:'20px', textAlign:'center' }}>{l.quantity}</span>
                    <button onClick={()=>updateQty(l.itemId,1)} style={{ width:'32px', height:'32px', border:'1px solid #d1d5db', borderRadius:'4px', backgroundColor:'#fff', cursor:'pointer', fontSize:'18px', fontWeight:'bold' }}>+</button>
                  </div>
                  <div style={{ textAlign:'right', fontSize:'16px', fontWeight:'700', color:'#059669' }}>{centsToUSD(l.priceCents*l.quantity)}</div>
                  <button onClick={()=>removeFromCart(l.itemId)} style={{ padding:'4px 8px', border:'1px solid #dc2626', borderRadius:'4px', backgroundColor:'#fef2f2', color:'#dc2626', cursor:'pointer', fontSize:'12px' }}>X</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ backgroundColor:'#fff', borderRadius:'12px', padding:'20px', marginBottom:'20px', border:'1px solid #e5e7eb' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'12px', fontSize:'16px' }}>
            <div style={{ color:'#6b7280' }}>Total</div>
            <div style={{ fontWeight:'600' }}>{centsToUSD(totalCents)}</div>
          </div>
        </div>

        <div style={{ backgroundColor:'#fff', borderRadius:'12px', padding:'20px', marginBottom:'20px', border:'1px solid #e5e7eb' }}>
          <h3 style={{ margin:'0 0 16px 0', fontSize:'18px', fontWeight:'600' }}>Payment Method</h3>
          <div style={{ display:'flex', gap:'16px', marginBottom:'16px' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 16px', border:`2px solid ${paymentMethod==='cash'?'#2563eb':'#e5e7eb'}`, borderRadius:'8px', backgroundColor:paymentMethod==='cash'?'#eff6ff':'#fff', cursor:'pointer', flex:1, justifyContent:'center', fontWeight:'500' }}>
              <input type="radio" name="pm" value="cash" checked={paymentMethod==='cash'} onChange={()=>setPaymentMethod('cash')} style={{margin:0}} />
              Cash
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 16px', border:`2px solid ${paymentMethod==='credit'?'#2563eb':'#e5e7eb'}`, borderRadius:'8px', backgroundColor:paymentMethod==='credit'?'#eff6ff':'#fff', cursor:'pointer', flex:1, justifyContent:'center', fontWeight:'500' }}>
              <input type="radio" name="pm" value="credit" checked={paymentMethod==='credit'} onChange={handleCreditSelection} style={{margin:0}} />
              Credit
            </label>
          </div>

          {paymentMethod==='cash' && (
            <div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', marginBottom:'8px', fontWeight:'500' }}>Amount Tendered:</label>
                <input type="number" step="0.01" value={tender} onChange={(e)=>setTender(e.target.value)} placeholder="0.00" style={{ width:'100%', padding:'12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'18px', fontWeight:'600' }} />
              </div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
                {quickTenderAmounts.map(a=>(
                  <button key={a} onClick={()=>setTender(a.toString())} style={{ padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:'6px', backgroundColor:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:'500' }}>
                    ${a}
                  </button>
                ))}
              </div>
              {tenderCents>0 && (
                <div style={{ padding:'12px', backgroundColor:changeCents>=0?'#f0fdf4':'#fef2f2', borderRadius:'8px', border:`1px solid ${changeCents>=0?'#22c55e':'#dc2626'}`, textAlign:'center' }}>
                  <div style={{ fontSize:'18px', fontWeight:'700', color:changeCents>=0?'#059669':'#dc2626' }}>Change: {centsToUSD(changeCents)}</div>
                </div>
              )}
            </div>
          )}

          {paymentMethod==='credit' && (
            <div style={{ padding:'16px', backgroundColor:'#f0fdf4', borderRadius:'8px', border:'1px solid #22c55e', textAlign:'center' }}>
              <div style={{ fontSize:'48px', marginBottom:'12px' }}>💳</div>
              <div style={{ fontSize:'18px', fontWeight:'600', color:'#059669', marginBottom:'4px' }}>Credit Payment Ready</div>
              <div style={{ fontSize:'13px', color:'#6b7280' }}>Tap "Process Credit Card" — Square will open, charge the card, then return here automatically</div>
            </div>
          )}
        </div>

        {paymentMethod==='credit' && (
          <button
            disabled={cart.length===0 || submitting}
            onClick={() => {
              if (!totalCents || totalCents <= 0) { setMessage('Please add items to cart first.'); return; }
              localStorage.setItem('pendingSquareCart', JSON.stringify(cart));
              localStorage.setItem('pendingSquarePaymentMethod', 'credit');
              setCart([]);
              const squareUrl = buildSquareUrl(totalCents);
          window.location.href = squareUrl;
            }}
            style={{ width:'100%', padding:'16px', background:cart.length===0||submitting?'#9ca3af':'#3b82f6', color:'#fff', border:'none', borderRadius:'12px', fontSize:'18px', fontWeight:'700', cursor:cart.length===0||submitting?'not-allowed':'pointer', transition:'all 0.2s', marginBottom:'12px' }}
          >
            Process Credit Card
          </button>
        )}

        {paymentMethod==='cash' && (
          <button
            disabled={cart.length===0 || submitting || tenderCents < totalCents}
            onClick={completeOrder}
            style={{ width:'100%', padding:'20px', background:cart.length===0||submitting||tenderCents<totalCents?'#9ca3af':'#059669', color:'#fff', border:'none', borderRadius:'12px', fontSize:'20px', fontWeight:'700', cursor:cart.length===0||submitting||tenderCents<totalCents?'not-allowed':'pointer', transition:'all 0.2s', marginBottom:'12px' }}
          >
            {submitting ? 'Processing...' : 'Complete Order'}
          </button>
        )}

        <div style={{ marginBottom:'12px' }}>
          {!showPurchaseInput ? (
            <button onClick={()=>setShowPurchaseInput(true)} style={{ width:'100%', padding:'16px', background:'#dc2626', color:'#fff', border:'none', borderRadius:'12px', fontSize:'18px', fontWeight:'700', cursor:'pointer', transition:'all 0.2s' }}>
              Compras
            </button>
          ) : (
            <div style={{ padding:'16px', border:'2px solid #dc2626', borderRadius:'12px', backgroundColor:'#fef2f2' }}>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', marginBottom:'8px', fontWeight:'600', color:'#dc2626' }}>Purchase Amount ($)</label>
                <input type="number" step="0.01" min="0" value={purchaseAmount} onChange={e=>setPurchaseAmount(e.target.value)} placeholder="0.00" style={{ width:'100%', padding:'12px', border:'1px solid #dc2626', borderRadius:'8px', fontSize:'16px', fontWeight:'600' }} />
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', marginBottom:'8px', fontWeight:'600', color:'#dc2626' }}>Payment Method</label>
                <div style={{ display:'flex', gap:'12px' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', border:`2px solid ${purchasePaymentMethod==='cash'?'#dc2626':'#d1d5db'}`, borderRadius:'6px', backgroundColor:purchasePaymentMethod==='cash'?'#fef2f2':'#fff', cursor:'pointer', fontWeight:'500' }}>
                    <input type="radio" name="purchasePaymentMethod" value="cash" checked={purchasePaymentMethod==='cash'} onChange={e=>setPurchasePaymentMethod(e.target.value)} style={{margin:0}} /> Cash
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', border:`2px solid ${purchasePaymentMethod==='card'?'#dc2626':'#d1d5db'}`, borderRadius:'6px', backgroundColor:purchasePaymentMethod==='card'?'#fef2f2':'#fff', cursor:'pointer', fontWeight:'500' }}>
                    <input type="radio" name="purchasePaymentMethod" value="card" checked={purchasePaymentMethod==='card'} onChange={e=>setPurchasePaymentMethod(e.target.value)} style={{margin:0}} /> Card
                  </label>
                </div>
              </div>
              <div style={{ marginBottom:'12px' }}>
                <label style={{ display:'block', marginBottom:'8px', fontWeight:'600', color:'#dc2626' }}>Receipt (Optional)</label>
                <input type="file" accept="image/*,.pdf" onChange={e=>setPurchaseReceipt(e.target.files[0]||null)} style={{ width:'100%', padding:'8px', border:'1px solid #dc2626', borderRadius:'6px', fontSize:'14px' }} />
                {purchaseReceipt && <div style={{ marginTop:'4px', fontSize:'12px', color:'#059669', fontWeight:'500' }}>Selected: {purchaseReceipt.name}</div>}
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={recordPurchase} disabled={submitting||!purchaseAmount} style={{ flex:1, padding:'12px', background:submitting||!purchaseAmount?'#9ca3af':'#dc2626', color:'#fff', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:'600', cursor:submitting||!purchaseAmount?'not-allowed':'pointer' }}>
                  {submitting ? 'Recording...' : 'Record Purchase'}
                </button>
                <button onClick={()=>{setShowPurchaseInput(false);setPurchaseAmount('');}} style={{ padding:'12px 16px', background:'#6b7280', color:'#fff', border:'none', borderRadius:'8px', fontSize:'16px', fontWeight:'600', cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div style={{ marginTop:'16px', padding:'12px', backgroundColor:message.includes('complete')||message.includes('successful')?'#f0fdf4':'#fef2f2', border:`1px solid ${message.includes('complete')||message.includes('successful')?'#22c55e':'#dc2626'}`, borderRadius:'8px', color:message.includes('complete')||message.includes('successful')?'#059669':'#dc2626', fontSize:'16px', fontWeight:'500', textAlign:'center' }}>
            {message}
          </div>
        )}

        <div style={{ marginTop:'24px', padding:'16px', backgroundColor:'#f8fafc', borderRadius:'8px', border:'1px solid #e5e7eb' }}>
          <h4 style={{ margin:'0 0 16px 0' }}>Employee Time Tracking</h4>
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            <button onClick={()=>setShowClockIn(true)} style={{ padding:'12px 24px', backgroundColor:'#059669', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:600 }}>Clock In</button>
            <button onClick={()=>setShowClockOut(true)} style={{ padding:'12px 24px', backgroundColor:'#dc2626', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:600 }}>Clock Out</button>
          </div>
          {showClockIn && (
            <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
              <div style={{ backgroundColor:'white', padding:'24px', borderRadius:'8px', minWidth:'300px' }}>
                <h4 style={{ margin:'0 0 16px 0' }}>Clock In</h4>
                <input type="text" placeholder="Enter employee name" value={employeeName} onChange={e=>setEmployeeName(e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:'6px', marginBottom:'16px' }} onKeyPress={e=>e.key==='Enter'&&handleClockIn()} />
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={handleClockIn} style={{ padding:'8px 16px', backgroundColor:'#059669', color:'white', border:'none', borderRadius:'6px', cursor:'pointer' }}>Clock In</button>
                  <button onClick={()=>{setShowClockIn(false);setEmployeeName('');}} style={{ padding:'8px 16px', backgroundColor:'#6b7280', color:'white', border:'none', borderRadius:'6px', cursor:'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          {showClockOut && (
            <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
              <div style={{ backgroundColor:'white', padding:'24px', borderRadius:'8px', minWidth:'300px' }}>
                <h4 style={{ margin:'0 0 16px 0' }}>Clock Out</h4>
                <input type="text" placeholder="Enter employee name" value={employeeName} onChange={e=>setEmployeeName(e.target.value)} style={{ width:'100%', padding:'8px 12px', border:'1px solid #d1d5db', borderRadius:'6px', marginBottom:'16px' }} onKeyPress={e=>e.key==='Enter'&&handleClockOut()} />
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={handleClockOut} style={{ padding:'8px 16px', backgroundColor:'#dc2626', color:'white', border:'none', borderRadius:'6px', cursor:'pointer' }}>Clock Out</button>
                  <button onClick={()=>{setShowClockOut(false);setEmployeeName('');}} style={{ padding:'8px 16px', backgroundColor:'#6b7280', color:'white', border:'none', borderRadius:'6px', cursor:'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
