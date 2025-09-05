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
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);


