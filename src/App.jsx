import { useState } from 'react';
import Inicio from './inicio';
import Login from './login';
import PanelAdmin from './PanelAdmin';
import PanelDashboard from './PanelDashboard';
import PanelClientes from './PanelClientes';
import PanelProductos from './PanelProductos';
import PanelPresupuestos from './PanelPresupuestos';
import PanelUsuarios from './PanelUsuarios';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const cargo = localStorage.getItem('cargo');
  const esStaff = cargo === 'administrador' || cargo === 'empleado';

  const cerrarSesion = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('cargo')
    setToken(null)
  }

  return (
    <div className="ecommerce-container">
      <Router>
      <nav className="navbar">
        <NavLink to="/" className={({ isActive }) => `nombre${isActive ? ' activo' : ''}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <img src="/uploads/1781569405191-1781114119055-logo.jpeg" alt="MST Alarmas" className="logo" />
          <span>MST Alarmas</span>
        </NavLink>
        
        <div className="nav-enlaces">
          <nav>
            <NavLink className={({ isActive }) => `btn-nav${isActive ? ' activo' : ''}`} to="/">Inicio</NavLink>
            {esStaff && (
              <NavLink className={({ isActive }) => `btn-nav${isActive ? ' activo' : ''}`} to="/panel/dashboard">Panel</NavLink>
            )}
            {token ? (
              <NavLink className="btn-nav" to="/" onClick={cerrarSesion}>Cerrar Sesión</NavLink>
            ) : (
              <NavLink className={({ isActive }) => `btn-nav${isActive ? ' activo' : ''}`} to="/login">Iniciar Sesión</NavLink>
            )}
          </nav>
        </div>
      </nav>

        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/login" element={<Login onLogin={(tok) => setToken(tok)} />} />
          <Route path="/panel" element={
            token ? <PanelAdmin /> : <Navigate to="/login" />
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PanelDashboard />} />
            <Route path="clientes" element={<PanelClientes />} />
            {cargo === 'administrador' && <Route path="productos" element={<PanelProductos />} />}
            <Route path="presupuestos" element={<PanelPresupuestos />} />
            {cargo === 'administrador' && <Route path="usuarios" element={<PanelUsuarios />} />}
          </Route>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
