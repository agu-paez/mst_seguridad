import { useState, useEffect } from 'react';

const FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240"><rect fill="#2a2a3d" width="360" height="240"/><text fill="#555" font-family="sans-serif" font-size="16" text-anchor="middle" x="180" y="120">Sin imagen</text></svg>');

const API = async (path, opts = {}) => {
  const token = localStorage.getItem('token');
  const r = await fetch(path, {
    ...opts,
    headers: { ...opts.headers, Authorization: `Bearer ${token}` }
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.error || 'Error'); }
  return r.json();
};

function PanelProductos() {
  const [productos, setProductos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formProducto, setFormProducto] = useState({ nombre: '', precio: '', descripcion: '', imagenUrl: '', imagenFile: null });
  const [editandoId, setEditandoId] = useState(null);

  useEffect(() => {
    API('/api/productos').then(setProductos);
  }, []);

  const crearProducto = async (e) => {
    e.preventDefault();
    if (!formProducto.nombre || !formProducto.precio) {
      alert("Completa nombre y precio");
      return;
    }
    try {
      const formData = new FormData();
      formData.append('nombre', formProducto.nombre);
      formData.append('precio', formProducto.precio);
      formData.append('descripcion', formProducto.descripcion || '');
      if (formProducto.imagenFile) formData.append('imagen', formProducto.imagenFile);
      if (formProducto.imagenUrl) formData.append('imagenUrl', formProducto.imagenUrl);

      const token = localStorage.getItem('token');
      const r = await fetch('/api/productos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!r.ok) { const e = await r.json(); alert('Error: ' + (e.error || 'desconocido')); return; }
      const nuevo = await r.json();
      setProductos([...productos, nuevo]);
      setFormProducto({ nombre: '', precio: '', descripcion: '', imagenUrl: '', imagenFile: null });
      setMostrarForm(false);
    } catch (err) {
      alert('Error al crear producto: ' + err.message);
    }
  };

  const editarProducto = async (e) => {
    e.preventDefault();
    if (!formProducto.nombre || !formProducto.precio) {
      alert("Completa nombre y precio");
      return;
    }
    try {
      const formData = new FormData();
      formData.append('nombre', formProducto.nombre);
      formData.append('precio', formProducto.precio);
      formData.append('descripcion', formProducto.descripcion || '');
      if (formProducto.imagenFile) formData.append('imagen', formProducto.imagenFile);
      if (formProducto.imagenUrl) formData.append('imagenUrl', formProducto.imagenUrl);

      const token = localStorage.getItem('token');
      const r = await fetch(`/api/productos/${editandoId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!r.ok) { const e = await r.json(); alert('Error: ' + (e.error || 'desconocido')); return; }
      const actualizado = await r.json();
      setProductos(productos.map(p => p.id === actualizado.id ? actualizado : p));
      setEditandoId(null);
      setFormProducto({ nombre: '', precio: '', descripcion: '', imagenUrl: '', imagenFile: null });
    } catch (err) {
      alert('Error al editar producto: ' + err.message);
    }
  };

  const eliminarProducto = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      await API(`/api/productos/${id}`, { method: 'DELETE' });
      setProductos(productos.filter(p => p.id !== id));
    } catch (err) {
      alert('Error al eliminar producto: ' + err.message);
    }
  };

  const iniciarEdicion = (p) => {
    setEditandoId(p.id);
    setFormProducto({
      nombre: p.nombre,
      precio: p.precio?.toString() || '',
      descripcion: p.descripcion || '',
      imagenUrl: '',
      imagenFile: null
    });
    setMostrarForm(false);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setFormProducto({ nombre: '', precio: '', descripcion: '', imagenUrl: '', imagenFile: null });
  };

  return (
    <div className="panel-productos">
      <div className="productos-header">
        <h1>Productos</h1>
        {!editandoId && (
          <button className="btn-agregar-cliente" onClick={() => { setMostrarForm(!mostrarForm); cancelarEdicion(); }}>
            + Nuevo Producto
          </button>
        )}
      </div>

      {mostrarForm && !editandoId && (
        <form className="form-producto" onSubmit={crearProducto}>
          <input placeholder="Nombre del producto" value={formProducto.nombre} onChange={e => setFormProducto({ ...formProducto, nombre: e.target.value })} required />
          <input type="number" step="0.01" placeholder="Precio" value={formProducto.precio} onChange={e => setFormProducto({ ...formProducto, precio: e.target.value })} required />
          <textarea placeholder="Descripción (opcional)" value={formProducto.descripcion} onChange={e => setFormProducto({ ...formProducto, descripcion: e.target.value })} />
          <input placeholder="URL de imagen (opcional)" value={formProducto.imagenUrl} onChange={e => setFormProducto({ ...formProducto, imagenUrl: e.target.value })} />
          <input type="file" accept="image/*" onChange={e => setFormProducto({ ...formProducto, imagenFile: e.target.files[0] || null })} />
          {formProducto.imagenFile && <small style={{ color: 'rgba(255,255,255,0.5)' }}>{formProducto.imagenFile.name}</small>}
          <div className="form-acciones">
            <button type="submit" className="btn-guardar">Guardar</button>
            <button type="button" className="btn-cancelar" onClick={() => { setMostrarForm(false); setFormProducto({ nombre: '', precio: '', descripcion: '', imagenUrl: '', imagenFile: null }); }}>Cancelar</button>
          </div>
        </form>
      )}

      {editandoId && (
        <form className="form-producto" onSubmit={editarProducto}>
          <h3 style={{ color: '#fff', gridColumn: '1 / -1', margin: 0 }}>Editando producto</h3>
          <input placeholder="Nombre del producto" value={formProducto.nombre} onChange={e => setFormProducto({ ...formProducto, nombre: e.target.value })} required />
          <input type="number" step="0.01" placeholder="Precio" value={formProducto.precio} onChange={e => setFormProducto({ ...formProducto, precio: e.target.value })} required />
          <textarea placeholder="Descripción (opcional)" value={formProducto.descripcion} onChange={e => setFormProducto({ ...formProducto, descripcion: e.target.value })} />
          <input placeholder="URL de imagen (opcional)" value={formProducto.imagenUrl} onChange={e => setFormProducto({ ...formProducto, imagenUrl: e.target.value })} />
          <input type="file" accept="image/*" onChange={e => setFormProducto({ ...formProducto, imagenFile: e.target.files[0] || null })} />
          {formProducto.imagenFile && <small style={{ color: 'rgba(255,255,255,0.5)' }}>{formProducto.imagenFile.name}</small>}
          <div className="form-acciones">
            <button type="submit" className="btn-guardar">Guardar Cambios</button>
            <button type="button" className="btn-cancelar" onClick={cancelarEdicion}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="productos-grid">
        {productos.map(p => (
          <div key={p.id} className="producto-tarjeta">
            <img src={p.imagen || FALLBACK_IMG} alt={p.nombre} className="producto-imagen" onError={(e) => { if (e.target.src !== FALLBACK_IMG) e.target.src = FALLBACK_IMG; }} />
            <div className="producto-detalle">
              <h3>{p.nombre}</h3>
              <div className="producto-meta">
                <span className={`estado ${p.disponible === false ? 'agotado' : 'disponible'}`}>
                  {p.disponible === false ? 'No disponible' : 'Disponible'}
                </span>
                <p className="precio">${p.precio?.toLocaleString()}</p>
              </div>
              <p className="descripcion-producto">{p.descripcion || 'Protege tu hogar con tecnología confiable.'}</p>
              <div className="botones-producto">
                <button className="btn-editar" onClick={() => iniciarEdicion(p)}>Editar</button>
                <button className="btn-eliminar" onClick={() => eliminarProducto(p.id)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PanelProductos;
