import { useState, useEffect, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect fill="#2a2a3d" width="44" height="44"/><text fill="#555" font-family="sans-serif" font-size="14" text-anchor="middle" x="22" y="28">?</text></svg>');
const LOGO_URL = '/uploads/1781569405191-1781114119055-logo.jpeg';

const API = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const r = await fetch(path, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
  return r.json();
};

function PanelPresupuestos() {
  const [productos, setProductos] = useState([]);
  const [presupuestos, setPresupuestos] = useState([]);
  const [items, setItems] = useState([]);
  const [cliente, setCliente] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');

  useEffect(() => {
    API('/api/productos').then(setProductos);
    API('/api/presupuestos').then(setPresupuestos);
  }, []);

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

  const { descripcionPago, factor } =
    metodoPago === 'credito' || metodoPago === 'cheques'
      ? { descripcionPago: 'Recargo 30%', factor: 1.30 }
      : { descripcionPago: 'Descuento 15%', factor: 0.85 };

  const ajuste = subtotal * (factor - 1);
  const totalFinal = subtotal * factor;

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

  const generarPDF = async (itemsList, clienteNombre, subtotalNum, totalNum, metodo, descuentoTexto, fecha, ajusteNum) => {
    const doc = new jsPDF();

    const logoData = await cargarImagen(LOGO_URL);
    if (logoData) {
      doc.addImage(logoData, 'JPEG', 14, 10, 36, 36);
    }

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('MST Alarmas & Seguridad', 58, 22);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Soluciones integrales en seguridad electrónica', 58, 28);
    doc.text('Tel: (011) 1234-5678 | Email: info@mstalarmas.com.ar', 58, 33);

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
    const rightCol = 140;
    const labelX = rightCol;
    const valueX = 170;

    doc.setFontSize(10);
    doc.text('Subtotal:', labelX, tableEnd);
    doc.text(`$${subtotalNum.toLocaleString()}`, valueX, tableEnd, { align: 'right' });

    doc.text(descuentoTexto + ':', labelX, tableEnd + 6);
    const ajusteStr = ajusteNum >= 0 ? `+$${ajusteNum.toLocaleString()}` : `-$${Math.abs(ajusteNum).toLocaleString()}`;
    doc.text(ajusteStr, valueX, tableEnd + 6, { align: 'right' });

    doc.setDrawColor(200, 200, 200);
    doc.line(rightCol, tableEnd + 8, 196, tableEnd + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL:', labelX, tableEnd + 14);
    doc.text(`$${totalNum.toLocaleString()}`, valueX, tableEnd + 14, { align: 'right' });

    const finalY = tableEnd + 26;
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.8);
    doc.line(14, finalY, 196, finalY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('MST Alarmas - Seguridad Inteligente', 14, finalY + 8);
    doc.text('Gracias por confiar en nosotros.', 14, finalY + 14);
    doc.text('Válido por 15 días.', 14, finalY + 20);

    doc.save(`presupuesto-${fecha.replace(/\//g, '-')}.pdf`);
  };

  const guardarPresupuesto = async () => {
    if (items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }
    try {
      const nuevo = await API('/api/presupuestos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: cliente || null,
          items,
          total: totalFinal,
          metodoPago,
          subtotal
        })
      });
      setPresupuestos([nuevo, ...presupuestos]);
      await generarPDF(items, cliente, subtotal, totalFinal, metodoPago, descripcionPago, nuevo.fecha, ajuste);
      setItems([]);
      setCliente('');
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
    const clienteNombre = p.cliente || '';
    const pSubtotal = p.subtotal || itemsData.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const pMetodo = p.metodoPago || 'efectivo';
    const pFactor = pMetodo === 'credito' || pMetodo === 'cheques' ? 1.30 : 0.85;
    const pAjuste = pSubtotal * (pFactor - 1);
    const pDescripcion = pMetodo === 'credito' || pMetodo === 'cheques' ? 'Recargo 30%' : 'Descuento 15%';
    await generarPDF(itemsData, clienteNombre, pSubtotal, p.total, pMetodo, pDescripcion, p.fecha, pAjuste);
  };

  return (
    <div className="panel-presupuestos">
      <div className="presupuestos-header">
        <h1>Presupuestos</h1>
      </div>

      <div className="presupuesto-form">
        <div className="pf-left">
          <label>Cliente (opcional)</label>
          <div className="pf-row">
            <input value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre del cliente" />
          </div>

          <label>Productos disponibles</label>
          <div className="pf-grid">
            {productos.map(p => (
              <div key={p.id} className="pf-item" onClick={() => agregarItem(p)}>
                <img src={p.imagen || FALLBACK_IMG} alt={p.nombre} onError={(e) => { if (e.target.src !== FALLBACK_IMG) e.target.src = FALLBACK_IMG; }} />
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
                {/* 1. Blindamos el Subtotal */}
                <div className="pf-total" translate="no">
                  Subtotal: $<span>{subtotal.toLocaleString()}</span>
                </div>
                
                {/* 2. Blindamos los Descuentos y Recargos */}
                <div className="pf-ajuste" translate="no">
                  {metodoPago === 'efectivo' ? (
                    <span className="pf-descuento">
                      Descuento 15%: -$<span>{Math.abs(ajuste).toLocaleString()}</span>
                    </span>
                  ) : (
                    <span className="pf-recargo">
                      Recargo 30%: +$<span>{ajuste.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                
                {/* 3. Blindamos el Total Final */}
                <div className="pf-total pf-total-final" translate="no">
                  Total: $<span>{totalFinal.toLocaleString()}</span>
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
                <span className={p.cliente ? 'pc-cliente' : 'pc-cliente sin-cliente'}>{p.cliente || 'Sin cliente'}</span>
                <span className="pc-metodo">{p.metodoPago === 'credito' ? 'Crédito' : p.metodoPago === 'cheques' ? 'Cheques' : 'Efectivo'}</span>
                <span className="pc-total">${parseFloat(p.total).toLocaleString()}</span>
              </div>
              <div className="pc-acciones">
                <button className="btn-eliminar" onClick={(e) => { e.stopPropagation(); eliminarPresupuesto(p.id); }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PanelPresupuestos;
