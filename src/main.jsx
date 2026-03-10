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

// Handles Square POS callback - reads Square's actual params and redirects to POS
function SquareCallback() {
  const params = new URLSearchParams(window.location.search);
  // Square sends com.squareup.pos.CLIENT_TRANSACTION_ID on success
  const transactionId = params.get('com.squareup.pos.CLIENT_TRANSACTION_ID') ||
                        params.get('com.squareup.pos.SERVER_TRANSACTION_ID') ||
                        params.get('transaction_id');
  // Square sends com.squareup.pos.ERROR_CODE on failure/cancel
  const errorCode = params.get('com.squareup.pos.ERROR_CODE') || params.get('error_code');
  const errorDesc = params.get('com.squareup.pos.ERROR_DESCRIPTION') || params.get('error_description');

  let status;
  if (transactionId) {
    status = 'ok';
  } else if (errorCode === 'CANCELED') {
    status = 'cancel';
  } else if (errorCode) {
    status = 'error';
  } else {
    status = 'ok'; // fallback: if Square returned us at all with no error, treat as success
  }

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
