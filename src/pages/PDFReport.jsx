import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

        const salesTableData = salesData.map(sale => {
          const saleTotal = sale.totalCents || sale.total || 0;
          const items = sale.items || [];
          const itemNames = items.map(item => {
            // Handle both item structures: item.item.name or item.name
            return item.item ? item.item.name : item.name;
          }).join(', ');
          
          return [
            sale.id || 'N/A',
            new Date(sale.createdAt).toLocaleTimeString(),
            itemNames || 'No items',
            `$${(saleTotal / 100).toFixed(2)}`
          ];
        });

        doc.autoTable({
          startY: yPosition,
          head: [['Order #', 'Time', 'Items', 'Total']],
          body: salesTableData,
          margin: { left: margin },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [41, 128, 185] }
        });

        yPosition = doc.lastAutoTable.finalY + 15;
      }

      // Inventory Summary
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Inventory Summary', margin, yPosition);
      yPosition += 10;

      if (inventoryData.length > 0) {
        const inventoryTableData = inventoryData.map(item => [
          item.name,
          item.stock,
          item.unit || 'units'
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Item', 'Current Stock', 'Unit']],
          body: inventoryTableData,
          margin: { left: margin },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [39, 174, 96] }
        });

        yPosition = doc.lastAutoTable.finalY + 15;
      }

      // Hours Summary
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Hours', margin, yPosition);
      yPosition += 10;

      if (hoursData.length > 0) {
        const employeeHours = {};
        hoursData.forEach(entry => {
          if (!employeeHours[entry.employeeName]) {
            employeeHours[entry.employeeName] = { clockIns: [], clockOuts: [] };
          }
          if (entry.type === 'clock_in') {
            employeeHours[entry.employeeName].clockIns.push(new Date(entry.timestamp));
          } else if (entry.type === 'clock_out') {
            employeeHours[entry.employeeName].clockOuts.push(new Date(entry.timestamp));
          }
        });

        const hoursTableData = Object.entries(employeeHours).map(([name, times]) => {
          let totalHours = 0;
          const clockIns = times.clockIns.sort((a, b) => a - b);
          const clockOuts = times.clockOuts.sort((a, b) => a - b);
          
          for (let i = 0; i < Math.min(clockIns.length, clockOuts.length); i++) {
            const hours = (clockOuts[i] - clockIns[i]) / (1000 * 60 * 60);
            totalHours += hours;
          }

          return [name, totalHours.toFixed(2), times.clockIns.length, times.clockOuts.length];
        });

        doc.autoTable({
          startY: yPosition,
          head: [['Employee', 'Total Hours', 'Clock Ins', 'Clock Outs']],
          body: hoursTableData,
          margin: { left: margin },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [155, 89, 182] }
        });
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
