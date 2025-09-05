import React, { useEffect, useState, useMemo } from 'react';

function formatCurrency(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

// Helper function to get the start of week (Sunday)
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust to Sunday
  d.setDate(diff);
  return d;
}

// Helper function to get the end of week (Saturday)
function getEndOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + 6; // Adjust to Saturday
  d.setDate(diff);
  return d;
}

export default function Accounting() {
  const [accountingEntries, setAccountingEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date().toISOString().split('T')[0]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  
  // Form state for adding/editing entries
  const [formData, setFormData] = useState({
    date: '',
    cashSales: '',
    creditSales: '',
    squareFees: '',
    salesTax: '',
    deposits: '',
    taxPayments: ''
  });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [accountingRes, salesRes, purchasesRes] = await Promise.all([
        fetch('/api/accounting'),
        fetch('/api/sales'),
        fetch('/api/purchases')
      ]);
      
      const accountingData = await accountingRes.json();
      const salesData = await salesRes.json();
      const purchasesData = await purchasesRes.json();
      
      setAccountingEntries(accountingData);
      setSales(salesData);
      setPurchases(purchasesData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate weekly sales data with purchases deducted
  const weeklyData = useMemo(() => {
    if (!sales.length && !purchases.length) return { totalCash: 0, totalCredit: 0, dailyBreakdown: {} };
    
    const weekStart = getStartOfWeek(selectedWeek);
    const weekEnd = getEndOfWeek(selectedWeek);
    
    const weekSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= weekStart && saleDate <= weekEnd;
    });
    
    const weekPurchases = purchases.filter(purchase => {
      const purchaseDate = new Date(purchase.createdAt);
      return purchaseDate >= weekStart && purchaseDate <= weekEnd;
    });
    
    const dailyBreakdown = {};
    let totalCash = 0;
    let totalCredit = 0;
    let totalCashPurchases = 0;
    let totalCreditPurchases = 0;
    
    // Initialize all days of the week
    for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
      const dayKey = d.toISOString().split('T')[0];
      dailyBreakdown[dayKey] = { 
        cash: 0, 
        credit: 0, 
        cashPurchases: 0,
        creditPurchases: 0,
        netCash: 0,
        netCredit: 0,
        dayName: d.toLocaleDateString('en-US', { weekday: 'long' }) 
      };
    }
    
    // Add sales
    weekSales.forEach(sale => {
      const saleDate = new Date(sale.createdAt).toISOString().split('T')[0];
      if (dailyBreakdown[saleDate]) {
        if (sale.paymentMethod === 'cash') {
          dailyBreakdown[saleDate].cash += sale.totalCents;
          totalCash += sale.totalCents;
        } else if (sale.paymentMethod === 'credit') {
          dailyBreakdown[saleDate].credit += sale.totalCents;
          totalCredit += sale.totalCents;
        }
      }
    });
    
    // Subtract purchases
    weekPurchases.forEach(purchase => {
      const purchaseDate = new Date(purchase.createdAt).toISOString().split('T')[0];
      if (dailyBreakdown[purchaseDate]) {
        if (purchase.paymentMethod === 'cash') {
          dailyBreakdown[purchaseDate].cashPurchases += purchase.amountCents;
          totalCashPurchases += purchase.amountCents;
        } else if (purchase.paymentMethod === 'card') {
          dailyBreakdown[purchaseDate].creditPurchases += purchase.amountCents;
          totalCreditPurchases += purchase.amountCents;
        }
      }
    });
    
    // Calculate net amounts for each day
    Object.keys(dailyBreakdown).forEach(dayKey => {
      const day = dailyBreakdown[dayKey];
      day.netCash = day.cash - day.cashPurchases;
      day.netCredit = day.credit - day.creditPurchases;
    });
    
    return { 
      totalCash, 
      totalCredit, 
      totalCashPurchases,
      totalCreditPurchases,
      netCash: totalCash - totalCashPurchases,
      netCredit: totalCredit - totalCreditPurchases,
      dailyBreakdown 
    };
  }, [sales, purchases, selectedWeek]);

  // Calculate running balance
  const calculateBalance = (entries) => {
    let cashBalance = 0;
    let creditBalance = 0;
    let grandBalance = 0;
    
    return entries.map(entry => {
      const netCash = entry.cashSales - entry.deposits - entry.taxPayments;
      const netCredit = entry.creditSales - entry.squareFees;
      
      cashBalance += netCash;
      creditBalance += netCredit;
      grandBalance = cashBalance + creditBalance;
      
      return { 
        ...entry, 
        netCash, 
        netCredit, 
        cashBalance,
        creditBalance,
        grandBalance 
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Get the calculated net amounts for the selected date
      const selectedDate = formData.date;
      const dayKey = selectedDate;
      const dayData = weeklyData.dailyBreakdown[dayKey];
      
      // Use calculated net amounts if available, otherwise use manual input
      const cashSales = dayData ? dayData.netCash : Math.round(parseFloat(formData.cashSales || 0) * 100);
      const creditSales = dayData ? dayData.netCredit : Math.round(parseFloat(formData.creditSales || 0) * 100);
      
      const entryData = {
        date: formData.date,
        cashSales: cashSales,
        creditSales: creditSales,
        squareFees: Math.round(parseFloat(formData.squareFees || 0) * 100),
        salesTax: Math.round(parseFloat(formData.salesTax || 0) * 100),
        deposits: Math.round(parseFloat(formData.deposits || 0) * 100),
        taxPayments: Math.round(parseFloat(formData.taxPayments || 0) * 100)
      };

      const url = editingEntry ? `/api/accounting/${editingEntry.id}` : '/api/accounting';
      const method = editingEntry ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
      });

      if (response.ok) {
        await fetchData();
        setShowAddEntry(false);
        setEditingEntry(null);
        setFormData({
          date: '',
          cashSales: '',
          creditSales: '',
          squareFees: '',
          salesTax: '',
          deposits: '',
          taxPayments: ''
        });
      } else {
        const error = await response.json();
        alert('Error: ' + error.error);
      }
    } catch (err) {
      console.error('Error saving entry:', err);
      alert('Error saving entry');
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date.split('T')[0],
      cashSales: (entry.cashSales / 100).toFixed(2),
      creditSales: (entry.creditSales / 100).toFixed(2),
      squareFees: (entry.squareFees / 100).toFixed(2),
      salesTax: (entry.salesTax / 100).toFixed(2),
      deposits: (entry.deposits / 100).toFixed(2),
      taxPayments: (entry.taxPayments / 100).toFixed(2)
    });
    setShowAddEntry(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      const response = await fetch(`/api/accounting/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchData();
      } else {
        alert('Error deleting entry');
      }
    } catch (err) {
      console.error('Error deleting entry:', err);
      alert('Error deleting entry');
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading accounting data...</div>;

  const entriesWithBalance = calculateBalance(accountingEntries);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Accounting</h2>
        <button
          onClick={() => setShowAddEntry(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Add Entry
        </button>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setFormData({
              date: today,
              cashSales: '',
              creditSales: '',
              squareFees: '',
              salesTax: '',
              deposits: '',
              taxPayments: ''
            });
            setShowAddEntry(true);
          }}
          style={{
            padding: '12px 20px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          + Add Today's Entry
        </button>
        
        <button
          onClick={() => setShowAddEntry(true)}
          style={{
            padding: '12px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          + Add Custom Entry
        </button>
      </div>

      {/* Week Selection */}
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f8fafc', borderRadius: '8px' }}>
        <label style={{ fontWeight: '600', marginRight: 12 }}>Week Starting:</label>
        <input
          type="date"
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '16px'
          }}
        />
      </div>

      {/* Grand Balance Summary */}
      <div style={{ marginBottom: 24, padding: 20, backgroundColor: '#1f2937', borderRadius: '12px', border: '2px solid #374151' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#ffffff', fontSize: '24px', fontWeight: '700' }}>
          Grand Balance Summary
        </h2>
        
        {accountingEntries.length > 0 ? (
          <div>
            {(() => {
              const lastEntry = calculateBalance(accountingEntries).slice(-1)[0];
              const totalDeposits = accountingEntries.reduce((sum, entry) => sum + entry.deposits, 0);
              const totalTaxPayments = accountingEntries.reduce((sum, entry) => sum + entry.taxPayments, 0);
              const totalSquareFees = accountingEntries.reduce((sum, entry) => sum + entry.squareFees, 0);
              const totalCashSales = accountingEntries.reduce((sum, entry) => sum + entry.cashSales, 0);
              const totalCreditSales = accountingEntries.reduce((sum, entry) => sum + entry.creditSales, 0);
              
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Cash Balance</div>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '700', 
                      color: lastEntry.cashBalance >= 0 ? '#10b981' : '#ef4444' 
                    }}>
                      {formatCurrency(lastEntry.cashBalance)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Sales: {formatCurrency(totalCashSales)}<br/>
                      - Deposits: {formatCurrency(totalDeposits)}<br/>
                      - Tax: {formatCurrency(totalTaxPayments)}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Credit Balance</div>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '700', 
                      color: lastEntry.creditBalance >= 0 ? '#3b82f6' : '#ef4444' 
                    }}>
                      {formatCurrency(lastEntry.creditBalance)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Sales: {formatCurrency(totalCreditSales)}<br/>
                      - Square Fees: {formatCurrency(totalSquareFees)}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Total Deposits</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                      {formatCurrency(totalDeposits)}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Total Tax Paid</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                      {formatCurrency(totalTaxPayments)}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center', backgroundColor: '#374151', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>Grand Balance</div>
                    <div style={{ 
                      fontSize: '32px', 
                      fontWeight: '700', 
                      color: lastEntry.grandBalance >= 0 ? '#10b981' : '#ef4444' 
                    }}>
                      {formatCurrency(lastEntry.grandBalance)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      Cash + Credit
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '16px' }}>
            No accounting entries yet. Add entries to see balance calculations.
          </div>
        )}
      </div>

      {/* Daily Transactions Summary */}
      <div style={{ marginBottom: 24, backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>Daily Transactions</h3>
          <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>Track deposits, taxes, and fees by day</p>
        </div>
        
        {accountingEntries.length > 0 ? (
          <div>
            {/* Table Header */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '120px 100px 100px 100px 100px 100px 100px 100px 120px', 
              gap: 12, 
              padding: '16px 20px',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              fontWeight: '600',
              fontSize: '14px',
              color: '#374151'
            }}>
              <div>Date</div>
              <div style={{ textAlign: 'center' }}>Cash Sales</div>
              <div style={{ textAlign: 'center' }}>Credit Sales</div>
              <div style={{ textAlign: 'center' }}>Compras Cash</div>
              <div style={{ textAlign: 'center' }}>Compras Credit</div>
              <div style={{ textAlign: 'center' }}>Deposits</div>
              <div style={{ textAlign: 'center' }}>Square Fees</div>
              <div style={{ textAlign: 'center' }}>Tax Paid</div>
              <div style={{ textAlign: 'center' }}>Grand Balance</div>
            </div>
            
            {/* Table Rows */}
            {accountingEntries
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 7) // Show last 7 days
              .map((entry, index) => {
                const entryWithBalance = calculateBalance([entry])[0];
                
                // Get compras data for this date
                const entryDate = new Date(entry.date).toISOString().split('T')[0];
                const dayData = weeklyData.dailyBreakdown[entryDate];
                const cashCompras = dayData ? dayData.cashPurchases : 0;
                const creditCompras = dayData ? dayData.creditPurchases : 0;
                
                return (
                  <div key={entry.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '120px 100px 100px 100px 100px 100px 100px 100px 120px',
                    gap: 12,
                    padding: '16px 20px',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
                    borderBottom: index < 6 ? '1px solid #f3f4f6' : 'none',
                    alignItems: 'center'
                  }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#1f2937',
                      fontSize: '14px'
                    }}>
                      {new Date(entry.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    
                    {/* Cash Sales - Black */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#000000',
                        fontSize: '14px'
                      }}>
                        {formatCurrency(entry.cashSales)}
                      </div>
                    </div>
                    
                    {/* Credit Sales - Black */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#000000',
                        fontSize: '14px'
                      }}>
                        {formatCurrency(entry.creditSales)}
                      </div>
                    </div>
                    
                    {/* Compras Cash - Red */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#dc2626',
                        fontSize: '14px'
                      }}>
                        {cashCompras > 0 ? formatCurrency(cashCompras) : '—'}
                      </div>
                    </div>
                    
                    {/* Compras Credit - Red */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#dc2626',
                        fontSize: '14px'
                      }}>
                        {creditCompras > 0 ? formatCurrency(creditCompras) : '—'}
                      </div>
                    </div>
                    
                    {/* Deposits - Red */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#dc2626',
                        fontSize: '14px'
                      }}>
                        {entry.deposits > 0 ? formatCurrency(entry.deposits) : '—'}
                      </div>
                    </div>
                    
                    {/* Square Fees - Red */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#dc2626',
                        fontSize: '14px'
                      }}>
                        {entry.squareFees > 0 ? formatCurrency(entry.squareFees) : '—'}
                      </div>
                    </div>
                    
                    {/* Tax Paid - Red */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#dc2626',
                        fontSize: '14px'
                      }}>
                        {entry.taxPayments > 0 ? formatCurrency(entry.taxPayments) : '—'}
                      </div>
                    </div>
                    
                    {/* Grand Balance - Bold and Black */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ 
                        fontWeight: '700', 
                        color: '#000000',
                        fontSize: '14px'
                      }}>
                        {formatCurrency(entryWithBalance.grandBalance)}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: '#6b7280', 
            fontSize: '14px', 
            padding: '40px 20px',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{ marginBottom: '8px', fontSize: '16px', color: '#374151' }}>No transactions yet</div>
            <div>Add accounting entries to track daily deposits, taxes, and fees</div>
          </div>
        )}
      </div>

      {/* Weekly Sales Summary */}
      <div style={{ marginBottom: 24, padding: 16, backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #22c55e' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#059669' }}>Weekly Sales Summary (After Compras)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: '600', color: '#059669' }}>Cash Sales</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>
              {formatCurrency(weeklyData.totalCash)}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#dc2626' }}>Cash Compras</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
              -{formatCurrency(weeklyData.totalCashPurchases)}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#3b82f6' }}>Credit Sales</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#3b82f6' }}>
              {formatCurrency(weeklyData.totalCredit)}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#dc2626' }}>Credit Compras</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#dc2626' }}>
              -{formatCurrency(weeklyData.totalCreditPurchases)}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '12px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #22c55e' }}>
          <div>
            <div style={{ fontWeight: '600', color: '#059669' }}>Net Cash</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
              {formatCurrency(weeklyData.netCash)}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#3b82f6' }}>Net Credit</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
              {formatCurrency(weeklyData.netCredit)}
            </div>
          </div>
        </div>
        
        {/* Daily Breakdown */}
        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#059669' }}>Daily Breakdown</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            {Object.entries(weeklyData.dailyBreakdown).map(([date, data]) => (
              <div key={date} style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', 
                gap: 12, 
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontWeight: '500' }}>{data.dayName}</div>
                <div style={{ textAlign: 'center', color: '#059669' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>Cash Sales</div>
                  <div>{formatCurrency(data.cash)}</div>
                  {data.cashPurchases > 0 && (
                    <div style={{ fontSize: '11px', color: '#dc2626' }}>
                      -{formatCurrency(data.cashPurchases)}
                    </div>
                  )}
                  <div style={{ fontWeight: '600', color: data.netCash >= 0 ? '#059669' : '#dc2626' }}>
                    Net: {formatCurrency(data.netCash)}
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#3b82f6' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>Credit Sales</div>
                  <div>{formatCurrency(data.credit)}</div>
                  {data.creditPurchases > 0 && (
                    <div style={{ fontSize: '11px', color: '#dc2626' }}>
                      -{formatCurrency(data.creditPurchases)}
                    </div>
                  )}
                  <div style={{ fontWeight: '600', color: data.netCredit >= 0 ? '#3b82f6' : '#dc2626' }}>
                    Net: {formatCurrency(data.netCredit)}
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#dc2626' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>Cash Compras</div>
                  <div>{formatCurrency(data.cashPurchases)}</div>
                </div>
                <div style={{ textAlign: 'center', color: '#dc2626' }}>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>Credit Compras</div>
                  <div>{formatCurrency(data.creditPurchases)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accounting Entries Table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr auto', 
          gap: 12, 
          padding: '12px 16px', 
          backgroundColor: '#f8fafc',
          fontWeight: '600',
          fontSize: '14px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>Date</div>
          <div>Cash Sales</div>
          <div>Credit Sales</div>
          <div>Square Fees</div>
          <div>Sales Tax</div>
          <div>Deposits</div>
          <div>Tax Payments</div>
          <div>Net Cash</div>
          <div>Net Credit</div>
          <div>Cash Balance</div>
          <div>Credit Balance</div>
          <div>Grand Balance</div>
          <div>Actions</div>
        </div>
        
        {entriesWithBalance.map((entry) => (
          <div key={entry.id} style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr auto', 
            gap: 12, 
            padding: '12px 16px', 
            borderBottom: '1px solid #f3f4f6',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '14px' }}>{formatDate(entry.date)}</div>
            <div style={{ textAlign: 'right', color: '#059669' }}>{formatCurrency(entry.cashSales)}</div>
            <div style={{ textAlign: 'right', color: '#3b82f6' }}>{formatCurrency(entry.creditSales)}</div>
            <div style={{ textAlign: 'right', color: '#dc2626' }}>{formatCurrency(entry.squareFees)}</div>
            <div style={{ textAlign: 'right', color: '#f59e0b' }}>{formatCurrency(entry.salesTax)}</div>
            <div style={{ textAlign: 'right', color: '#8b5cf6' }}>{formatCurrency(entry.deposits)}</div>
            <div style={{ textAlign: 'right', color: '#ef4444' }}>{formatCurrency(entry.taxPayments)}</div>
            <div style={{ textAlign: 'right', fontWeight: '600', color: entry.netCash >= 0 ? '#059669' : '#dc2626' }}>
              {formatCurrency(entry.netCash)}
            </div>
            <div style={{ textAlign: 'right', fontWeight: '600', color: entry.netCredit >= 0 ? '#3b82f6' : '#dc2626' }}>
              {formatCurrency(entry.netCredit)}
            </div>
            <div style={{ textAlign: 'right', fontWeight: '600', color: entry.cashBalance >= 0 ? '#059669' : '#dc2626' }}>
              {formatCurrency(entry.cashBalance)}
            </div>
            <div style={{ textAlign: 'right', fontWeight: '600', color: entry.creditBalance >= 0 ? '#3b82f6' : '#dc2626' }}>
              {formatCurrency(entry.creditBalance)}
            </div>
            <div style={{ textAlign: 'right', fontWeight: '700', color: entry.grandBalance >= 0 ? '#059669' : '#dc2626', fontSize: '16px' }}>
              {formatCurrency(entry.grandBalance)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleEdit(entry)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(entry.id)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Entry Modal */}
      {showAddEntry && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            minWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>
              {editingEntry ? 'Edit Entry' : 'Add Accounting Entry'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const dayData = weeklyData.dailyBreakdown[selectedDate];
                      
                      setFormData({ 
                        ...formData, 
                        date: selectedDate,
                        // Auto-populate with calculated net amounts if available
                        cashSales: dayData ? (dayData.netCash / 100).toFixed(2) : formData.cashSales,
                        creditSales: dayData ? (dayData.netCredit / 100).toFixed(2) : formData.creditSales
                      });
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                  {formData.date && weeklyData.dailyBreakdown[formData.date] && (
                    <div style={{ 
                      marginTop: '4px', 
                      fontSize: '12px', 
                      color: '#059669',
                      backgroundColor: '#f0fdf4',
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}>
                      Auto-populated with calculated net amounts from sales and compras
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Net Cash Sales ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cashSales}
                      onChange={(e) => setFormData({ ...formData, cashSales: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      (Sales - Cash Compras)
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Net Credit Sales ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.creditSales}
                      onChange={(e) => setFormData({ ...formData, creditSales: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                      (Sales - Credit Compras)
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Square Fees ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.squareFees}
                      onChange={(e) => setFormData({ ...formData, squareFees: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Sales Tax ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.salesTax}
                      onChange={(e) => setFormData({ ...formData, salesTax: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Deposits ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.deposits}
                      onChange={(e) => setFormData({ ...formData, deposits: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Tax Payments ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxPayments}
                      onChange={(e) => setFormData({ ...formData, taxPayments: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEntry(false);
                    setEditingEntry(null);
                    setFormData({
                      date: '',
                      cashSales: '',
                      creditSales: '',
                      squareFees: '',
                      salesTax: '',
                      deposits: '',
                      taxPayments: ''
                    });
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {editingEntry ? 'Update' : 'Add'} Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
