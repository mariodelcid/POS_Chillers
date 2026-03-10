import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import POS from './pages/POS.jsx';
import Inventory from './pages/Packaging.jsx';
import Sales from './pages/Sales.jsx';
import Hours from './pages/Hours.jsx';
import PDFReport from './pages/PDFReport.jsx';
import Edit from './pages/Edit.jsx';
import Accounting from './pages/Accounting.jsx';
import App from './pages/App.jsx';

// Handles Square POS callback
// Square POS (squareup://pos/charge) sends back:
//   ?status=ok&transaction_id=XXX  on success
//   ?status=cancel                  on cancel
//   ?status=error&error_code=XXX    on error
function SquareCallback() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status') || 'ok';
  const transactionId = params.get('transaction_id') || '';
  const errorCode = params.get('error_code') || '';

  const redirectUrl = '/?square_callback=1' +
    '&status=' + encodeURIComponent(status) +
    (transactionId ? '&transaction_id=' + encodeURIComponent(transactionId) : '') +
    (errorCode ? '&error_code=' + encodeURIComponent(errorCode) : '');
  window.location.replace(redirectUrl);
  return null;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<POS />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales" element={<Sales />} />
          <Route path="hours" element={<Hours />} />
          <Route path="reports" element={<PDFReport />} />
        </Route>
        <Route path="/edit" element={<Edit />} />
        <Route path="/accounting" element={<Accounting />} />
        <Route path="/square-callback" element={<SquareCallback />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
