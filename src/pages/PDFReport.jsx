import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

export default function PDFReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [hoursData, setHoursData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch sales data for the selected date
      const salesResponse = await fetch(`/api/sales?startDate=${selectedDate}&endDate=${selectedDate}`);
      if (!salesResponse.ok) throw new Error('Failed to fetch sales data');
      const sales = await salesResponse.json();
      setSalesData(sales);

      // Fetch inventory data
      const inventoryResponse = await fetch('/api/packaging');
      if (!inventoryResponse.ok) throw new Error('Failed to fetch inventory data');
      const inventory = await inventoryResponse.json();
      setInventoryData(inventory);

      // Fetch hours data for the selected date
      const hoursResponse = await fetch(`/api/time-entries?startDate=${selectedDate}&endDate=${selectedDate}`);
      if (!hoursResponse.ok) throw new Error('Failed to fetch hours data');
      const hours = await hoursResponse.json();
      setHoursData(hours);

      console.log('Fetched data:', { sales, inventory, hours });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Error fetching data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to create simple tables without autoTable
  const createSimpleTable = (doc, headers, data, startY, margin) => {
    let yPosition = startY;
    const lineHeight = 8;
    const colWidths = [30, 40, 80, 40]; // Adjust column widths as needed
    
    // Draw headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    let xPosition = margin;
    headers.forEach((header, index) => {
      doc.text(header, xPosition, yPosition);
      xPosition += colWidths[index];
    });
    
    yPosition += lineHeight;
    
    // Draw data rows
    doc.setFont('helvetica', 'normal');
    data.forEach(row => {
      if (yPosition > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPosition = 20;
      }
      
      xPosition = margin;
      row.forEach((cell, index) => {
        // Truncate long text to fit column
        const maxWidth = colWidths[index] - 2;
        const truncatedText = doc.splitTextToSize(String(cell), maxWidth);
        doc.text(truncatedText, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      yPosition += lineHeight;
    });
    
    return yPosition + 10;
  };

  // Helper function to calculate item statistics from sales data
  const calculateItemStats = () => {
    const itemStats = {};
    
    salesData.forEach(sale => {
      const items = sale.items || [];
      items.forEach(item => {
        const itemName = item.item ? item.item.name : item.name;
        if (!itemStats[itemName]) {
          itemStats[itemName] = {
            transactions: 0,
            totalQuantity: 0,
            totalRevenue: 0
          };
        }
        itemStats[itemName].transactions += 1;
        itemStats[itemName].totalQuantity += item.quantity || 1;
        itemStats[itemName].totalRevenue += (item.priceCents || 0) * (item.quantity || 1);
      });
    });
    
    return itemStats;
  };

  // Helper function to calculate employee statistics
  const calculateEmployeeStats = () => {
    const employeeStats = {};
    
    // Calculate hours from time entries
    hoursData.forEach(entry => {
      if (!employeeStats[entry.employeeName]) {
        employeeStats[entry.employeeName] = {
          totalHours: 0,
          clockIns: 0,
          clockOuts: 0,
          totalSales: 0
        };
      }
      
      if (entry.type === 'clock_in') {
        employeeStats[entry.employeeName].clockIns += 1;
      } else if (entry.type === 'clock_out') {
        employeeStats[entry.employeeName].clockOuts += 1;
      }
    });
    
    // Calculate total hours for each employee
    Object.keys(employeeStats).forEach(employeeName => {
      const employee = employeeStats[employeeName];
      const employeeHours = hoursData.filter(entry => entry.employeeName === employeeName);
      
      let totalHours = 0;
      const clockIns = employeeHours.filter(entry => entry.type === 'clock_in')
        .map(entry => new Date(entry.timestamp))
        .sort((a, b) => a - b);
      const clockOuts = employeeHours.filter(entry => entry.type === 'clock_out')
        .map(entry => new Date(entry.timestamp))
        .sort((a, b) => a - b);
      
      for (let i = 0; i < Math.min(clockIns.length, clockOuts.length); i++) {
        const hours = (clockOuts[i] - clockIns[i]) / (1000 * 60 * 60);
        totalHours += hours;
      }
      
      employee.totalHours = totalHours;
    });
    
    return employeeStats;
  };

  const generatePDF = () => {
    try {
      console.log('Generating PDF with data:', { salesData, inventoryData, hoursData });
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      let yPosition = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Chillers POS - Daily Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Date
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      const formattedDate = new Date(selectedDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      doc.text(`Date: ${formattedDate}`, margin, yPosition);
      yPosition += 20;

      // Sales Summary
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Sales Summary', margin, yPosition);
      yPosition += 10;

      // Fix: Use totalCents instead of total, and handle the data structure correctly
      const totalSales = salesData.reduce((sum, sale) => {
        const saleTotal = sale.totalCents || sale.total || 0;
        return sum + saleTotal;
      }, 0);
      const totalTransactions = salesData.length;
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Sales: $${(totalSales / 100).toFixed(2)}`, margin, yPosition);
      yPosition += 7;
      doc.text(`Total Transactions: ${totalTransactions}`, margin, yPosition);
      yPosition += 15;

      // Sales Details Table
      if (salesData.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales Details', margin, yPosition);
        yPosition += 10;

        // Group sales by item to show quantity sold per item
        const itemSales = {};
        let grandTotalRevenue = 0;
        
        // Debug: Log the first sale to see the data structure
        if (salesData.length > 0) {
          console.log('First sale structure:', salesData[0]);
          console.log('First sale items:', salesData[0].items);
        }
        
        salesData.forEach(sale => {
          const items = sale.items || [];
          items.forEach(item => {
            const itemName = item.item ? item.item.name : item.name;
            const quantity = item.quantity || 1;
            // Fix: Use the correct fields from SaleItem model
            const price = item.unitPriceCents || item.lineTotalCents || 0;
            const itemRevenue = item.lineTotalCents || (price * quantity);
            
            // Debug: Log item details
            console.log('Processing item:', { 
              itemName, 
              quantity, 
              unitPriceCents: item.unitPriceCents,
              lineTotalCents: item.lineTotalCents,
              itemRevenue, 
              item 
            });
            
            if (!itemSales[itemName]) {
              itemSales[itemName] = {
                quantity: 0,
                revenue: 0
              };
            }
            itemSales[itemName].quantity += quantity;
            itemSales[itemName].revenue += itemRevenue;
            grandTotalRevenue += itemRevenue;
          });
        });

        const salesTableData = Object.entries(itemSales).map(([itemName, data]) => [
          itemName,
          data.quantity,
          `$${(data.revenue / 100).toFixed(2)}`
        ]);

        yPosition = createSimpleTable(doc, ['Item', 'Qty Sold', 'Revenue'], salesTableData, yPosition, margin);
        
        // Add grand total
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Grand Total Revenue: $${(grandTotalRevenue / 100).toFixed(2)}`, margin, yPosition);
        yPosition += 15;
      }

      // Enhanced Inventory Summary with Item Statistics
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Inventory Summary & Item Performance', margin, yPosition);
      yPosition += 10;

      if (inventoryData.length > 0) {
        const itemStats = calculateItemStats();
        
        // Create comprehensive inventory table
        const inventoryTableData = inventoryData.map(item => {
          const stats = itemStats[item.name] || { transactions: 0, totalQuantity: 0, totalRevenue: 0 };
          
          // Special handling for elote - convert ounces to boxes
          let displayStock = item.stock;
          let displayUnit = item.unit || 'units';
          
          if (item.name.toLowerCase().includes('elote')) {
            // Convert ounces to boxes (480 oz per box)
            displayStock = (item.stock / 480).toFixed(2);
            displayUnit = 'boxes';
          }
          
          return [
            item.name,
            displayStock,
            displayUnit,
            stats.transactions,
            `$${(stats.totalRevenue / 100).toFixed(2)}`
          ];
        });

        yPosition = createSimpleTable(doc, ['Item', 'Stock', 'Unit', 'Sales', 'Revenue'], inventoryTableData, yPosition, margin);
      }

      // Employee Performance Summary
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Performance Summary', margin, yPosition);
      yPosition += 10;

      if (hoursData.length > 0) {
        const employeeStats = calculateEmployeeStats();
        
        const employeeTableData = Object.entries(employeeStats).map(([name, stats]) => [
          name,
          stats.totalHours.toFixed(2),
          stats.clockIns,
          stats.clockOuts
        ]);

        yPosition = createSimpleTable(doc, ['Employee', 'Hours', 'Ins', 'Outs'], employeeTableData, yPosition, margin);
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.height - 10);
      }

      // Save the PDF
      const filename = `chillers-daily-report-${selectedDate}.pdf`;
      doc.save(filename);
      console.log('PDF generated successfully:', filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px' }}>Daily Report Generator</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Select Date:
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '200px'
          }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={generatePDF}
          disabled={loading}
          style={{
            padding: '15px 30px',
            fontSize: '16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Loading...' : 'Generate PDF Report'}
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', color: '#666' }}>
          Loading data for {selectedDate}...
        </div>
      )}

      {!loading && !error && (
        <div style={{ marginTop: '30px' }}>
          <h3>Report Preview for {new Date(selectedDate).toLocaleDateString()}</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <h4>Sales Summary</h4>
            <p>Total Sales: ${(salesData.reduce((sum, sale) => {
              const saleTotal = sale.totalCents || sale.total || 0;
              return sum + saleTotal;
            }, 0) / 100).toFixed(2)}</p>
            <p>Total Transactions: {salesData.length}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4>Inventory Items</h4>
            <p>Total Items: {inventoryData.length}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4>Employee Hours</h4>
            <p>Total Entries: {hoursData.length}</p>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <h4>Debug Info</h4>
            <p><strong>Sales Data:</strong> {salesData.length} records</p>
            <p><strong>Inventory Data:</strong> {inventoryData.length} records</p>
            <p><strong>Hours Data:</strong> {hoursData.length} records</p>
            <p><strong>Selected Date:</strong> {selectedDate}</p>
          </div>
        </div>
      )}
    </div>
  );
}
