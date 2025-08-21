import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import POS from './pages/POS.jsx';
import Inventory from './pages/Packaging.jsx';
import Sales from './pages/Sales.jsx';
import Hours from './pages/Hours.jsx';
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
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);


