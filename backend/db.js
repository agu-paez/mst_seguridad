import { Sequelize, DataTypes } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    const envPath = path.resolve(__dirname, '..', '.env');
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

const DB_NAME = process.env.DB_NAME || 'u591520106_bdsistema';
const DB_USER = process.env.DB_USER || 'u591520106_joel_benitez';
const DB_PASS = process.env.DB_PASS || '';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';

if (!DB_PASS) {
    console.error('ERROR: DB_PASS no está definido. Creá un archivo .env en la raíz del proyecto o configurá la variable de entorno DB_PASS.');
    process.exit(1);
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'mysql',
    logging: false,
    define: {
        charset: 'utf8',
        collate: 'utf8_general_ci'
    }
});

// Modelo de Producto
const Producto = sequelize.define('Producto', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    precio: { type: DataTypes.FLOAT, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    imagen: { type: DataTypes.STRING, allowNull: true }
});

//Modelado de Usuarios con cargos
const Usuario = sequelize.define('usuario',{
    nombre: { type: DataTypes.STRING, allowNull: false},
    password: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    cargo: { type: DataTypes.STRING, allowNull: false }
})

// Cabecera de la Factura
const Factura = sequelize.define('Factura', {
    fecha: { 
        type: DataTypes.STRING, // <-- Cambiamos DATEONLY por STRING
        defaultValue: () => new Date().toLocaleDateString() // Genera el texto limpio día/mes/año
    },
    total: { 
        type: DataTypes.FLOAT, 
        allowNull: false 
    }
});

// Detalle de la Factura (Relación muchos a muchos)
const DetalleFactura = sequelize.define('DetalleFactura', {
    cantidad: { type: DataTypes.INTEGER, defaultValue: 1 },
    precioUnitario: { type: DataTypes.FLOAT, allowNull: false }
});

// Definimos las uniones relacionales
Factura.hasMany(DetalleFactura);
DetalleFactura.belongsTo(Factura);
Producto.hasMany(DetalleFactura);
DetalleFactura.belongsTo(Producto);

const Cliente = sequelize.define('Cliente', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    telefono: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    direccion: { type: DataTypes.STRING, allowNull: true },
    fechaCreacion: { type: DataTypes.STRING, defaultValue: () => new Date().toLocaleDateString() }
});

const Trabajo = sequelize.define('Trabajo', {
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    monto: { type: DataTypes.FLOAT, allowNull: false },
    equipos: { type: DataTypes.TEXT, allowNull: true },
    productos: { type: DataTypes.TEXT, allowNull: true },
    imagenes: { type: DataTypes.TEXT, allowNull: true },
    fecha: { type: DataTypes.STRING, defaultValue: () => new Date().toLocaleDateString() },
    usuarioId: { type: DataTypes.INTEGER, allowNull: true }
});

const Presupuesto = sequelize.define('Presupuesto', {
    cliente: { type: DataTypes.STRING, allowNull: true },
    fecha: { type: DataTypes.STRING, defaultValue: () => new Date().toLocaleDateString() },
    items: { type: DataTypes.TEXT, allowNull: false },
    total: { type: DataTypes.FLOAT, allowNull: false },
    metodoPago: { type: DataTypes.STRING, allowNull: true, defaultValue: 'efectivo' },
    subtotal: { type: DataTypes.FLOAT, allowNull: true }
});

// Relaciones
Cliente.hasMany(Trabajo);
Trabajo.belongsTo(Cliente);

export { sequelize, Producto, Factura, DetalleFactura, Usuario, Cliente, Trabajo, Presupuesto };