const Comuna = require('../models/Comuna');
const Caso = require('../models/Caso');

exports.createComuna = async (req, res) => {
    try {
        const nuevaComuna = new Comuna(req.body);
        await nuevaComuna.save();
        res.status(201).json(nuevaComuna);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getComunasByParroquia = async (req, res) => {
    try {
        const comunas = await Comuna.find({ parroquia: req.params.parroquia });
        res.json(comunas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getComunasNoContactadas = async (req, res) => {
    try {
        const comunasConCasos = await Caso.distinct('comuna');
        const comunasNoContactadas = await Comuna.find({ nombre: { $nin: comunasConCasos } });
        res.json(comunasNoContactadas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
