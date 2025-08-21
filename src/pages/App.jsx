import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function App() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ display: 'flex', gap: 16, alignItems: 'center', padding: 12, borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>Chillers POS</h2>
        <NavLink to="/" style={{ textDecoration: 'none' }}>
          POS
        </NavLink>
        <NavLink to="/inventory" style={{ textDecoration: 'none' }}>
          Inventory
        </NavLink>
        <NavLink to="/sales" style={{ textDecoration: 'none' }}>
          Sales
        </NavLink>
      </header>
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}


