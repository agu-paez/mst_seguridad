import { Outlet } from 'react-router-dom';

function PanelAdmin() {
  return (
    <div className="panel-admin">
      <main className="panel-main">
        <Outlet />
      </main>
    </div>
  );
}

export default PanelAdmin;
