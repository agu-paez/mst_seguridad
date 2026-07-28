import { NavLink, Outlet, Navigate } from 'react-router-dom';

function PanelAdmin() {
  const cargo = localStorage.getItem('cargo');

  return (
    <div className="panel-admin">
      <aside className="panel-sidebar">
        <div className="panel-logo">
          <img src="/uploads/logoJB.jpeg" alt="JB_seguridad" />
        </div>
        <nav className="panel-menu">
          <NavLink className={({ isActive }) => `panel-btn${isActive ? ' activo' : ''}`} to="/panel/dashboard">
            <span>📊</span> Dashboard
          </NavLink>
          <NavLink className={({ isActive }) => `panel-btn${isActive ? ' activo' : ''}`} to="/panel/clientes">
            <span>👥</span> Clientes
          </NavLink>
          {cargo === 'administrador' && (
            <NavLink className={({ isActive }) => `panel-btn${isActive ? ' activo' : ''}`} to="/panel/productos">
              <span>📦</span> Productos
            </NavLink>
          )}
          <NavLink className={({ isActive }) => `panel-btn${isActive ? ' activo' : ''}`} to="/panel/presupuestos">
            <span>📋</span> Presupuestos
          </NavLink>
          {cargo === 'administrador' && (
            <NavLink className={({ isActive }) => `panel-btn${isActive ? ' activo' : ''}`} to="/panel/usuarios">
              <span>👤</span> Usuarios
            </NavLink>
          )}
        </nav>
      </aside>

      <main className="panel-main">
        <Outlet />
      </main>
    </div>
  );
}

export default PanelAdmin;