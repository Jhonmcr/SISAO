const mongoose = require('mongoose');

const casoSchema = new mongoose.Schema({
    tipo_obra: { type: String, required: true },
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
    archivo: { type: String, default: '' }, // Nombre del archivo
    estado: {
        type: String,
        enum: ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado', 'Inactivo'],
        default: 'Cargado'
    },
    fechaEntrega: { type: Date, default: null },
    actuaciones: [{
        descripcion: { type: String, required: true },
        fecha: { type: Date, default: Date.now },
        usuario: { type: String } // Hacer explícito el tipo String
    }],
    modificaciones: [{
        campo: { type: String, required: true },
        valorAntiguo: mongoose.Schema.Types.Mixed,
        valorNuevo: mongoose.Schema.Types.Mixed,
        fecha: { type: Date, default: Date.now },
        usuario: { type: String } // Hacer explícito el tipo String
    }],
    codigoPersonalizado: { type: String, unique: true, sparse: true } // Mantener
}, { timestamps: true });

module.exports = mongoose.model('Caso', casoSchema);