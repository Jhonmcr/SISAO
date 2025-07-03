const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3'); // Import GetObjectCommand for pre-signed URLs if needed later
const path = require('path');
const Caso = require('../models/Caso'); // Ajusta la ruta según tu estructura

// --- Configuración de AWS S3 ---
// (Asumiendo que las variables de entorno AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME están disponibles)
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const s3Storage = multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET_NAME,
    //acl: 'public-read', // Archivos públicamente accesibles
    metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
        const fileName = `casos_pdfs/${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, fileName);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan PDFs.'), false);
    }
};

const upload = multer({
    storage: s3Storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    }
});

// --- RUTAS PARA CASOS ---

// Ruta para obtener TODOS los casos (GET) con paginación
// GET /casos
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const casos = await Caso.find({})
            .select('-actuaciones -modificaciones')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const totalCasos = await Caso.countDocuments({});
        const totalPages = Math.ceil(totalCasos / limit);

        res.status(200).json({
            casos,
            currentPage: page,
            totalPages,
            totalCasos
        });
    } catch (error) {
        console.error('Error al obtener los casos:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener casos.' });
    }
});

// Ruta para CREAR un nuevo caso (POST)
// POST /casos
router.post('/', upload.single('archivo'), async (req, res) => {
    console.log('Ruta POST /casos alcanzada (router)');
    console.log('req.body:', JSON.stringify(req.body, null, 2));
    console.log('req.file:', req.file);
    try {
        const casoData = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No se subió ningún archivo PDF válido para el caso o el nombre del campo es incorrecto.' });
        }
        casoData.archivo = file.location; // URL pública de S3

        if (casoData.caseDate) {
            const parsedDate = new Date(casoData.caseDate);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ message: 'Formato de fecha inválido.' });
            }
            casoData.caseDate = parsedDate;
        }

        const newCase = new Caso(casoData);
        await newCase.save();
        res.status(201).json({ message: 'Caso creado exitosamente', id: newCase._id, caso: newCase });
    } catch (error) {
        console.error('Error detallado al crear el caso (router):', error);
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Error de validación.', errors });
        }
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: `El archivo es demasiado grande. Máximo 2MB.` });
            }
            return res.status(400).json({ message: `Error de subida de archivo: ${error.message}` });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear caso.', error: error.message });
    }
});

// Ruta para subir archivos PDF de forma independiente (usada si se cambia el PDF de un caso existente)
// POST /casos/upload (cambié la ruta base para que esté bajo /casos/)
router.post('/upload', upload.single('archivo'), (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No se subió ningún archivo PDF válido.' });
        }
        res.status(200).json({
            message: 'Archivo subido exitosamente a S3 y es públicamente accesible.',
            location: file.location
        });
    } catch (error) {
        console.error('Error al subir archivo (router):', error);
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: `El archivo es demasiado grande. Máximo 2MB.` });
            }
            return res.status(400).json({ message: `Error de subida de archivo: ${error.message}` });
        }
        res.status(500).json({ message: 'Error interno del servidor al subir archivo.', error: error.message });
    }
});


// Ruta para obtener UN caso por su _id de MongoDB (GET)
// GET /casos/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }
        const caso = await Caso.findById(id);
        if (!caso) {
            return res.status(404).json({ message: `Caso con _id ${id} no encontrado.` });
        }
        res.status(200).json(caso);
    } catch (error) {
        console.error('Error al obtener el caso por ID (router):', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el caso por ID.', error: error.message });
    }
});

// Ruta para ACTUALIZAR un caso existente (PATCH)
// PATCH /casos/:id
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData._id) delete updateData._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }
        const updatedCase = await Caso.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updatedCase) {
            return res.status(404).json({ message: 'Caso no encontrado.' });
        }
        res.status(200).json({ message: 'Caso actualizado exitosamente', caso: updatedCase });
    } catch (error) {
        console.error('Error al actualizar el caso (router):', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar caso.', error: error.message });
    }
});

// Ruta para ACTUALIZAR el ESTADO de un caso (PATCH)
// PATCH /casos/:id/estado
router.patch('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, username } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }
        if (!estado) {
            return res.status(400).json({ message: 'El nuevo estado es requerido.' });
        }
        const estadosPermitidos = ['Cargado', 'Supervisado', 'En Desarrollo'];
        if (!estadosPermitidos.includes(estado)) {
            return res.status(400).json({ message: `Estado '${estado}' no es válido para esta operación.` });
        }

        const caso = await Caso.findById(id);
        if (!caso) {
            return res.status(404).json({ message: 'Caso no encontrado.' });
        }
        if (caso.estado === 'Entregado') {
            return res.status(403).json({ message: 'No se puede cambiar el estado de un caso que ya ha sido marcado como "Entregado".' });
        }

        const valorAntiguo = caso.estado;
        caso.estado = estado;
        caso.modificaciones.push({
            campo: 'estado', valorAntiguo, valorNuevo: estado, fecha: new Date(), usuario: username || 'Sistema'
        });
        const updatedCase = await caso.save();
        res.status(200).json({ message: 'Estado del caso actualizado exitosamente.', caso: updatedCase });
    } catch (error) {
        console.error('Error al actualizar el estado del caso (router):', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el estado.', error: error.message });
    }
});


// Ruta para confirmar la entrega de un caso con validación de clave (PATCH)
// PATCH /casos/:id/confirm-delivery
router.patch('/:id/confirm-delivery', async (req, res) => {
    // Necesitamos acceso a CONFIRM_CASE_TOKEN, que está en index.js
    // Por ahora, asumiremos que se pasa de alguna manera o se refactoriza su acceso.
    // Esta es una limitación de moverlo directamente sin ajustar el acceso a config.
    // Temporalmente lo hardcodearé aquí para el ejemplo, pero NO ES BUENA PRÁCTICA.
    // Debería obtenerse de process.env.CONFIRM_CASE_TOKEN directamente.
    const CONFIRM_CASE_TOKEN = process.env.CONFIRM_CASE_TOKEN;

    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }
        if (password !== CONFIRM_CASE_TOKEN) {
            return res.status(401).json({ message: 'Clave de seguridad incorrecta para confirmar entrega.' });
        }
        const currentDate = new Date().toISOString().split('T')[0];
        const updatedCase = await Caso.findByIdAndUpdate(
            id,
            { estado: 'Entregado', fechaEntrega: currentDate },
            { new: true, runValidators: true }
        );
        if (!updatedCase) {
            return res.status(404).json({ message: 'Caso no encontrado para confirmar entrega.' });
        }
        res.status(200).json({ message: 'Obra marcada como entregada exitosamente.', caso: updatedCase });
    } catch (error) {
        console.error('Error en confirm-delivery (router):', error);
        res.status(500).json({ message: 'Error interno del servidor al confirmar entrega.', error: error.message });
    }
});

// Ruta para ELIMINAR un caso con validación de clave (DELETE)
// DELETE /casos/:id/delete-with-password
router.delete('/:id/delete-with-password', async (req, res) => {
    // Similar a la anterior, acceso a DELETE_CASE_TOKEN
    const DELETE_CASE_TOKEN = process.env.DELETE_CASE_TOKEN;
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }
        if (password !== DELETE_CASE_TOKEN) {
            return res.status(401).json({ message: 'Clave de seguridad incorrecta para eliminar caso.' });
        }
        const deletedCase = await Caso.findByIdAndDelete(id);
        if (!deletedCase) {
            return res.status(404).json({ message: 'Caso no encontrado para eliminar.' });
        }
        res.status(200).json({ message: 'Caso eliminado exitosamente', caso: deletedCase });
    } catch (error) {
        console.error('Error al eliminar el caso (router):', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar caso.', error: error.message });
    }
});

module.exports = router;