import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Op } from 'sequelize';
import { sequelize, Producto, Factura, DetalleFactura, Usuario, Cliente, Trabajo, Presupuesto } from './db.js';
import crypto from 'crypto';

// Cargar variables de entorno desde .env manualmente (sin dotenv)
try {
    const envPath = path.resolve(new URL('.', import.meta.url).pathname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        for (const line of envContent.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) continue;
            const key = trimmed.slice(0, eqIdx).trim();
            const value = trimmed.slice(eqIdx + 1).trim();
            if (!process.env[key]) process.env[key] = value;
        }
    }
} catch {}

//---------------------CONFIGURACIONES INICIALES---------------------
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET no definido. Se usará uno generado (las sesiones se invalidarán al reiniciar). Configurá JWT_SECRET en producción.');
}
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.resolve(__dirname, '..', 'dist')));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Demasiados intentos de login. Intentá de nuevo en 15 minutos." }
});

//definimos lo que envia el front del  usuario
app.post('/api/login', loginLimiter, async (req, res) => {
    try{
        const { usuario, password } = req.body;
        const usuarioBuscado = await Usuario.findOne({ where: { nombre: usuario } });
        if (!usuarioBuscado) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }
        const passwordValida = await bcrypt.compare(password, usuarioBuscado.password);
        if (!passwordValida) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }   
        const token = jwt.sign({ id: usuarioBuscado.id, cargo: usuarioBuscado.cargo }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({
            exito: true,
            mensaje: `login exitoso, bienvenido ${usuarioBuscado.nombre}`,
            token,
            cargo: usuarioBuscado.cargo
        });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});


//---------------------MIDDLEWARE DE AUTENTICACION---------------------
const verificarToken = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Token requerido" });
    try {
        const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
        req.usuario = decoded;
        next();
    } catch {
        res.status(401).json({ error: "Token inválido" });
    }
};

//---------------------PRODUCTOS---------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));
app.use('/api/uploads', express.static(uploadDir));

// Configuración de Multer para las subidas de archivos
const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        cb(null, safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif)$/i;
        if (!allowed.test(file.originalname)) {
            return cb(new Error('Solo se permiten imágenes JPG, PNG y GIF'));
        }
        cb(null, true);
    }
});


// RUTA 1: Enviar los productos al carrito de React
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.findAll();
        res.json(productos);
    } catch (error) {
        console.error("❌ Error real en la base de datos:", error);
        // Devolvemos un array vacío para que React no explote con el .map()
        res.status(500).json([]); 
    }
});
//Editar producto
app.put('/api/productos/:id', verificarToken, upload.single('imagen'), async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await Producto.findByPk(id);
        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        const { nombre, precio, descripcion, imagenUrl } = req.body || {};
        if (nombre !== undefined) producto.nombre = nombre;
        if (precio !== undefined) {
            const p = parseFloat(precio);
            if (Number.isNaN(p)) return res.status(400).json({ error: "Precio inválido" });
            producto.precio = p;
        }
        if (descripcion !== undefined) producto.descripcion = descripcion;
        if (req.file) producto.imagen = `/uploads/${req.file.filename}`;
        else if (imagenUrl !== undefined) producto.imagen = imagenUrl || null;
        await producto.save();
        res.json(producto);
    } catch (error) {
        console.error("❌ Error al editar producto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

//Eliminar producto
app.delete('/api/productos/:id', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await Producto.findByPk(id);
        if (!producto) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        await producto.destroy();
        res.json({ mensaje: "Producto eliminado" });
    } catch (error) {
        console.error("❌ Error al eliminar producto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// RUTA 1.5: Agregar nuevo producto
app.post('/api/productos', verificarToken, upload.single('imagen'), async (req, res) => {
    try {
        const { nombre, precio, descripcion, imagenUrl } = req.body || {};
        const imagen = req.file ? `/uploads/${req.file.filename}` : (imagenUrl || null);
        
        // Validar que los campos requeridos existan
        if (!nombre || precio === undefined) {
            console.error("❌ Validación fallida: Falta nombre o precio");
            return res.status(400).json({ error: "Nombre y precio son requeridos" });
        }

        const precioNumero = parseFloat(precio);
        if (Number.isNaN(precioNumero)) {
            return res.status(400).json({ error: "Precio inválido" });
        }

        // Crear el nuevo producto
        const nuevoProducto = await Producto.create({
            nombre,
            precio: precioNumero,
            descripcion: descripcion || null,
            imagen: imagen
        });

        res.status(201).json(nuevoProducto);
    } catch (error) {
        console.error("❌ Error al agregar producto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// RUTA 2: Recibir el carrito y guardarlo en la Base de Datos
app.post('/api/facturas', verificarToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { total, items } = req.body;
        
        // Creamos la factura
        const nuevaFactura = await Factura.create({ total }, { transaction: t });

        // Guardamos cada producto del carrito en los detalles
        for (const item of items) {
            await DetalleFactura.create({
                FacturaId: nuevaFactura.id,
                ProductoId: item.id,
                cantidad: item.cantidad,
                precioUnitario: item.precio
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ mensaje: "Guardado", facturaId: nuevaFactura.id });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

//---------------------PANEL ADMIN / DASHBOARD---------------------
// Dashboard stats
app.get('/api/dashboard/stats', verificarToken, async (req, res) => {
    try {
        const clientes = await Cliente.count();
        const hoy = new Date().toLocaleDateString();
        const clientesNuevos = await Cliente.count({ where: { fechaCreacion: hoy } });
        const trabajos = await Trabajo.count();

        const detalles = await DetalleFactura.findAll({
            include: [{ model: Producto, attributes: ['nombre'] }]
        });
        const ventaMap = {};
        for (const d of detalles) {
            const nombre = d.Producto?.nombre || 'Sin nombre';
            if (!ventaMap[nombre]) ventaMap[nombre] = { total: 0, cantidad: 0 };
            ventaMap[nombre].total += d.cantidad * d.precioUnitario;
            ventaMap[nombre].cantidad += d.cantidad;
        }
        const ventasPorProducto = Object.entries(ventaMap)
            .map(([nombre, v]) => ({ nombre, total: Math.round(v.total * 100) / 100, cantidad: v.cantidad }))
            .sort((a, b) => b.total - a.total);
        const productosMasVendidos = [...ventasPorProducto].sort((a, b) => b.cantidad - a.cantidad);

        // Producto más usado en trabajos y ganancia total
        const todosTrabajos = await Trabajo.findAll({ attributes: ['productos', 'monto', 'usuarioId'] });
        const usoMap = {};
        let ingresosTrabajos = 0;
        for (const t of todosTrabajos) {
            ingresosTrabajos += t.monto || 0;
            if (!t.productos) continue;
            let prods;
            try { prods = JSON.parse(t.productos); } catch { continue; }
            if (!Array.isArray(prods) || prods.length === 0) continue;
            for (const p of prods) {
                const nom = p.nombre || 'Sin nombre';
                usoMap[nom] = (usoMap[nom] || 0) + (p.cantidad || 1);
            }
        }
        const productosUsadosTrabajos = Object.entries(usoMap)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);
        const productoMasUsado = productosUsadosTrabajos[0] || null;

        // Empleado que más trabajos hizo
        const empCounts = {};
        for (const t of todosTrabajos) {
            if (!t.usuarioId) continue;
            empCounts[t.usuarioId] = (empCounts[t.usuarioId] || 0) + 1;
        }
        const trabajosPorEmpleado = [];
        let empleadoMasActivo = null;
        let maxCount = 0;
        for (const [uid, cnt] of Object.entries(empCounts)) {
            const u = await Usuario.findByPk(uid, { attributes: ['nombre'] });
            const nombre = u?.nombre || 'Desconocido';
            trabajosPorEmpleado.push({ nombre, trabajos: cnt });
            if (cnt > maxCount) {
                maxCount = cnt;
                empleadoMasActivo = { nombre, trabajos: cnt };
            }
        }
        trabajosPorEmpleado.sort((a, b) => b.trabajos - a.trabajos);

        res.json({ clientes, clientesNuevos, trabajos, ingresosTrabajos, ventasPorProducto, productosMasVendidos, productoMasUsado, empleadoMasActivo, productosUsadosTrabajos, trabajosPorEmpleado });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// CRUD Clientes
app.get('/api/clientes', verificarToken, async (req, res) => {
    try {
        const clientes = await Cliente.findAll({ order: [['id', 'DESC']] });
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post('/api/clientes', verificarToken, async (req, res) => {
    try {
        const { nombre, telefono, email, direccion } = req.body;
        if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
        const cliente = await Cliente.create({ nombre, telefono, email, direccion });
        res.status(201).json(cliente);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.get('/api/clientes/:id', verificarToken, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id, {
            include: [{ model: Trabajo }]
        });
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
        if (cliente.Trabajos) cliente.Trabajos.sort((a, b) => b.id - a.id);
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.put('/api/clientes/:id', verificarToken, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
        await cliente.update(req.body);
        res.json(cliente);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.delete('/api/clientes/:id', verificarToken, async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
        await cliente.destroy();
        res.json({ mensaje: "Cliente eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// CRUD Usuarios
app.get('/api/usuarios', verificarToken, async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({ attributes: ['id', 'nombre', 'cargo'] });
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post('/api/usuarios', verificarToken, async (req, res) => {
    try {
        if (req.usuario.cargo !== 'administrador') {
            return res.status(403).json({ error: 'Solo administradores pueden crear usuarios' });
        }
        const { nombre, password, cargo } = req.body;
        if (!nombre || !password) {
            return res.status(400).json({ error: 'Nombre y contraseña requeridos' });
        }
        const cargoValido = ['empleado', 'administrador'].includes(cargo) ? cargo : 'empleado';
        const existe = await Usuario.findOne({ where: { nombre } });
        if (existe) {
            return res.status(409).json({ error: 'El nombre de usuario ya existe' });
        }
        const hash = await bcrypt.hash(password, 10);
        const usuario = await Usuario.create({ nombre, password: hash, cargo: cargoValido });
        res.status(201).json({ id: usuario.id, nombre: usuario.nombre, cargo: usuario.cargo });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.delete('/api/usuarios/:id', verificarToken, async (req, res) => {
    try {
        if (req.usuario.cargo !== 'administrador') {
            return res.status(403).json({ error: 'Solo administradores pueden eliminar usuarios' });
        }
        const usuario = await Usuario.findByPk(req.params.id);
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        await usuario.destroy();
        res.json({ mensaje: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post('/api/trabajos', verificarToken, upload.array('imagenes', 5), async (req, res) => {
    try {
        const { clienteId, descripcion, monto, equipos } = req.body;
        let productosRaw = req.body.productos;
        if (!clienteId || !descripcion || monto === undefined) {
            return res.status(400).json({ error: "clienteId, descripcion y monto requeridos" });
        }
        const imagenes = req.files?.map(f => `/uploads/${f.filename}`) || [];
        let productosParse = null;
        try { productosParse = productosRaw ? JSON.parse(productosRaw) : null; } catch { productosParse = productosRaw; }
        const trabajo = await Trabajo.create({
            ClienteId: parseInt(clienteId), descripcion, monto: parseFloat(monto),
            equipos: equipos || null,
            productos: productosParse ? JSON.stringify(productosParse) : null,
            imagenes: imagenes.length ? JSON.stringify(imagenes) : null,
            usuarioId: parseInt(req.body.usuarioId) || req.usuario.id
        });
        res.status(201).json(trabajo);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.delete('/api/trabajos/:id', verificarToken, async (req, res) => {
    try {
        const trabajo = await Trabajo.findByPk(req.params.id);
        if (!trabajo) return res.status(404).json({ error: "Trabajo no encontrado" });
        await trabajo.destroy();
        res.json({ mensaje: "Trabajo eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// CRUD Presupuestos
app.get('/api/presupuestos', verificarToken, async (req, res) => {
    try {
        const presupuestos = await Presupuesto.findAll({ order: [['id', 'DESC']] });
        res.json(presupuestos);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.post('/api/presupuestos', verificarToken, async (req, res) => {
    try {
        const { cliente, items, total, metodoPago, subtotal } = req.body;
        if (!items || total === undefined) {
            return res.status(400).json({ error: "items y total requeridos" });
        }
        const presupuesto = await Presupuesto.create({
            cliente: cliente || null,
            items: JSON.stringify(items),
            total: parseFloat(total),
            metodoPago: metodoPago || 'efectivo',
            subtotal: subtotal !== undefined ? parseFloat(subtotal) : parseFloat(total)
        });
        res.status(201).json(presupuesto);
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

app.delete('/api/presupuestos/:id', verificarToken, async (req, res) => {
    try {
        const presupuesto = await Presupuesto.findByPk(req.params.id);
        if (!presupuesto) return res.status(404).json({ error: "Presupuesto no encontrado" });
        await presupuesto.destroy();
        res.json({ mensaje: "Presupuesto eliminado" });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// Fallback SPA
app.use((req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'Ruta no encontrada' });
  }
});

// Sincronizar Base de Datos y encender
sequelize.sync().then(async () => {
    try { await sequelize.query("ALTER TABLE Trabajos ADD COLUMN usuarioId INTEGER REFERENCES usuarios(id)"); } catch {}
    try { await sequelize.query("ALTER TABLE Presupuestos ADD COLUMN metodoPago VARCHAR(255) DEFAULT 'efectivo'"); } catch {}
    try { await sequelize.query("ALTER TABLE Presupuestos ADD COLUMN subtotal FLOAT"); } catch {}
    const usuarioCount = await Usuario.count();
    if (usuarioCount === 0) {
        const adminUser = process.env.ADMIN_USER || 'admin';
        const adminPass = process.env.ADMIN_PASSWORD;
        if (!adminPass) {
            console.warn('ADMIN_PASSWORD no definido. No se creará usuario admin automáticamente. Iniciá la app con ADMIN_PASSWORD para crear el admin inicial.');
        } else {
            const hash = await bcrypt.hash(adminPass, 10);
            await Usuario.create({ nombre: adminUser, password: hash, cargo: 'administrador', email: process.env.ADMIN_EMAIL || 'admin@mstalarmas.com.ar' });
            console.log(`Usuario admin "${adminUser}" creado correctamente.`);
        }
    }

    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
        console.log(`🚀 Servidor corriendo en http://${HOST}:${PORT}`);
        if (!process.env.JWT_SECRET) console.warn('⚠️  Configurá JWT_SECRET como variable de entorno en producción');
    });
});