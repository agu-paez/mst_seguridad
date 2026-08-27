import { useState, useEffect } from 'react';
import { getApiUrl } from './config';

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
  const [form, setForm] = useState({ nombre: '', telefono: '', email: '', direccion: '', documento: '' });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarTrabajo, setMostrarTrabajo] = useState(false);
  const [formTrabajo, setFormTrabajo] = useState({ descripcion: '', labor: '', usuarioId: '', presupuestoId: '', estadoPresupuesto: 'pendiente' });
  const [trabajoEditando, setTrabajoEditando] = useState(null);
  const [trabajoDetalle, setTrabajoDetalle] = useState(null);
  const [ocultarProductosNoSeleccionados, setOcultarProductosNoSeleccionados] = useState(false);
  const [prodsSel, setProdsSel] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [presupuestoDetalle, setPresupuestoDetalle] = useState(null);

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
    setForm({ nombre: '', telefono: '', email: '', direccion: '', documento: '' });
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
  const productosTrabajoVisibles = productos.filter(p => !ocultarProductosNoSeleccionados || prodsSel.some(item => item.id === Number(p.id)));

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
      const r = await fetch(getApiUrl(trabajoEditando ? `/api/trabajos/${trabajoEditando.id}` : '/api/trabajos'), { method: trabajoEditando ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      if (!r.ok) { const e = await r.json(); alert('Error: ' + (e.error || 'desconocido')); return; }
      if (formTrabajo.presupuestoId) {
        await API(`/api/presupuestos/${formTrabajo.presupuestoId}/estado`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: formTrabajo.estadoPresupuesto })
        });
      }
      setFormTrabajo({ descripcion: '', labor: '', usuarioId: '', presupuestoId: '', estadoPresupuesto: 'pendiente' });
      setProdsSel([]);
      setMostrarTrabajo(false);
      setTrabajoEditando(null);
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

  const editarTrabajo = (trabajo) => {
    const productosTrabajo = parseProds(trabajo) || [];
    const totalProductos = productosTrabajo.reduce((total, producto) => total + parsePrecio(producto.precio) * Math.max(parseCantidad(producto.cantidad), 1), 0);
    setTrabajoEditando(trabajo);
    setProdsSel(productosTrabajo);
    setFormTrabajo({ descripcion: trabajo.descripcion || '', labor: Math.max(0, parsePrecio(trabajo.monto) - totalProductos).toString(), usuarioId: trabajo.usuarioId || '', presupuestoId: '', estadoPresupuesto: 'pendiente' });
    setMostrarTrabajo(true);
    setOcultarProductosNoSeleccionados(false);
  };

  const cancelarEdicionTrabajo = () => {
    setTrabajoEditando(null);
    setMostrarTrabajo(false);
    setProdsSel([]);
    setFormTrabajo({ descripcion: '', labor: '', usuarioId: '', presupuestoId: '', estadoPresupuesto: 'pendiente' });
  };

  const clientesFiltrados = clientes.filter(c => {
    const texto = `${c.nombre} ${c.telefono || ''} ${c.email || ''} ${c.documento || ''}`.toLowerCase();
    return texto.includes(busquedaCliente.toLowerCase());
  });

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
           <input placeholder="DNI / CUIT" value={form.documento} onChange={e => setForm({ ...form, documento: e.target.value })} />
           <input placeholder="Dirección" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
          <div className="form-acciones">
            <button type="submit" className="btn-guardar">Guardar</button>
            <button type="button" className="btn-cancelar" onClick={() => setMostrarForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="clientes-layout">
         <div className="clientes-lista">
           <input className="clientes-filtro" value={busquedaCliente} onChange={e => setBusquedaCliente(e.target.value)} placeholder="Buscar cliente..." />
           {clientesFiltrados.map(c => (
            <div key={c.id} className={`cliente-item ${clienteSel?.id === c.id ? 'sel' : ''}`} onClick={() => cargarCliente(c.id)}>
              <strong>{c.nombre}</strong>
              <small>{c.telefono || 'Sin teléfono'} · {c.fechaCreacion}</small>
            </div>
             ))}
           {clientesFiltrados.length === 0 && <p className="clientes-sin-resultados">No se encontraron clientes.</p>}
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
            <p><strong>DNI / CUIT:</strong> {clienteSel.documento || '-'}</p>
            <p><strong>Desde:</strong> {clienteSel.fechaCreacion}</p>

            <h3 className="historial-cliente-titulo">Historial de Presupuestos</h3>
            {(!clienteSel.Presupuestos || clienteSel.Presupuestos.length === 0) && <p className="historial-vacio">Sin presupuestos registrados.</p>}
            {clienteSel.Presupuestos?.map(p => (
              <div key={p.id} className="cliente-presupuesto-card">
                <strong>{p.fecha}</strong>
                <span>${parsePrecio(p.total).toLocaleString()}</span>
                <small className={`estado-presupuesto ${p.estado || 'pendiente'}`}>{p.estado || 'Pendiente'}</small>
                <button type="button" className="btn-detalle-presupuesto" onClick={() => setPresupuestoDetalle(p)}>Detalle</button>
              </div>
            ))}

            <h3 style={{ marginTop: 24 }}>Historial de Trabajos</h3>
             <button className="btn-agregar-cliente" onClick={() => { cancelarEdicionTrabajo(); setMostrarTrabajo(true); }} style={{ marginBottom: 12 }}>+ Agregar Trabajo</button>

            {mostrarTrabajo && (
              <form className="form-trabajo" onSubmit={crearTrabajo}>
                <textarea placeholder="Descripción del trabajo realizado" value={formTrabajo.descripcion} onChange={e => setFormTrabajo({ ...formTrabajo, descripcion: e.target.value })} required />

                <div className="prod-selector">
                  <div className="productos-trabajo-header">
                    <label>Productos de la tienda usados:</label>
                    <button type="button" className={`btn-filtro-productos${ocultarProductosNoSeleccionados ? ' activo' : ''}`} onClick={() => setOcultarProductosNoSeleccionados(!ocultarProductosNoSeleccionados)}>
                      {ocultarProductosNoSeleccionados ? 'Mostrar todos' : 'Ocultar no seleccionados'}
                    </button>
                  </div>
                  <div className="prod-grid">
                    {productosTrabajoVisibles.map(p => (
                      <div key={p.id} className="prod-item" onClick={() => agregarProd(p)}>
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
                  <label>Presupuesto relacionado:</label>
                  <select value={formTrabajo.presupuestoId} onChange={e => setFormTrabajo({ ...formTrabajo, presupuestoId: e.target.value })}>
                    <option value="">Sin presupuesto relacionado</option>
                    {clienteSel.Presupuestos?.map(p => (
                      <option key={p.id} value={p.id}>#{p.id} · {p.fecha} · ${parsePrecio(p.total).toLocaleString()}</option>
                    ))}
                  </select>
                </div>

                <div className="labor-field">
                  <label>Estado del presupuesto:</label>
                  <select value={formTrabajo.estadoPresupuesto} onChange={e => setFormTrabajo({ ...formTrabajo, estadoPresupuesto: e.target.value })}>
                    <option value="pendiente">Pendiente</option>
                    <option value="aprobado">Aprobado</option>
                    <option value="completado">Completado</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>

                <div className="labor-field">
                  <label>Empleado que realizó el trabajo:</label>
                  <select className="trabajo-select" value={formTrabajo.usuarioId} onChange={e => setFormTrabajo({ ...formTrabajo, usuarioId: e.target.value })}>
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
              return (
                <div key={t.id} className="trabajo-card">
                  <div className="trabajo-header">
                    <strong>{t.fecha}</strong>
                    <span className="trabajo-monto">${parsePrecio(t.monto).toLocaleString()}</span>
                    <button className="btn-detalle-trabajo" onClick={() => setTrabajoDetalle(t)}>Detalle</button>
                    <button className="btn-editar-trabajo" onClick={() => editarTrabajo(t)}>Editar</button>
                    <button className="btn-eliminar" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => eliminarTrabajo(t.id)}>✕</button>
                  </div>
                  <p>{t.descripcion}</p>

                  {t.imagenes && JSON.parse(t.imagenes).map((img, i) => (
                    <img key={i} src={img} alt={`trabajo-${i}`} className="trabajo-img" />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {presupuestoDetalle && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setPresupuestoDetalle(null); }}>
          <div className="cliente-modal presupuesto-detalle-modal">
            <div className="modal-header">
              <div>
                <span className="modal-kicker">Presupuesto #{presupuestoDetalle.id}</span>
                <h2>Detalle del presupuesto</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setPresupuestoDetalle(null)} aria-label="Cerrar">×</button>
            </div>
            <div className="detalle-presupuesto-meta">
              <span><strong>Fecha:</strong> {presupuestoDetalle.fecha}</span>
              <span><strong>Cliente:</strong> {clienteSel?.nombre || presupuestoDetalle.Cliente?.nombre || '-'}</span>
              <span><strong>Pago:</strong> {presupuestoDetalle.metodoPago === 'credito' ? 'Crédito' : presupuestoDetalle.metodoPago === 'cheques' ? 'Cheques' : 'Efectivo'}</span>
              <span><strong>Estado:</strong> {presupuestoDetalle.estado || 'Pendiente'}</span>
            </div>
            <div className="detalle-presupuesto-items">
              <div className="detalle-presupuesto-heading"><span>Producto</span><span>Cant.</span><span>Subtotal</span></div>
              {(() => {
                let itemsDetalle = [];
                try { itemsDetalle = JSON.parse(presupuestoDetalle.items); } catch { /* Presupuesto antiguo sin detalle válido. */ }
                return itemsDetalle.map((item, index) => (
                  <div className="detalle-presupuesto-item" key={`${item.id || item.nombre}-${index}`}>
                    <span>{item.nombre}</span>
                    <span>{item.cantidad}</span>
                    <strong>${(parsePrecio(item.precio) * parseCantidad(item.cantidad)).toLocaleString()}</strong>
                  </div>
                ));
              })()}
            </div>
            <div className="detalle-presupuesto-total">
              <span>Total</span>
              <strong>${parsePrecio(presupuestoDetalle.total).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}

      {trabajoDetalle && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setTrabajoDetalle(null); }}>
          <div className="cliente-modal presupuesto-detalle-modal">
            <div className="modal-header">
              <div>
                <span className="modal-kicker">Trabajo #{trabajoDetalle.id}</span>
                <h2>Detalle del trabajo</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setTrabajoDetalle(null)} aria-label="Cerrar">×</button>
            </div>
            <div className="detalle-presupuesto-meta">
              <span><strong>Fecha:</strong> {trabajoDetalle.fecha}</span>
              <span><strong>Total:</strong> ${parsePrecio(trabajoDetalle.monto).toLocaleString()}</span>
            </div>
            <p className="detalle-trabajo-descripcion">{trabajoDetalle.descripcion}</p>
            <div className="detalle-presupuesto-items">
              <div className="detalle-presupuesto-heading"><span>Producto</span><span>Cant.</span><span>Subtotal</span></div>
              {(() => {
                const itemsTrabajo = parseProds(trabajoDetalle) || [];
                return itemsTrabajo.length > 0 ? itemsTrabajo.map((item, index) => (
                  <div className="detalle-presupuesto-item" key={`${item.id || item.nombre}-${index}`}>
                    <span>{item.nombre}</span>
                    <span>{item.cantidad || 1}</span>
                    <strong>${(parsePrecio(item.precio) * Math.max(parseCantidad(item.cantidad), 1)).toLocaleString()}</strong>
                  </div>
                )) : <p className="historial-vacio">Sin productos asociados.</p>;
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PanelClientes;
