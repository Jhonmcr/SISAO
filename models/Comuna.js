const mongoose = require('mongoose');

const consejoComunalSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigo_situr: { type: String, required: true }
});

const comunaSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    codigo_circuito_comunal: { type: String, required: true },
    parroquia: { type: String, required: true },
    consejos_comunales: [consejoComunalSchema]
}, { timestamps: true });

module.exports = mongoose.model('Comuna', comunaSchema);
