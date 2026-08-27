import { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getApiUrl } from './config';

const LOGO_URL = '/logoJB.jpeg';

const API = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const r = await fetch(getApiUrl(path), {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
  return r.json();
};

function PanelPresupuestos() {
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [items, setItems] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [clienteQuery, setClienteQuery] = useState('');
  const [clientesAbierto, setClientesAbierto] = useState(false);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [guardandoCliente, setGuardandoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombre: '', telefono: '', email: '', direccion: '', documento: '' });
  const [metodoPago, setMetodoPago] = useState('efectivo');

  useEffect(() => {
    API('/api/productos').then(setProductos);
    API('/api/clientes').then(setClientes);
    API('/api/presupuestos').then(setPresupuestos);
  }, []);

  const clienteSeleccionado = clientes.find(c => String(c.id) === String(clienteId));
  const clientesFiltrados = clientes.filter(c => {
    const texto = `${c.nombre} ${c.telefono || ''} ${c.email || ''} ${c.direccion || ''} ${c.documento || ''}`.toLowerCase();
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(clienteQuery.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  });

  const seleccionarCliente = (clienteSeleccionadoNuevo) => {
    setClienteId(clienteSeleccionadoNuevo.id);
    setClienteQuery(clienteSeleccionadoNuevo.nombre);
    setClientesAbierto(false);
  };

  const crearClienteRapido = async (e) => {
    e.preventDefault();
    setGuardandoCliente(true);
    try {
      const creado = await API('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente)
      });
      setClientes(prev => [creado, ...prev]);
      seleccionarCliente(creado);
      setNuevoCliente({ nombre: '', telefono: '', email: '', direccion: '', documento: '' });
      setMostrarNuevoCliente(false);
    } catch (err) {
      alert('Error al crear cliente: ' + err.message);
    } finally {
      setGuardandoCliente(false);
    }
  };

  const agregarItem = (p) => {
    setItems(prev => {
      const ex = prev.find(x => x.id === p.id);
      if (ex) return prev.map(x => x.id === p.id ? { ...x, cantidad: x.cantidad + 1 } : x);
      return [...prev, { id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1, imagen: p.imagen }];
    });
  };

  const cambiarCantidad = (id, cant) => {
    if (cant < 1) {
      setItems(prev => prev.filter(x => x.id !== id));
      return;
    }
    setItems(prev => prev.map(x => x.id === id ? { ...x, cantidad: cant } : x));
  };

  const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const cargarImagen = useCallback((url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }, []);

  const generarPDF = async (itemsList, clienteNombre, subtotalNum, totalNum, metodo, fecha) => {
    const doc = new jsPDF();

    const logoData = await cargarImagen(LOGO_URL);
    if (logoData) {
      doc.addImage(logoData, 'JPEG', 14, 10, 36, 36);
    }

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('JB Seguridad', 58, 22);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Soluciones integrales en seguridad electrónica', 58, 28);
    doc.text('Tel: 3462369691 | Email: jb.seguridad.panelessolares@gmail.com', 58, 33);

    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.8);
    doc.line(14, 50, 196, 50);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PRESUPUESTO', 105, 62, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const infoX = 14;
    let infoY = 72;
    doc.text(`Fecha: ${fecha}`, infoX, infoY);
    infoY += 6;
    if (clienteNombre) {
      doc.text(`Cliente: ${clienteNombre}`, infoX, infoY);
      infoY += 6;
    }
    doc.text(`Condición de pago: ${metodo === 'efectivo' ? 'Efectivo' : metodo === 'credito' ? 'Crédito' : 'Cheques'}`, infoX, infoY);
    infoY += 8;

    const body = itemsList.map((i, idx) => [
      idx + 1,
      i.nombre,
      i.cantidad,
      `$${i.precio.toLocaleString()}`,
      `$${(i.precio * i.cantidad).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: infoY,
      head: [['#', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body,
      theme: 'striped',
      headStyles: { fillColor: [102, 126, 234] },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 16, halign: 'center' }, 3: { cellWidth: 34, halign: 'right' }, 4: { cellWidth: 34, halign: 'right' } }
    });

    const tableEnd = doc.lastAutoTable.finalY + 6;
    const rightEdge = 196;
    const labelX = 135;
    const valueX = rightEdge;

    doc.setFontSize(10);
    doc.text('Subtotal:', labelX, tableEnd, { align: 'right' });
    doc.text(`$${subtotalNum.toLocaleString()}`, valueX, tableEnd, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(labelX, tableEnd + 8, rightEdge, tableEnd + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', labelX, tableEnd + 14, { align: 'right' });
    doc.text(`$${totalNum.toLocaleString()}`, valueX, tableEnd + 14, { align: 'right' });

    const finalY = tableEnd + 26;
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.8);
    doc.line(14, finalY, 196, finalY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('JB Seguridad - Seguridad Inteligente', 14, finalY + 8);
    doc.text('Gracias por confiar en nosotros.', 14, finalY + 14);
    doc.text('Válido por 15 días.', 14, finalY + 20);

    doc.save(`presupuesto-${fecha.replace(/\//g, '-')}.pdf`);
  };

  const guardarPresupuesto = async () => {
    if (items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }
    if (!clienteSeleccionado) {
      alert('Seleccioná un cliente antes de guardar el presupuesto');
      return;
    }
    try {
      const nuevo = await API('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          items,
          total: subtotal,
          metodoPago,
          subtotal
        })
      });
      setPresupuestos([nuevo, ...presupuestos]);
      await generarPDF(items, clienteSeleccionado.nombre, subtotal, subtotal, metodoPago, nuevo.fecha);
      setItems([]);
      setClienteId('');
      setClienteQuery('');
      setMetodoPago('efectivo');
    } catch (err) {
      alert('Error al guardar presupuesto: ' + err.message);
    }
  };

  const eliminarPresupuesto = async (id) => {
    if (!window.confirm("¿Eliminar presupuesto?")) return;
    try {
      await API(`/api/presupuestos/${id}`, { method: 'DELETE' });
      setPresupuestos(presupuestos.filter(p => p.id !== id));
    } catch (err) {
      alert('Error al eliminar presupuesto: ' + err.message);
    }
  };

  const descargarPDF = async (p) => {
    const itemsData = JSON.parse(p.items);
    const clienteNombre = p.Cliente?.nombre || p.cliente || '';
    const pSubtotal = p.subtotal || itemsData.reduce((s, i) => s + i.precio * i.cantidad, 0);
    await generarPDF(itemsData, clienteNombre, pSubtotal, pSubtotal, p.metodoPago || 'efectivo', p.fecha);
  };

  return (
    <div className="panel-presupuestos presupuestos-scroll">
      <div className="presupuestos-header">
        <h1>Presupuestos</h1>
      </div>

      <div className="presupuesto-form">
        <div className="pf-left">
          <label>Cliente</label>
          <div className="cliente-buscador">
            <input
              value={clienteQuery}
              onFocus={() => setClientesAbierto(true)}
              onChange={e => { setClienteQuery(e.target.value); setClienteId(''); setClientesAbierto(true); }}
              placeholder="Buscar por nombre, DNI/CUIT, teléfono o email"
              autoComplete="off"
            />
            {clientesAbierto && (
              <div className="clientes-resultados">
                {clientesFiltrados.map(c => (
                  <button type="button" className="cliente-resultado" key={c.id} onClick={() => seleccionarCliente(c)}>
                    <strong>{c.nombre}</strong>
                    <small>{c.documento || c.telefono || c.email || 'Sin datos adicionales'}</small>
                  </button>
                ))}
                {clientesFiltrados.length === 0 && (
                  <button type="button" className="crear-cliente-opcion" onClick={() => { setMostrarNuevoCliente(true); setClientesAbierto(false); }}>
                    + Crear nuevo cliente
                  </button>
                )}
              </div>
            )}
          </div>
          {clienteSeleccionado && (
            <div className="cliente-resumen">
              <div>
                <strong>{clienteSeleccionado.nombre}</strong>
                <span>{clienteSeleccionado.telefono || 'Sin teléfono'}{clienteSeleccionado.documento ? ` · ${clienteSeleccionado.documento}` : ''}</span>
              </div>
              <button type="button" onClick={() => { setClienteId(''); setClienteQuery(''); }}>Cambiar</button>
            </div>
          )}

          <label>Productos disponibles</label>
          <div className="pf-grid">
            {productos.map(p => (
              <div key={p.id} className="pf-item" onClick={() => agregarItem(p)}>
                <strong>{p.nombre}</strong>
                <small>${p.precio?.toLocaleString()}</small>
              </div>
            ))}
            {productos.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', gridColumn: '1 / -1', textAlign: 'center', padding: 20 }}>No hay productos disponibles.</p>}
          </div>
        </div>

        <div className="pf-right">
          <div className="pf-seleccionados">
            <label>Productos seleccionados</label>
            {items.length === 0 && <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: 12, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>Hacé clic en un producto de la izquierda para agregarlo.</p>}
            {items.map(i => (
              <div key={i.id} className="pf-cant">
                <span className="pf-nombre">{i.nombre}</span>
                <div className="cant-control">
                  <button type="button" onClick={() => cambiarCantidad(i.id, i.cantidad - 1)}>-</button>
                  <span>{i.cantidad}</span>
                  <button type="button" onClick={() => cambiarCantidad(i.id, i.cantidad + 1)}>+</button>
                </div>
                <span className="pf-precio">${i.precio.toLocaleString()}</span>
                <span className="pf-subtotal">${(i.precio * i.cantidad).toLocaleString()}</span>
              </div>
            ))}
            {items.length > 0 && (
              <>
                <div className="pf-total" translate="no">
                  Subtotal: $<span>{subtotal.toLocaleString()}</span>
                </div>
                
                <div className="pf-total pf-total-final" translate="no">
                  Total: $<span>{subtotal.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <label>Condición de pago</label>
          <div className="pf-metodo-pago">
            {['efectivo', 'credito', 'cheques'].map(m => (
              <button key={m} type="button"
                className={`pf-metodo-btn${metodoPago === m ? ' activo' : ''}`}
                onClick={() => setMetodoPago(m)}>
                {m === 'efectivo' ? 'Efectivo' : m === 'credito' ? 'Crédito' : 'Cheques'}
              </button>
            ))}
          </div>

          <div className="pf-actions">
            <button className="btn-generar-pdf" onClick={guardarPresupuesto} disabled={items.length === 0}>
              Generar PDF & Guardar
            </button>
          </div>
        </div>
      </div>

      {presupuestos.length > 0 && (
        <div className="presupuestos-historial">
          <h2>Historial de Presupuestos</h2>
          {presupuestos.map(p => (
            <div key={p.id} className="presupuesto-card" onClick={() => descargarPDF(p)}>
              <div className="pc-header">
                <strong>{p.fecha}</strong>
                <span className={p.Cliente?.nombre || p.cliente ? 'pc-cliente' : 'pc-cliente sin-cliente'}>{p.Cliente?.nombre || p.cliente || 'Sin cliente'}</span>
                <span className="pc-metodo">{p.metodoPago === 'credito' ? 'Crédito' : p.metodoPago === 'cheques' ? 'Cheques' : 'Efectivo'}</span>
                <span className={`estado-presupuesto ${p.estado || 'pendiente'}`}>{p.estado || 'Pendiente'}</span>
                <span className="pc-total">${parseFloat(p.total).toLocaleString()}</span>
              </div>
              <div className="pc-acciones">
                <button className="btn-eliminar" onClick={(e) => { e.stopPropagation(); eliminarPresupuesto(p.id); }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarNuevoCliente && (
        <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setMostrarNuevoCliente(false); }}>
          <form className="cliente-modal" onSubmit={crearClienteRapido}>
            <div className="modal-header">
              <div>
                <span className="modal-kicker">Alta rápida</span>
                <h2>Nuevo cliente</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setMostrarNuevoCliente(false)} aria-label="Cerrar">×</button>
            </div>
            <p className="modal-description">El presupuesto que estás armando se conservará.</p>
            <div className="cliente-modal-grid">
              <input placeholder="Nombre completo *" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} required autoFocus />
              <input placeholder="DNI / CUIT" value={nuevoCliente.documento} onChange={e => setNuevoCliente({ ...nuevoCliente, documento: e.target.value })} />
              <input placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
              <input type="email" placeholder="Email" value={nuevoCliente.email} onChange={e => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} />
              <input className="cliente-modal-full" placeholder="Dirección" value={nuevoCliente.direccion} onChange={e => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancelar" onClick={() => setMostrarNuevoCliente(false)}>Cancelar</button>
              <button type="submit" className="btn-guardar" disabled={guardandoCliente}>{guardandoCliente ? 'Guardando...' : 'Guardar y seleccionar'}</button>
            </div>
          </form>
      </div>
      )}
    </div>
  );
}

export default PanelPresupuestos;
