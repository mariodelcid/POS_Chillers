import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './pages/App.jsx';
import POS from './pages/POS.jsx';
import Sales from './pages/Sales.jsx';
import Packaging from './pages/Packaging.jsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <POS /> },
      { path: 'sales', element: <Sales /> },
      { path: 'packaging', element: <Packaging /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


