import React, { useEffect, useState, useMemo } from 'react';

function centsToUSD(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDateTime(dateString) {
  // Convert UTC to local timezone for display
  const date = new Date(dateString);
  return date.toLocaleString();
}

function formatDate(dateString) {
  // Convert UTC to local timezone for display
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Helper function to get today's date in local timezone
function getTodayLocal() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Helper function to check if a date is today in local timezone
function isToday(dateString) {
  const today = new Date();
  const date = new Date(dateString);
  
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

export default function Edit() {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'items', 'transactions'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [editingSale, setEditingSale] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);

  // Function to fetch data with date filters
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const [salesResponse, purchasesResponse] = await Promise.all([
        fetch(`/api/sales?${params.toString()}`),
        fetch(`/api/purchases?${params.toString()}`)
      ]);
      
      const [salesData, purchasesData] = await Promise.all([
        salesResponse.json(),
        purchasesResponse.json()
      ]);
      
      setSales(salesData);
      setPurchases(purchasesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts or date filters change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  // Handle date filter changes
  const handleDateChange = (type, value) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  };

  // Reset date filters
  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  // Get today's date in YYYY-MM-DD format for max attribute
  const today = getTodayLocal();

  // Calculate daily summaries
  const dailySummary = useMemo(() => {
    const dailyTotals = new Map();
    
    // Process sales
    sales.forEach((sale) => {
      // Convert UTC date to local timezone for grouping
      const localDate = new Date(sale.createdAt);
      const date = localDate.toLocaleDateString();
      
      if (!dailyTotals.has(date)) {
        dailyTotals.set(date, { 
          cash: 0, 
          credit: 0, 
          totalSales: 0,
          purchases: 0,
          netCash: 0,
          isToday: false
        });
      }
      const dayData = dailyTotals.get(date);
      if (sale.paymentMethod === 'cash') {
        dayData.cash += sale.totalCents;
      } else {
        dayData.credit += sale.totalCents;
      }
      dayData.totalSales += 1;
      
      // Mark if this is today
      if (isToday(sale.createdAt)) {
        dayData.isToday = true;
      }
    });

    // Process purchases
    purchases.forEach((purchase) => {
      // Convert UTC date to local timezone for grouping
      const localDate = new Date(purchase.createdAt);
      const date = localDate.toLocaleDateString();
      
      if (!dailyTotals.has(date)) {
        dailyTotals.set(date, { 
          cash: 0, 
          credit: 0, 
          totalSales: 0,
          purchases: 0,
          netCash: 0,
          isToday: false
        });
      }
      const dayData = dailyTotals.get(date);
      dayData.purchases += purchase.amountCents;
    });

    return Array.from(dailyTotals.entries())
      .map(([date, data]) => ({ 
        date, 
        ...data, 
        total: data.cash + data.credit,
        netCash: data.cash - data.purchases
      }))
      .sort((a, b) => {
        // Sort by date, with today first
        if (a.isToday) return -1;
        if (b.isToday) return 1;
        return new Date(b.date) - new Date(a.date);
      });
  }, [sales, purchases]);

  // Calculate item summaries
  const itemSummary = useMemo(() => {
    const itemTotals = new Map();
    
    sales.forEach((sale) => {
      sale.items.forEach((saleItem) => {
        const itemName = saleItem.item.name;
        if (!itemTotals.has(itemName)) {
          itemTotals.set(itemName, { 
            name: itemName, 
            category: saleItem.item.category,
            quantity: 0, 
            revenue: 0 
          });
        }
        const itemData = itemTotals.get(itemName);
        itemData.quantity += saleItem.quantity;
        itemData.revenue += saleItem.lineTotalCents;
      });
    });

    return Array.from(itemTotals.values())
      .sort((a, b) => b.quantity - a.quantity);
  }, [sales]);

  // Edit transaction functions
  const handleEditSale = (sale) => {
    setEditingSale(sale);
    setShowEditModal(true);
  };

  const handleDeleteSale = (sale) => {
    setSaleToDelete(sale);
    setShowDeleteModal(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    try {
      const response = await fetch(`/api/sales/${saleToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from local state
        setSales(sales.filter(s => s.id !== saleToDelete.id));
        setShowDeleteModal(false);
        setSaleToDelete(null);
        // Refresh data
        fetchData();
      } else {
        console.error('Failed to delete sale');
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
    }
  };

  const saveEditedSale = async (editedSale) => {
    try {
      const response = await fetch(`/api/sales/${editedSale.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedSale)
      });
      
      if (response.ok) {
        // Update local state
        setSales(sales.map(s => s.id === editedSale.id ? editedSale : s));
        setShowEditModal(false);
        setEditingSale(null);
        // Refresh data
        fetchData();
      } else {
        console.error('Failed to update sale');
      }
    } catch (error) {
      console.error('Error updating sale:', error);
    }
  };

  if (loading) return <div style={{ padding: 16 }}>Loading sales...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Sales Reports - Edit Mode</h3>
      
      {/* Date Filters */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24, 
        padding: '16px', 
        backgroundColor: '#f8fafc', 
        borderRadius: '8px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="startDate" style={{ fontWeight: 600, fontSize: '0.9em' }}>From:</label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            max={today}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9em'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label htmlFor="endDate" style={{ fontWeight: 600, fontSize: '0.9em' }}>To:</label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            max={today}
            min={startDate}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9em'
            }}
          />
        </div>
        
        <button
          onClick={resetFilters}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9em'
          }}
        >
          Reset Filters
        </button>
        
        {(startDate || endDate) && (
          <div style={{ 
            fontSize: '0.9em', 
            color: '#059669', 
            fontWeight: 600,
            backgroundColor: '#d1fae5',
            padding: '4px 12px',
            borderRadius: '6px'
          }}>
            Filtered by date range
          </div>
        )}
        
        {/* Timezone Info */}
        <div style={{ 
          fontSize: '0.8em', 
          color: '#6b7280', 
          backgroundColor: '#f3f4f6',
          padding: '4px 8px',
          borderRadius: '4px',
          marginLeft: 'auto'
        }}>
          Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
        </div>
        
        {/* Quick Date Presets */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={() => {
              const today = getTodayLocal();
              setStartDate(today);
              setEndDate(today);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            Today
          </button>
          <button
            onClick={() => {
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              setStartDate(yesterdayStr);
              setEndDate(yesterdayStr);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay());
              const endOfWeek = new Date(now);
              endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
              
              setStartDate(startOfWeek.toISOString().split('T')[0]);
              setEndDate(endOfWeek.toISOString().split('T')[0]);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            This Week
          </button>
          <button
            onClick={() => {
              const now = new Date();
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              
              setStartDate(startOfMonth.toISOString().split('T')[0]);
              setEndDate(endOfMonth.toISOString().split('T')[0]);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.8em'
            }}
          >
            This Month
          </button>
        </div>
      </div>
      
      {/* Filtered Data Summary */}
      {(startDate || endDate) && (
        <div style={{ 
          marginBottom: 24, 
          padding: '16px', 
          backgroundColor: '#eff6ff', 
          borderRadius: '8px',
          border: '1px solid #dbeafe'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#1e40af' }}>Filtered Data Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '4px' }}>Date Range</div>
              <div style={{ fontWeight: 600, color: '#1e40af' }}>
                {startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : `Until ${endDate}`}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '4px' }}>Total Sales</div>
              <div style={{ fontWeight: 600, color: '#059669' }}>
                {centsToUSD(sales.reduce((sum, sale) => sum + sale.totalCents, 0))}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '4px' }}>Transactions</div>
              <div style={{ fontWeight: 600, color: '#7c3aed' }}>
                {sales.length}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9em', color: '#6b7280', marginBottom: '4px' }}>Total Purchases</div>
              <div style={{ fontWeight: 600, color: '#dc2626' }}>
                {centsToUSD(purchases.reduce((sum, purchase) => sum + purchase.amountCents, 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 24, 
        borderBottom: '2px solid #e5e7eb' 
      }}>
        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'summary' ? '#3b82f6' : 'transparent',
            color: activeTab === 'summary' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9em'
          }}
        >
          Daily Summary
        </button>
        <button
          onClick={() => setActiveTab('items')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'items' ? '#3b82f6' : 'transparent',
            color: activeTab === 'items' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9em'
          }}
        >
          Top Items
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          style={{
            padding: '12px 24px',
            backgroundColor: activeTab === 'transactions' ? '#3b82f6' : 'transparent',
            color: activeTab === 'transactions' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9em'
          }}
        >
          Transactions
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div>
          <h4 style={{ marginBottom: 16 }}>Daily Sales Summary</h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: 16 
          }}>
            {dailySummary.map((day, index) => (
              <div key={index} style={{
                padding: '16px',
                backgroundColor: day.isToday ? '#fef3c7' : 'white',
                border: day.isToday ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: 12 
                }}>
                  <h5 style={{ 
                    margin: 0, 
                    color: day.isToday ? '#92400e' : '#111827',
                    fontWeight: 600
                  }}>
                    {day.date}
                  </h5>
                  {day.isToday && (
                    <span style={{
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7em',
                      fontWeight: 600
                    }}>
                      TODAY
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8em', color: '#6b7280', marginBottom: '2px' }}>Cash</div>
                    <div style={{ fontWeight: 600, color: '#059669' }}>
                      {centsToUSD(day.cash)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8em', color: '#6b7280', marginBottom: '2px' }}>Credit</div>
                    <div style={{ fontWeight: 600, color: '#7c3aed' }}>
                      {centsToUSD(day.credit)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8em', color: '#6b7280', marginBottom: '2px' }}>Total</div>
                    <div style={{ fontWeight: 600, color: '#1e40af' }}>
                      {centsToUSD(day.total)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8em', color: '#6b7280', marginBottom: '2px' }}>Net Cash</div>
                    <div style={{ 
                      fontWeight: 600, 
                      color: day.netCash >= 0 ? '#059669' : '#dc2626' 
                    }}>
                      {centsToUSD(day.netCash)}
                    </div>
                  </div>
                </div>
                
                <div style={{ 
                  marginTop: 12, 
                  padding: '8px', 
                  backgroundColor: '#f3f4f6', 
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  color: '#6b7280'
                }}>
                  {day.totalSales} sales • {centsToUSD(day.purchases)} purchases
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div>
          <h4 style={{ marginBottom: 16 }}>Top Selling Items</h4>
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Item
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Category
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'right', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Quantity
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'right', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemSummary.map((item, index) => (
                  <tr key={index} style={{ 
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                  }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {item.category}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                      {centsToUSD(item.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div>
          <h4 style={{ marginBottom: 16 }}>Sales Transactions</h4>
          <div style={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Time
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Items
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'right', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Total
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Payment
                  </th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    borderBottom: '1px solid #e5e7eb',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} style={{ 
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: 'white'
                  }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.9em' }}>
                      {formatDateTime(sale.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.9em' }}>
                        {sale.items.map((item, index) => (
                          <div key={index} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            marginBottom: index < sale.items.length - 1 ? '4px' : 0
                          }}>
                            <span>{item.quantity}x {item.item.name}</span>
                            <span style={{ color: '#6b7280' }}>
                              {centsToUSD(item.lineTotalCents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ 
                      padding: '12px 16px', 
                      textAlign: 'right', 
                      fontWeight: 600,
                      fontSize: '0.9em'
                    }}>
                      {centsToUSD(sale.totalCents)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8em',
                        fontWeight: 600,
                        backgroundColor: sale.paymentMethod === 'cash' ? '#d1fae5' : '#ede9fe',
                        color: sale.paymentMethod === 'cash' ? '#065f46' : '#5b21b6'
                      }}>
                        {sale.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEditSale(sale)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8em',
                            fontWeight: 500
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8em',
                            fontWeight: 500
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && editingSale && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Edit Sale #{editingSale.id}</h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                color: '#374151'
              }}>
                Total Amount (cents)
              </label>
              <input
                type="number"
                value={editingSale.totalCents}
                onChange={(e) => setEditingSale({
                  ...editingSale,
                  totalCents: parseInt(e.target.value)
                })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9em'
                }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 600,
                color: '#374151'
              }}>
                Payment Method
              </label>
              <select
                value={editingSale.paymentMethod}
                onChange={(e) => setEditingSale({
                  ...editingSale,
                  paymentMethod: e.target.value
                })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.9em'
                }}
              >
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => saveEditedSale(editingSale)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingSale(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && saleToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#dc2626' }}>Delete Sale</h3>
            <p style={{ 
              margin: '0 0 24px 0', 
              color: '#374151',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete sale #{saleToDelete.id} for {centsToUSD(saleToDelete.totalCents)}?
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={confirmDeleteSale}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSaleToDelete(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
