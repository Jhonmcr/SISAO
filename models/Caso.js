const mongoose = require('mongoose');

// Define el Schema para tus Casos
// Ajusta esto para que coincida EXACTAMENTE con la estructura de tus documentos de casos en MongoDB
const casoSchema = new mongoose.Schema({
    tipo_obra: { type: String, required: true },
    nombre_obra: { type: String, required: false },
    parroquia: { type: String, required: true },
    circuito: { type: String, required: true },
    eje: { type: String, required: true },
    comuna: { type: String, required: true },
    codigoComuna: { type: String, required: true },
    nameJC: { type: String, required: true }, // Nombre Jefe de Comunidad
    nameJU: { type: String, required: true }, // Nombre Jefe de UBCH
    enlaceComunal: { type: String, required: true },
    caseDescription: { type: String, required: true },
    caseDate: { type: Date, required: true },
    archivo: { type: String, default: '' }, // Nombre del archivo (no el archivo binario en sí)
    ente_responsable: { type: String, default: 'N/A' },
    cantidad_consejos_comunales: { type: Number, default: 0 },
    consejo_comunal_ejecuta: { type: String, default: 'N/A' },
    cantidad_familiares: { type: Number, default: 0 },
    direccion_exacta: { type: String, default: 'N/A' },
    responsable_sala_autogobierno: { type: String, default: 'N/A' },
    jefe_calle: { type: String, default: 'N/A' },
    jefe_politico_eje: { type: String, default: 'N/A' },
    jefe_juventud_circuito_comunal: { type: String, default: 'N/A' },
    estado: {
        type: String,
        enum: ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado'], // Enumera los estados posibles
        default: 'Cargado'
    },
    actuaciones: [{ // Array de objetos para el historial de actuaciones
        descripcion: { type: String, required: true },
        fecha: { type: Date, default: Date.now },
        usuario: String // Opcional: quién hizo la actuación
    }],
    fechaEntrega: { type: Date, default: null },
    modificaciones: [{ // Historial de modificaciones
        campo: { type: String, required: true },
        valorAntiguo: mongoose.Schema.Types.Mixed, // Mixed para cualquier tipo de dato
        valorNuevo: mongoose.Schema.Types.Mixed,
        fecha: { type: Date, default: Date.now },
        usuario: String // Opcional: quién hizo la modificación
    }],
    codigoPersonalizado: { type: String, unique: true, sparse: true } // Para el ID alfanumérico generado por el frontend
}, { timestamps: true }); // `timestamps: true` añade `createdAt` y `updatedAt` automáticamente

// Definición de Índices
casoSchema.index({ estado: 1 });
casoSchema.index({ parroquia: 1 });
casoSchema.index({ createdAt: -1 }); // Índice para la ordenación por defecto en la lista de casos
// Si se realizan búsquedas combinadas frecuentes, se pueden añadir índices compuestos:
// casoSchema.index({ parroquia: 1, circuito: 1 });
// casoSchema.index({ estado: 1, createdAt: -1 });


// Crea y exporta el Modelo de Mongoose
module.exports = mongoose.model('Caso', casoSchema);