import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

const PDFReport = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [hoursData, setHoursData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Helper function to convert local date to UTC-6 range
  const getDateRange = (dateString) => {
    const date = new Date(dateString);
    
    // For UTC-6 (America/Chicago), when user selects "2025-09-01":
    // Start: 00:00:00 local = 06:00:00 UTC
    // End: 23:59:59 local = 05:59:59 UTC (next day)
    
    const startDate = dateString;
    const endDate = dateString;
    
    return { startDate, endDate };
  };

  // Helper function to create simple table in PDF
  const createSimpleTable = (doc, data, headers, startY, maxWidth = 180) => {
    const rowHeight = 8;
    const colWidth = maxWidth / headers.length;
    let currentY = startY;

    // Draw headers
    doc.setFillColor(240, 240, 240);
    doc.rect(10, currentY, maxWidth, rowHeight, 'F');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    
    headers.forEach((header, index) => {
      doc.text(header, 12 + (index * colWidth), currentY + 6);
    });
    
    currentY += rowHeight;

    // Draw data rows
    data.forEach((row, rowIndex) => {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFillColor(rowIndex % 2 === 0 ? [255, 255, 255] : [248, 248, 248]);
      doc.rect(10, currentY, maxWidth, rowHeight, 'F');
      doc.setFontSize(9);
      
      headers.forEach((header, colIndex) => {
        const value = row[header] || '';
        doc.text(String(value), 12 + (colIndex * colWidth), currentY + 6);
      });
      
      currentY += rowHeight;
    });

    return currentY;
  };

  const fetchData = async () => {
    if (!selectedDate) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log('🔍 PDF Report: Starting data fetch for date:', selectedDate);
      
      const { startDate, endDate } = getDateRange(selectedDate);
      
      // Fetch sales data
      const salesUrl = `/api/sales?startDate=${startDate}&endDate=${endDate}`;
      console.log('🔍 PDF Report: Sales API URL:', salesUrl);
      
      const salesResponse = await fetch(salesUrl);
      if (!salesResponse.ok) throw new Error('Failed to fetch sales data');
      const sales = await salesResponse.json();
      
      console.log('🔍 PDF Report: Sales data received:', {
        count: sales.length,
        firstSale: sales[0] ? sales[0].createdAt : null,
        lastSale: sales[sales.length - 1] ? sales[sales.length - 1].createdAt : null
      });
      
      setSalesData(sales);

      // Fetch inventory data
      const inventoryResponse = await fetch('/api/packaging');
      if (!inventoryResponse.ok) throw new Error('Failed to fetch inventory data');
      const inventory = await inventoryResponse.json();
      setInventoryData(inventory);

      // Fetch hours data
      const hoursUrl = `/api/time-entries?startDate=${startDate}&endDate=${endDate}`;
      console.log('🔍 PDF Report: Hours API URL:', hoursUrl);
      
      const hoursResponse = await fetch(hoursUrl);
      if (!hoursResponse.ok) throw new Error('Failed to fetch hours data');
      const hours = await hoursResponse.json();
      
      console.log('🔍 PDF Report: Hours data received:', {
        count: hours.length,
        firstEntry: hours[0] ? hours[0].timestamp : null,
        lastEntry: hours[sales.length - 1] ? hours[sales.length - 1].timestamp : null
      });
      
      setHoursData(hours);

      console.log('🔍 PDF Report: All data fetched successfully');
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const generatePDF = () => {
    if (!salesData.length && !inventoryData.length && !hoursData.length) {
      alert('No data available for the selected date');
      return;
    }

    const doc = new jsPDF();
    let currentY = 20;

    // Title and date
    doc.setFontSize(18);
    doc.text('Daily Report', 10, currentY);
    
    doc.setFontSize(12);
    doc.text(`Date: ${selectedDate}`, 120, currentY);
    currentY += 20;

    // Sales Summary
    if (salesData.length > 0) {
      const totalRevenue = salesData.reduce((sum, sale) => sum + sale.totalCents, 0);
      const totalTransactions = salesData.length;
      
      doc.setFontSize(14);
      doc.text('Sales Summary', 10, currentY);
      currentY += 10;
      
      doc.setFontSize(10);
      doc.text(`Total Revenue: $${(totalRevenue / 100).toFixed(2)}`, 10, currentY);
      currentY += 8;
      doc.text(`Total Transactions: ${totalTransactions}`, 10, currentY);
      currentY += 15;

      // Sales Details Table
      const salesTableData = salesData.flatMap(sale => 
        sale.items.map(item => ({
          'Item': item.item.name,
          'Qty': item.quantity,
          'Revenue': `$${(item.lineTotalCents / 100).toFixed(2)}`,
          'Balance': item.item.stock || 'N/A'
        }))
      );

      if (salesTableData.length > 0) {
        doc.setFontSize(12);
        doc.text('Sales Details', 10, currentY);
        currentY += 10;
        
        const headers = ['Item', 'Qty', 'Revenue', 'Balance'];
        currentY = createSimpleTable(doc, salesTableData, headers, currentY);
        currentY += 10;
      }
    }

    // Inventory Summary
    if (inventoryData.length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Inventory Balance', 10, currentY);
      currentY += 10;
      
      const inventoryTableData = inventoryData.map(item => ({
        'Item': item.name,
        'Stock': item.name === 'elote' ? `${(item.stock / 480).toFixed(2)} boxes` : item.stock,
        'Unit': item.unit
      }));
      
      const headers = ['Item', 'Stock', 'Unit'];
      currentY = createSimpleTable(doc, inventoryTableData, headers, currentY);
      currentY += 10;
    }

    // Hours Summary
    if (hoursData.length > 0) {
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Employee Hours', 10, currentY);
      currentY += 10;
      
      // Group by employee
      const employeeHours = {};
      hoursData.forEach(entry => {
        if (!employeeHours[entry.employeeName]) {
          employeeHours[entry.employeeName] = [];
        }
        employeeHours[entry.employeeName].push(entry);
      });
      
      const hoursTableData = Object.entries(employeeHours).map(([name, entries]) => {
        const clockIns = entries.filter(e => e.type === 'clock_in').length;
        const clockOuts = entries.filter(e => e.type === 'clock_out').length;
        return {
          'Employee': name,
          'Clock Ins': clockIns,
          'Clock Outs': clockOuts
        };
      });
      
      const headers = ['Employee', 'Clock Ins', 'Clock Outs'];
      currentY = createSimpleTable(doc, hoursTableData, headers, currentY);
    }

    // Save PDF
    doc.save(`daily-report-${selectedDate}.pdf`);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Daily Report Generator</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-6">
        <button
          onClick={generatePDF}
          disabled={isLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Generate PDF Report'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800">Sales</h3>
          <p className="text-2xl font-bold text-blue-600">{salesData.length}</p>
          <p className="text-sm text-blue-600">
            ${(salesData.reduce((sum, sale) => sum + sale.totalCents, 0) / 100).toFixed(2)}
          </p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800">Inventory Items</h3>
          <p className="text-2xl font-bold text-green-600">{inventoryData.length}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800">Time Entries</h3>
          <p className="text-2xl font-bold text-purple-600">{hoursData.length}</p>
        </div>
      </div>

      {/* Debug Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Debug Information</h3>
        <p className="text-sm text-gray-600">Selected Date: {selectedDate}</p>
        <p className="text-sm text-gray-600">Sales Count: {salesData.length}</p>
        <p className="text-sm text-gray-600">Inventory Count: {inventoryData.length}</p>
        <p className="text-sm text-gray-600">Hours Count: {hoursData.length}</p>
        <p className="text-sm text-gray-600">Check browser console for detailed API logs</p>
      </div>
    </div>
  );
};

export default PDFReport;
