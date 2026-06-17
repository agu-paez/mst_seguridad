import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './dashboard.css';

const API = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const r = await fetch(path, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
  return r.json();
};

const COLORS = ['#0088FE','#00C49F','#FFBB28','#FF8042','#A28DFF','#FF6B6B','#4ECDC4','#45B7D1'];
const COLORS2 = ['#667eea','#2ecc71','#f39c12','#e74c3c','#1abc9c','#3498db','#9b59b6','#e67e22'];

const agruparTop = (data, key, n = 6) => {
  const sorted = [...data].sort((a, b) => b[key] - a[key]);
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  if (rest.length > 0) {
    top.push({ nombre: 'Otros', [key]: rest.reduce((s, i) => s + i[key], 0) });
  }
  return top;
};

const renderLabel = ({ nombre, percent, cx, cy, midAngle, outerRadius }) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  // Acerqué un poco más las letras a la torta bajando el 28 a 20
  const radius = outerRadius + 20; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // EL TRUCO MAGICO: Cortamos el nombre si es muy largo
  const nombreCorto = nombre.length > 16 ? nombre.substring(0, 16) + '...' : nombre;

  return (
    <text x={x} y={y} fill="rgba(255,255,255,0.85)" fontSize={11} fontWeight={500}
      textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${nombreCorto} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function PanelDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API('/api/dashboard/stats').then(setStats);
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {stats && (
        <div className="stats-grid">
          <div className="stat-card clients"><span className="stat-num">{stats.clientes}</span><span>Clientes</span></div>
          <div className="stat-card new-clients"><span className="stat-num">{stats.clientesNuevos}</span><span>Nuevos Hoy</span></div>
          <div className="stat-card jobs"><span className="stat-num">{stats.trabajos}</span><span>Trabajos</span></div>
          <div className="stat-card income"><span className="stat-num">${(stats.ingresosTrabajos || 0).toLocaleString()}</span><span>Ganado en trabajos</span></div>
        </div>
      )}
      <div className="charts-row">
        
        <div className="chart-box">
          <h3>Productos más usados</h3>
          {stats?.productosUsadosTrabajos?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              {/* Aflojamos los margenes de 90 a 30 */}
              <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                {/* Dejamos el outerRadius en 60 para que la torta tenga buen tamaño */}
                <Pie data={agruparTop(stats.productosUsadosTrabajos, 'cantidad')} dataKey="cantidad" nameKey="nombre"
                  cx="50%" cy="50%" outerRadius={60} label={renderLabel} labelLine={{ stroke: 'rgba(255,255,255,0.35)', strokeWidth: 1 }}>
                  {agruparTop(stats.productosUsadosTrabajos, 'cantidad').map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => v + ' uds'} contentStyle={{ background: '#1e1f2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="chart-empty">Sin productos usados</p>}
        </div>

        <div className="chart-box">
          <h3>Trabajos por empleado</h3>
          {stats?.trabajosPorEmpleado?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              {/* Aflojamos los margenes acá también */}
              <PieChart margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
                <Pie data={agruparTop(stats.trabajosPorEmpleado, 'trabajos')} dataKey="trabajos" nameKey="nombre"
                  cx="50%" cy="50%" outerRadius={60} label={renderLabel} labelLine={{ stroke: 'rgba(255,255,255,0.35)', strokeWidth: 1 }}>
                  {agruparTop(stats.trabajosPorEmpleado, 'trabajos').map((_, i) => <Cell key={i} fill={COLORS2[i % COLORS2.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => v + ' trabajos'} contentStyle={{ background: '#1e1f2b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="chart-empty">Sin trabajos registrados</p>}
        </div>

      </div>
    </div>
  );
}

export default PanelDashboard;