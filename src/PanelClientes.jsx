import { useState, useEffect } from 'react';
import { getApiUrl, getImageUrl } from './config';

const FALLBACK_IMG_SMALL = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect fill="#2a2a3d" width="40" height="40"/><text fill="#555" font-family="sans-serif" font-size="12" text-anchor="middle" x="20" y="25">?</text></svg>');

const API = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const r = await fetch(getApiUrl(path), {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
  return r.json();
};

function PanelClientes() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', direccion: '' });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarTrabajo, setMostrarTrabajo] = useState(false);
  const [formTrabajo, setFormTrabajo] = useState({ descripcion: '', labor: '', usuarioId: '' });
  const [prodsSel, setProdsSel] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  useEffect(() => {
    API('/api/clientes').then(setClientes);
    API('/api/productos').then(setProductos);
    API('/api/usuarios').then(setEmpleados);
  }, []);

  const cargarCliente = async (id) => {
    try {
      const c = await API(`/api/clientes/${id}`);
      setClienteSel(c);
    } catch (err) {
      console.error('Error cargando cliente:', err);
    }
  };

  const crearCliente = async (e) => {
    e.preventDefault();
    await API('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ nombre: '', telefono: '', email: '', direccion: '' });
    setMostrarForm(false);
    API('/api/clientes').then(setClientes);
  };

  const eliminarCliente = async (id) => {
    if (!window.confirm("¿Eliminar cliente?")) return;
    await API(`/api/clientes/${id}`, { method: 'DELETE' });
    setClientes(clientes.filter(c => c.id !== id));
    if (clienteSel?.id === id) setClienteSel(null);
  };

  const parsePrecio = (value) => {
    if (value === null || value === undefined) return 0;
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  };

  const parseCantidad = (value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Math.max(0, value);
    const n = Number(value);
    return isNaN(n) ? 0 : Math.max(0, n);
  };

  const labor = parsePrecio(formTrabajo.labor);
  const totProds = prodsSel.reduce((s, p) => {
    return s + parsePrecio(p.precio) * Math.max(parseCantidad(p.cantidad), 1);
  }, 0);
  const montoFinal = totProds + labor;

  const agregarProd = (p) => {
    const nid = Number(p.id);
    setProdsSel(prev => {
      const ex = prev.find(x => x.id === nid);
      if (ex) return prev.map(x => x.id === nid ? { ...x, cantidad: (x.cantidad || 1) + 1 } : x);
      return [...prev, { id: nid, nombre: p.nombre, precio: parsePrecio(p.precio), cantidad: 1 }];
    });
  };

  const cambiarCant = (id, cant) => {
    const nid = Number(id);
    if (cant < 1) { setProdsSel(prev => prev.filter(x => x.id !== nid)); return; }
    setProdsSel(prev => prev.map(x => x.id === nid ? { ...x, cantidad: cant } : x));
  };

  const crearTrabajo = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('clienteId', clienteSel.id);
    fd.append('descripcion', formTrabajo.descripcion);
    fd.append('monto', montoFinal.toString());
    fd.append('productos', JSON.stringify(prodsSel));
    if (formTrabajo.usuarioId) fd.append('usuarioId', formTrabajo.usuarioId);
    const fileInput = document.getElementById('imgTrabajo');
    if (fileInput?.files) {
      for (const f of fileInput.files) fd.append('imagenes', f);
    }
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(getApiUrl('/api/trabajos'), { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!r.ok) { const e = await r.json(); alert('Error: ' + (e.error || 'desconocido')); return; }
      setFormTrabajo({ descripcion: '', labor: '', usuarioId: '' });
      setProdsSel([]);
      setMostrarTrabajo(false);
      await cargarCliente(clienteSel.id);
    } catch (err) {
      alert('Error al crear trabajo: ' + err.message);
    }
  };

  const eliminarTrabajo = async (id) => {
    if (!window.confirm("¿Eliminar trabajo?")) return;
    try {
      await API(`/api/trabajos/${id}`, { method: 'DELETE' });
      await cargarCliente(clienteSel.id);
    } catch (err) {
      alert('Error al eliminar trabajo: ' + err.message);
    }
  };

  const parseProds = (t) => {
    if (!t.productos) return null;
    try { return JSON.parse(t.productos); } catch { return null; }
  };

  return (
    <div className="panel-clientes">
      <div className="clientes-header">
        <h1>Clientes</h1>
        <button className="btn-agregar-cliente" onClick={() => setMostrarForm(true)}>+ Nuevo Cliente</button>
      </div>

      {mostrarForm && (
        <form className="form-cliente" onSubmit={crearCliente}>
          <input placeholder="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          <input placeholder="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
          <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
          <div className="form-acciones">
            <button type="submit" className="btn-guardar">Guardar</button>
            <button type="button" className="btn-cancelar" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="clientes-layout">
        <div className="clientes-lista">
          {clientes.map(c => (
            <div key={c.id} className={`cliente-item ${clienteSel?.id === c.id ? 'sel' : ''}`} onClick={() => cargarCliente(c.id)}>
              <strong>{c.nombre}</strong>
              <small>{c.telefono || 'Sin teléfono'} · {c.fechaCreacion}</small>
            </div>
          ))}
        </div>

        {clienteSel && (
          <div className="cliente-detalle">
            <div className="detalle-header">
              <h2>{clienteSel.nombre}</h2>
              <button className="btn-eliminar" onClick={() => eliminarCliente(clienteSel.id)}>Eliminar</button>
            </div>
            <p><strong>Teléfono:</strong> {clienteSel.telefono || '-'}</p>
            <p><strong>Email:</strong> {clienteSel.email || '-'}</p>
            <p><strong>Dirección:</strong> {clienteSel.direccion || '-'}</p>
            <p><strong>Desde:</strong> {clienteSel.fechaCreacion}</p>

            <h3 style={{ marginTop: 24 }}>Historial de Trabajos</h3>
            <button className="btn-agregar-cliente" onClick={() => setMostrarTrabajo(true)} style={{ marginBottom: 12 }}>+ Agregar Trabajo</button>

            {mostrarTrabajo && (
              <form className="form-trabajo" onSubmit={crearTrabajo}>
                <textarea placeholder="Descripción del trabajo realizado" value={formTrabajo.descripcion} onChange={e => setFormTrabajo({ ...formTrabajo, descripcion: e.target.value })} required />

                <div className="prod-selector">
                  <label>Productos de la tienda usados:</label>
                  <div className="prod-grid">
                    {productos.map(p => (
                      <div key={p.id} className="prod-item" onClick={() => agregarProd(p)}>
                        <img src={getImageUrl(p.imagen) || FALLBACK_IMG_SMALL} alt={p.nombre} onError={(e) => { if (e.target.src !== FALLBACK_IMG_SMALL) e.target.src = FALLBACK_IMG_SMALL; }} />
                        <span>{p.nombre}</span>
                        <small>${p.precio?.toLocaleString()}</small>
                      </div>
                    ))}
                  </div>
                </div>

                {prodsSel.length > 0 && (
                  <div className="prods-seleccionados">
                    <label>Productos seleccionados:</label>
                    {prodsSel.map(p => (
                      <div key={p.id} className="prod-cant">
                        <span>{p.nombre}</span>
                        <div className="cant-control">
                          <button type="button" onClick={() => cambiarCant(p.id, (p.cantidad || 1) - 1)}>-</button>
                          <span>{p.cantidad || 1}</span>
                          <button type="button" onClick={() => cambiarCant(p.id, (p.cantidad || 1) + 1)}>+</button>
                        </div>
                        <span className="prod-subtotal">${(parsePrecio(p.precio) * Math.max(parseCantidad(p.cantidad), 1)).toLocaleString()}</span>
                      </div>
                    ))}
                    
                    {/* 1. Blindamos el Subtotal */}
                    <div className="prod-total" translate="no">
                      Subtotal productos: $<span>{totProds.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="labor-field">
                  <label>Empleado que realizó el trabajo:</label>
                  <select value={formTrabajo.usuarioId} onChange={e => setFormTrabajo({ ...formTrabajo, usuarioId: e.target.value })} style={{ padding: '12px 14px', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }}>
                    <option value="">Seleccionar empleado</option>
                    {empleados.map(e => (
                      <option key={e.id} value={e.id} style={{ color: '#000' }}>{e.nombre} ({e.cargo})</option>
                    ))}
                  </select>
                </div>

                <div className="labor-field">
                  <label>Mano de obra ($):</label>
                  <input type="number" placeholder="0" value={formTrabajo.labor} onChange={e => setFormTrabajo({ ...formTrabajo, labor: e.target.value })} />
                </div>

                {/* 2. Blindamos el Total Final */}
                <div className="monto-total-field" translate="no">
                  <strong>
                    Total: $<span>{montoFinal.toLocaleString()}</span> 
                  </strong>
                </div>

                <input type="file" id="imgTrabajo" multiple accept="image/*" />
                <div className="form-acciones">
                  <button type="submit" className="btn-guardar">Guardar Trabajo</button>
                  <button type="button" className="btn-cancelar" onClick={() => { setMostrarTrabajo(false); setProdsSel([]); }}>Cancelar</button>
                </div>
              </form>
            )}

            {(!clienteSel.Trabajos || clienteSel.Trabajos.length === 0) && <p style={{ color: 'rgba(255,255,255,0.4)' }}>Sin trabajos registrados.</p>}
            {clienteSel.Trabajos?.map(t => {
              const prods = parseProds(t);
              const subtotalProds = prods
                ? prods.reduce((s, p) => s + parsePrecio(p.precio) * Math.max(parseCantidad(p.cantidad), 1), 0)
                : 0;
              const manoDeObraReal = parsePrecio(t.monto) - subtotalProds;
              return (
                <div key={t.id} className="trabajo-card">
                  <div className="trabajo-header">
                    <strong>{t.fecha}</strong>
                    <span className="trabajo-monto">${parsePrecio(t.monto).toLocaleString()}</span>
                    <button className="btn-eliminar" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => eliminarTrabajo(t.id)}>✕</button>
                  </div>
                  <p>{t.descripcion}</p>

                  {prods && prods.length > 0 && (
                    <div className="trabajo-productos">
                      <strong>Productos usados:</strong>
                      {prods.map((p, i) => (
                        <div key={i} className="tp-item">
                          <span>{p.nombre} × {parseCantidad(p.cantidad) || 1}</span>
                          <span>${(parsePrecio(p.precio) * Math.max(parseCantidad(p.cantidad), 1)).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="tp-total">
                        <span>Mano de obra: ${manoDeObraReal.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {t.imagenes && JSON.parse(t.imagenes).map((img, i) => (
                    <img key={i} src={img} alt={`trabajo-${i}`} className="trabajo-img" />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PanelClientes;
