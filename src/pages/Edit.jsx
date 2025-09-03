import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

function Edit() {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [timeEntries, setTimeEntries] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setStartDate(today);
    setEndDate(today);
  }, [today]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [startDate, endDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const [salesRes, purchasesRes, timeRes] = await Promise.all([
        fetch(`/api/sales?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/purchases?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/time-entries?startDate=${startDate}&endDate=${endDate}`)
      ]);

      const salesData = await salesRes.json();
      const purchasesData = await purchasesRes.json();
      const timeData = await timeRes.json();

      setSales(salesData);
      setPurchases(purchasesData);
      setTimeEntries(timeData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  function centsToUSD(cents) {
    return `$${(cents / 100).toFixed(2)}`;
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Calculate totals
  const totalSales = sales.reduce((sum, sale) => sum + sale.totalCents, 0);
  const cashSales = sales.filter(s => s.paymentMethod === 'cash').reduce((sum, sale) => sum + sale.totalCents, 0);
  const creditSales = sales.filter(s => s.paymentMethod === 'credit').reduce((sum, sale) => sum + sale.totalCents, 0);
  const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.amountCents, 0);
  const netCash = cashSales - totalPurchases;

  // Group sales by item for summary
  const itemSummary = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      const itemName = item.item.name;
      if (!itemSummary[itemName]) {
        itemSummary[itemName] = { quantity: 0, revenue: 0, category: item.item.category };
      }
      itemSummary[itemName].quantity += item.quantity;
      itemSummary[itemName].revenue += item.lineTotalCents;
    });
  });

  const sortedItems = Object.entries(itemSummary)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);

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
      } else {
        console.error('Failed to update sale');
      }
    } catch (error) {
      console.error('Error updating sale:', error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 text-center">📊 Sales Report - Edit Mode</h1>
      
      {/* Date Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Sales</h3>
          <p className="text-3xl font-bold text-green-600">{centsToUSD(totalSales)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Cash Sales</h3>
          <p className="text-3xl font-bold text-blue-600">{centsToUSD(cashSales)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Credit Sales</h3>
          <p className="text-3xl font-bold text-purple-600">{centsToUSD(creditSales)}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Net Cash</h3>
          <p className={`text-3xl font-bold ${netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {centsToUSD(netCash)}
          </p>
        </div>
      </div>

      {/* Sales Transactions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Sales Transactions</h2>
        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : sales.length === 0 ? (
          <p className="text-center text-gray-500">No sales found for selected dates</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {sale.items.map((item, index) => (
                          <div key={index} className="flex justify-between">
                            <span>{item.quantity}x {item.item.name}</span>
                            <span className="text-gray-500">{centsToUSD(item.lineTotalCents)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {centsToUSD(sale.totalCents)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        sale.paymentMethod === 'cash' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {sale.paymentMethod.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditSale(sale)}
                          className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-md text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-3 py-1 rounded-md text-xs"
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
        )}
      </div>

      {/* Top Selling Items */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Top Selling Items</h2>
        {sortedItems.length === 0 ? (
          <p className="text-center text-gray-500">No items sold</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{centsToUSD(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Purchases */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Purchases</h2>
        {purchases.length === 0 ? (
          <p className="text-center text-gray-500">No purchases found for selected dates</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(purchase.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                      {centsToUSD(purchase.amountCents)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{purchase.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Time Entries */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Employee Time Entries</h2>
        {timeEntries.length === 0 ? (
          <p className="text-center text-gray-500">No time entries found for selected dates</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {timeEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.employeeName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.type === 'clock_in' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {entry.type === 'clock_in' ? 'CLOCK IN' : 'CLOCK OUT'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime(entry.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Sale Modal */}
      {showEditModal && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Edit Sale #{editingSale.id}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Amount (cents)</label>
                <input
                  type="number"
                  value={editingSale.totalCents}
                  onChange={(e) => setEditingSale({
                    ...editingSale,
                    totalCents: parseInt(e.target.value)
                  })}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select
                  value={editingSale.paymentMethod}
                  onChange={(e) => setEditingSale({
                    ...editingSale,
                    paymentMethod: e.target.value
                  })}
                  className="border border-gray-300 rounded-md px-3 py-2 w-full"
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => saveEditedSale(editingSale)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex-1"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSale(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && saleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-red-600">Delete Sale</h3>
            <p className="text-gray-700 mb-4">
              Are you sure you want to delete sale #{saleToDelete.id} for {centsToUSD(saleToDelete.totalCents)}?
              This action cannot be undone.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={confirmDeleteSale}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 flex-1"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSaleToDelete(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 flex-1"
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

export default Edit;
