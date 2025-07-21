const Comuna = require('../models/Comuna');
const Caso = require('../models/Caso');

exports.createComuna = async (req, res) => {
    try {
        const { nombre, codigo_circuito_comunal } = req.body;

        // Validar si la comuna ya existe por nombre o código
        const comunaExistente = await Comuna.findOne({
            $or: [{ nombre }, { codigo_circuito_comunal }]
        });

        if (comunaExistente) {
            return res.status(409).json({ message: 'Ya existe una comuna con este nombre o código.' });
        }

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

exports.addConsejosComunales = async (req, res) => {
    try {
        const comuna = await Comuna.findById(req.params.id);
        if (!comuna) {
            return res.status(404).json({ message: 'Comuna no encontrada' });
        }

        const { consejos_comunales } = req.body;
        comuna.consejos_comunales.push(...consejos_comunales);
        await comuna.save();
        res.status(200).json(comuna);
    } catch (error) {
        res.status(400).json({ message: error.message });
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