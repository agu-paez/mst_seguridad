import { Sequelize, DataTypes } from 'sequelize';



const sequelize = new Sequelize('u591520106_bdsistema', 'u591520106_joel_benitez', 'Benitez_Tiziano_16/26', {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
});

// (Y aquí abajo dejas todos tus modelos: Producto, Factura, etc., tal como estaban)

const Producto = sequelize.define('Producto', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    precio: { type: DataTypes.FLOAT, allowNull: false },
    descripcion: { type: DataTypes.TEXT, allowNull: true },
    imagen: { type: DataTypes.STRING, allowNull: true }
});

const Usuario = sequelize.define('usuario',{
    nombre: { type: DataTypes.STRING, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    cargo: { type: DataTypes.STRING, allowNull: false }
})

const Factura = sequelize.define('Factura', {
    fecha: { 
        type: DataTypes.STRING,
        defaultValue: () => new Date().toLocaleDateString()
    },
    total: { 
        type: DataTypes.FLOAT, 
        allowNull: false 
    }
});

const DetalleFactura = sequelize.define('DetalleFactura', {
    cantidad: { type: DataTypes.INTEGER, defaultValue: 1 },
    precioUnitario: { type: DataTypes.FLOAT, allowNull: false }
});

Factura.hasMany(DetalleFactura);
DetalleFactura.belongsTo(Factura);
Producto.hasMany(DetalleFactura);
DetalleFactura.belongsTo(Producto);

// --- MODELOS PARA EL PANEL ADMIN ---

const Cliente = sequelize.define('Cliente', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    telefono: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: true },
    direccion: { type: DataTypes.TEXT, allowNull: true },
    fechaCreacion: {
        type: DataTypes.STRING,
        defaultValue: () => new Date().toLocaleDateString()
    }
});

const Trabajo = sequelize.define('Trabajo', {
    descripcion: { type: DataTypes.TEXT, allowNull: false },
    fecha: {
        type: DataTypes.STRING,
        defaultValue: () => new Date().toLocaleDateString()
    },
    monto: { type: DataTypes.FLOAT, allowNull: false },
    equipos: { type: DataTypes.TEXT, allowNull: true },
    productos: { type: DataTypes.TEXT, allowNull: true },
    imagenes: { type: DataTypes.TEXT, allowNull: true },
    usuarioId: { type: DataTypes.INTEGER, allowNull: true }
});

Cliente.hasMany(Trabajo);
Trabajo.belongsTo(Cliente);
Usuario.hasMany(Trabajo);
Trabajo.belongsTo(Usuario);

const Presupuesto = sequelize.define('Presupuesto', {
    cliente: { type: DataTypes.STRING, allowNull: true },
    fecha: {
        type: DataTypes.STRING,
        defaultValue: () => new Date().toLocaleDateString()
    },
    items: { type: DataTypes.TEXT, allowNull: false },
    total: { type: DataTypes.FLOAT, allowNull: false },
    metodoPago: { type: DataTypes.STRING, allowNull: true, defaultValue: 'efectivo' },
    subtotal: { type: DataTypes.FLOAT, allowNull: true }
});

export { sequelize, Producto, Factura, DetalleFactura, Usuario, Cliente, Trabajo, Presupuesto };
