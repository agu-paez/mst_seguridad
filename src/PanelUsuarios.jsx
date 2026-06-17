import { useState, useEffect } from 'react';
import './usuarios.css';

const API = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const r = await fetch(path, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
  return r.json();
};

function PanelUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({ nombre: '', password: '', cargo: 'empleado' });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    API('/api/usuarios').then(setUsuarios);
  }, []);

  const crearUsuario = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.nombre || !form.password) {
      setError('Nombre y contraseña requeridos');
      return;
    }
    try {
      const nuevo = await API('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      setUsuarios([...usuarios, nuevo]);
      setForm({ nombre: '', password: '', cargo: 'empleado' });
      setMostrarForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const eliminarUsuario = async (id) => {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    try {
      await API(`/api/usuarios/${id}`, { method: 'DELETE' });
      setUsuarios(usuarios.filter(u => u.id !== id));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="panel-usuarios">
      <div className="usuarios-header">
        <h1>Usuarios</h1>
        <button className="btn-agregar-usuario" onClick={() => setMostrarForm(true)}>+ Nuevo Usuario</button>
      </div>

      {mostrarForm && (
        <form className="form-usuario" onSubmit={crearUsuario} autoComplete="off">
          {error && <p className="form-error">{error}</p>}
          <input placeholder="Nombre de usuario" value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })} required spellCheck={false} />
          <input type="password" placeholder="Contraseña" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          <select translate="no" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}>
            <option value="empleado">Empleado</option>
            <option value="administrador">Administrador</option>
          </select>
          <div className="form-acciones">
            <button type="submit" className="btn-guardar">Guardar</button>
            <button type="button" className="btn-cancelar" onClick={() => { setMostrarForm(false); setError(''); }}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="usuarios-lista">
        {usuarios.map(u => (
          <div key={u.id} className="usuario-item">
            <div className="usuario-info">
              <strong>{u.nombre}</strong>
              <span className={`usuario-cargo cargo-${u.cargo}`}>{u.cargo}</span>
            </div>
            <button className="btn-eliminar" onClick={() => eliminarUsuario(u.id)}>✕</button>
          </div>
        ))}
        {usuarios.length === 0 && (
          <p style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>No hay usuarios registrados.</p>
        )}
      </div>
    </div>
  );
}

export default PanelUsuarios;
