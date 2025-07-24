const Comuna = require('../models/Comuna');
const Caso = require('../models/Caso');
const xlsx = require('xlsx');

exports.importConsejosFromExcel = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se subió ningún archivo' });
    }

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const consejos_comunales = data.map(row => ({
            nombre: row.nombre,
            codigo_situr: row.codigo_situr
        })).filter(consejo => consejo.nombre && consejo.codigo_situr);

        if (consejos_comunales.length === 0) {
            return res.status(400).json({ message: 'No se encontraron consejos comunales válidos en el archivo' });
        }

        const comuna = await Comuna.findById(req.params.idComuna);
        if (!comuna) {
            return res.status(404).json({ message: 'Comuna no encontrada' });
        }

        comuna.consejos_comunales.push(...consejos_comunales);
        await comuna.save();

        res.status(200).json({ message: `Se importaron ${consejos_comunales.length} consejos comunales con éxito` });
    } catch (error) {
        res.status(500).json({ message: 'Error al procesar el archivo Excel', error: error.message });
    }
};

exports.createComuna = async (req, res) => {
    try {
        const comunas = Array.isArray(req.body) ? req.body : [req.body];
        const nuevasComunas = [];

        for (const comunaData of comunas) {
            const { nombre, codigo_circuito_comunal } = comunaData;

            // Validar si la comuna ya existe por nombre o código
            const comunaExistente = await Comuna.findOne({
                $or: [{ nombre }, { codigo_circuito_comunal }]
            });

            if (comunaExistente) {
                return res.status(409).json({ message: `Ya existe una comuna con el nombre '${nombre}' o código '${codigo_circuito_comunal}'.` });
            }

            const nuevaComuna = new Comuna(comunaData);
            await nuevaComuna.save();
            nuevasComunas.push(nuevaComuna);
        }

        res.status(201).json(nuevasComunas);
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

exports.getAllComunas = async (req, res) => {
    try {
        const comunas = await Comuna.find();
        res.json(comunas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener estadísticas generales de comunas y consejos comunales
exports.getOtcStats = async (req, res) => {
    try {
        const totalComunas = await Comuna.countDocuments();
        const pipeline = [
            { $unwind: "$consejos_comunales" },
            { $count: "totalConsejos" }
        ];
        const result = await Comuna.aggregate(pipeline);
        const totalConsejos = result.length > 0 ? result[0].totalConsejos : 0;
        
        res.json({
            totalComunas,
            totalConsejos
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getConsejosByComuna = async (req, res) => {
    try {
        const comuna = await Comuna.findById(req.params.id);
        if (!comuna) {
            return res.status(404).json({ message: 'Comuna not found' });
        }
        res.json(comuna.consejos_comunales);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateComuna = async (req, res) => {
    try {
        const { nombre, codigo } = req.body;
        const comuna = await Comuna.findByIdAndUpdate(req.params.id, { nombre, codigo_circuito_comunal: codigo }, { new: true });
        if (!comuna) {
            return res.status(404).json({ message: 'Comuna not found' });
        }
        res.json(comuna);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateConsejoComunal = async (req, res) => {
    try {
        const { nombre, codigo } = req.body;
        const comuna = await Comuna.findOne({ "consejos_comunales._id": req.params.id });
        if (!comuna) {
            return res.status(404).json({ message: 'Consejo Comunal not found' });
        }

        const consejo = comuna.consejos_comunales.id(req.params.id);
        consejo.nombre = nombre;
        consejo.codigo_situr = codigo;

        await comuna.save();
        res.json(consejo);
    } catch (error) {
        res.status(400).json({ message: error.message });
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