// controllers/caseController.js

/**
 * @file controllers/caseController.js
 * @description Lógica de negocio para la gestión de "casos" (proyectos/obras).
 * Incluye operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los casos,
 * así como la subida de archivos PDF asociados a ellos utilizando AWS S3.
 * Utiliza el modelo `Caso` de Mongoose para interactuar con la base de datos MongoDB.
 */

const mongoose = require('mongoose'); // ODM para MongoDB.
const multer = require('multer'); // Middleware para manejar la subida de archivos (multipart/form-data).
const multerS3 = require('multer-s3'); // Adaptador de Multer para almacenar archivos en Amazon S3.
const { S3Client } = require('@aws-sdk/client-s3'); // Cliente S3 del SDK de AWS v3 para interactuar con S3.
const path = require('path'); // Módulo de Node.js para trabajar con rutas de archivos.
const Caso = require('../models/Caso'); // Modelo de Mongoose para los casos.

const upload = require('../middleware/multerConfig');

// --- CONTROLADORES PARA LAS RUTAS DE CASOS ---

// OBTENER TODOS LOS CASOS
const getAllCasos = async (req, res) => {
    try {
        // Parsea los parámetros de paginación de la query string. Valores por defecto: page=1, limit=10.
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10; // Límite de casos por página.
        const skip = (page - 1) * limit; // Número de documentos a saltar.

        // Busca los casos en la base de datos, aplicando paginación y ordenación.
        const casos = await Caso.find({}) // Encuentra todos los casos.
            .select('-actuaciones -modificaciones') // Excluye campos grandes para la lista general.
            .skip(skip) // Salta los documentos de páginas anteriores.
            .limit(limit) // Limita el número de documentos devueltos.
            .sort({ createdAt: -1 }); // Ordena por fecha de creación descendente (más recientes primero).

        const totalCasos = await Caso.countDocuments({}); // Cuenta el número total de casos.
        const totalPages = Math.ceil(totalCasos / limit); // Calcula el número total de páginas.

        // Devuelve la respuesta con los casos, información de paginación y total de casos.
        res.status(200).json({
            casos,
            currentPage: page,
            totalPages,
            totalCasos
        });
    } catch (error) { // Manejo de errores.
        console.error('Error al obtener la lista de casos:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener la lista de casos.' });
    }
};

// CREAR UN NUEVO CASO
const createCaso = async (req, res) => {
    // console.log('Petición POST recibida en /casos para crear un nuevo caso.');
    // console.log('Cuerpo de la solicitud (req.body):', JSON.stringify(req.body, null, 2)); // Log para depuración.
    // console.log('Archivo subido (req.file):', req.file); // Log del archivo subido.
    try {
        const casoData = req.body; // Datos del caso del cuerpo de la solicitud.
        const file = req.file; // Información del archivo subido por Multer.

        // Si se subió un archivo, asigna su URL. Si no, el campo 'archivo' quedará con su valor por defecto.
        if (file) {
            casoData.archivo = file.location;
        }
        
        // Extraer nombre_obra del cuerpo de la solicitud
        const { nombre_obra } = req.body;
        if (nombre_obra) {
            casoData.nombre_obra = nombre_obra;
        }

        if (req.body.punto_y_circulo_data) {
            try {
                casoData.punto_y_circulo_data = JSON.parse(req.body.punto_y_circulo_data);
            } catch (error) {
                return res.status(400).json({ message: 'El formato de punto_y_circulo_data es inválido.' });
            }
        }

        // Parsea y valida la fecha del caso si se proporciona.
        if (casoData.caseDate) {
            // Se crea un objeto Date. El formato 'YYYY-MM-DD' se interpreta como UTC.
            const date = new Date(casoData.caseDate);
            if (isNaN(date.getTime())) { // Si la fecha no es válida.
                return res.status(400).json({ message: 'El formato de la fecha del caso es inválido.' });
            }
            // Se corrige la fecha para asegurar que se almacene el día correcto sin importar la zona horaria del servidor.
            // Esto ajusta la fecha a mediodía UTC para evitar problemas de un día antes o después.
            date.setUTCHours(12);
            casoData.caseDate = date; // Asigna la fecha parseada.
        }

        // Parsea y valida la fecha de entrega si se proporciona.
        if (casoData.fecha_entrega) {
            const date = new Date(casoData.fecha_entrega);
            if (isNaN(date.getTime())) { // Si la fecha no es válida.
                return res.status(400).json({ message: 'El formato de la fecha de entrega es inválido.' });
            }
            // Ajusta la fecha a mediodía UTC.
            date.setUTCHours(12);
            casoData.fechaEntrega = date; // Asigna la fecha parseada al campo correcto del modelo.
            delete casoData.fecha_entrega; // Elimina el campo original para evitar conflictos.
        }

        const newCase = new Caso(casoData); // Crea una nueva instancia del modelo Caso.
        await newCase.save(); // Guarda el nuevo caso en la base de datos.
        // Responde con éxito (201 Created) y los datos del caso creado.
        res.status(201).json({ message: 'Caso creado y archivo subido exitosamente.', id: newCase._id, caso: newCase });
    } catch (error) { // Manejo de errores.
        console.error('Error detallado al crear el caso en el controlador:', error);
        if (error.name === 'ValidationError') { // Errores de validación de Mongoose.
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Error de validación en los datos del caso.', errors });
        }
        if (error instanceof multer.MulterError) { // Errores específicos de Multer (ej. tamaño de archivo).
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: `El archivo PDF es demasiado grande. El tamaño máximo permitido es 2MB.` });
            }
            return res.status(400).json({ message: `Error durante la subida del archivo: ${error.message}` });
        }
        // Otros errores internos del servidor.
        res.status(500).json({ message: 'Error interno del servidor al intentar crear el caso.', error: error.message });
    }
};

// SUBIR/ACTUALIZAR ARCHIVOS PDF DE FORMA INDEPENDIENTE
const uploadFile = (req, res) => {
    try {
        const file = req.file; // Información del archivo subido.
        if (!file) { // Valida que se haya subido un archivo.
            return res.status(400).json({ message: 'No se subió ningún archivo PDF válido o el nombre del campo es incorrecto.' });
        }
        // Responde con éxito y la URL del archivo subido a S3.
        res.status(200).json({
            message: 'Archivo PDF subido exitosamente a S3.',
            location: file.location, // URL pública del archivo en S3.
            fileName: file.key // La clave (nombre) del archivo en S3, útil si se necesita referenciarlo.
        });
    } catch (error) { // Manejo de errores.
        console.error('Error al subir archivo PDF de forma independiente:', error);
        if (error instanceof multer.MulterError) { // Errores de Multer.
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: `El archivo PDF es demasiado grande. Máximo 2MB.` });
            }
            return res.status(400).json({ message: `Error durante la subida del archivo: ${error.message}` });
        }
        res.status(500).json({ message: 'Error interno del servidor al subir el archivo PDF.', error: error.message });
    }
};

// OBTENER UN CASO ESPECÍFICO POR SU ID
const getCasoById = async (req, res) => {
    try {
        const { id } = req.params; // Obtiene el ID de los parámetros de la ruta.
        // Valida que el ID sea un ObjectId válido de MongoDB.
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'El ID del caso proporcionado no es válido.' });
        }
        const caso = await Caso.findById(id); // Busca el caso por ID.
        if (!caso) { // Si no se encuentra el caso.
            return res.status(404).json({ message: `Caso con ID ${id} no encontrado.` });
        }
        res.status(200).json(caso); // Devuelve el caso encontrado.
    } catch (error) {
        console.error('Error al obtener el caso por ID en el controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el caso.', error: error.message });
    }
};

// ACTUALIZAR UN CASO EXISTENTE
const updateCaso = async (req, res) => {
    try {
        const { id } = req.params; // ID del caso a actualizar.
        const updateData = req.body; // Datos para actualizar.
        // Evita que se intente modificar el _id si viene en el cuerpo de la solicitud.
        if (updateData._id) delete updateData._id;

        if (req.body.punto_y_circulo_data) {
            try {
                updateData.punto_y_circulo_data = JSON.parse(req.body.punto_y_circulo_data);
            } catch (error) {
                return res.status(400).json({ message: 'El formato de punto_y_circulo_data es inválido.' });
            }
        }

        // Parsea y valida la fecha del caso si se proporciona.
        if (updateData.caseDate) {
            const date = new Date(updateData.caseDate);
            if (isNaN(date.getTime())) { // Si la fecha no es válida.
                return res.status(400).json({ message: 'El formato de la fecha del caso es inválido.' });
            }
            date.setUTCHours(12);
            updateData.caseDate = date; // Asigna la fecha parseada.
        }

        // Parsea y valida la fecha de entrega si se proporciona.
        if (updateData.fechaEntrega) {
            const date = new Date(updateData.fechaEntrega);
            if (isNaN(date.getTime())) { // Si la fecha no es válida.
                return res.status(400).json({ message: 'El formato de la fecha de entrega es inválido.' });
            }
            date.setUTCHours(12);
            updateData.fechaEntrega = date; // Asigna la fecha parseada al campo correcto del modelo.
        }

        if (!mongoose.Types.ObjectId.isValid(id)) { // Valida el ID.
            return res.status(400).json({ message: 'El ID del caso proporcionado no es válido.' });
        }
        // Busca y actualiza el caso. `new: true` devuelve el documento modificado.
        // `runValidators: true` asegura que se apliquen las validaciones del schema de Mongoose.
        const updatedCase = await Caso.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updatedCase) { // Si no se encuentra el caso para actualizar.
            return res.status(404).json({ message: 'Caso no encontrado para actualizar.' });
        }
        res.status(200).json({ message: 'Caso actualizado exitosamente.', caso: updatedCase }); // Devuelve el caso actualizado.
    } catch (error) {
        console.error('Error al actualizar el caso en el controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el caso.', error: error.message });
    }
};

// ACTUALIZAR SOLO EL ESTADO DE UN CASO
const updateCasoEstado = async (req, res) => {
    try {
        const { id } = req.params; // ID del caso.
        const { estado, username } = req.body; // Nuevo estado y nombre de usuario que realiza el cambio.

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }
        if (!estado) { // Valida que se proporcione un nuevo estado.
            return res.status(400).json({ message: 'El nuevo estado es un campo requerido.' });
        }
        // Estados permitidos para ser cambiados mediante esta ruta. 'Entregado' se maneja por otra ruta.
        const estadosPermitidos = ['OBRA EN PROYECCION', 'OBRA EN EJECUCION', 'OBRA EJECUTADA'];
        if (!estadosPermitidos.includes(estado)) {
            return res.status(400).json({ message: `El estado '${estado}' no es válido para esta operación. Use la confirmación de entrega para el estado 'OBRA CULMINADA'.` });
        }

        const caso = await Caso.findById(id); // Busca el caso.
        if (!caso) {
            return res.status(404).json({ message: 'Caso no encontrado para actualizar estado.' });
        }
        // Previene cambiar el estado si ya está 'OBRA CULMINADA'.
        if (caso.estado === 'OBRA CULMINADA') {
            return res.status(403).json({ message: 'No se puede cambiar el estado de un caso que ya ha sido marcado como "OBRA CULMINADA".' });
        }

        const valorAntiguo = caso.estado; // Guarda el estado anterior para el historial de modificaciones.
        caso.estado = estado; // Actualiza el estado.
        // Añade una entrada al historial de modificaciones.
        caso.modificaciones.push({
            campo: 'estado', 
            valorAntiguo, 
            valorNuevo: estado, 
            fecha: new Date(), 
            usuario: username || 'Sistema' // Usuario que hizo el cambio, o 'Sistema' por defecto.
        });
        const updatedCase = await caso.save(); // Guarda los cambios.
        res.status(200).json({ message: 'Estado del caso actualizado exitosamente.', caso: updatedCase });
    } catch (error) {
        console.error('Error al actualizar el estado del caso en el controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el estado del caso.', error: error.message });
    }
};

// CONFIRMAR LA ENTREGA DE UN CASO
const confirmCasoDelivery = async (req, res) => {
    // Obtiene el token de confirmación de las variables de entorno.
    const CONFIRM_CASE_TOKEN = process.env.CONFIRM_CASE_TOKEN;

    try {
        const { id } = req.params; // ID del caso.
        const { password, username } = req.body; // Clave de seguridad y nombre de usuario del cliente.

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }
        if (!username) {
            return res.status(400).json({ message: 'Nombre de usuario no proporcionado para registrar la entrega.' });
        }
        // Valida la clave de seguridad.
        if (password !== CONFIRM_CASE_TOKEN) {
            return res.status(401).json({ message: 'Clave de seguridad incorrecta. No se puede confirmar la entrega.' });
        }

        const caso = await Caso.findById(id);
        if (!caso) { // Si no se encuentra el caso.
            return res.status(404).json({ message: 'Caso no encontrado para confirmar la entrega.' });
        }

        // Solo establece la fecha de entrega si no ha sido establecida previamente.
        if (!caso.fechaEntrega) {
            const currentDate = new Date();
            const userTimezoneOffset = currentDate.getTimezoneOffset() * 60000;
            caso.fechaEntrega = new Date(currentDate.getTime() - userTimezoneOffset);
        }

        // Añadir la actuación de entrega
        const nuevaActuacion = {
            descripcion: "Caso entregado.",
            fecha: new Date(),
            usuario: username 
        };

        if (!Array.isArray(caso.actuaciones)) {
            caso.actuaciones = [];
        }
        caso.actuaciones.push(nuevaActuacion);

        // Actualiza el estado.
        caso.estado = 'OBRA CULMINADA';
        
        const updatedCase = await caso.save({ runValidators: true });

        res.status(200).json({ message: 'Obra marcada como entregada exitosamente y actuación registrada.', caso: updatedCase });
    } catch (error) {
        console.error('Error al confirmar la entrega del caso en el controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al confirmar la entrega.', error: error.message });
    }
};

// ELIMINAR UN CASO
const deleteCaso = async (req, res) => {
    // Obtiene el token de eliminación de las variables de entorno.
    const DELETE_CASE_TOKEN = process.env.DELETE_CASE_TOKEN;
    try {
        const { id } = req.params; // ID del caso.
        const { password } = req.body; // Clave de seguridad.

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }
        // Valida la clave de seguridad.
        if (password !== DELETE_CASE_TOKEN) {
            return res.status(401).json({ message: 'Clave de seguridad incorrecta. No se puede eliminar el caso.' });
        }
        const deletedCase = await Caso.findByIdAndDelete(id); // Busca y elimina el caso.
        if (!deletedCase) { // Si no se encuentra el caso.
            return res.status(404).json({ message: 'Caso no encontrado para eliminar.' });
        }
        // TODO: Considerar eliminar el archivo PDF asociado de S3 aquí si es necesario.
        res.status(200).json({ message: 'Caso eliminado exitosamente.', caso: deletedCase });
    } catch (error) {
        console.error('Error al eliminar el caso en el controlador:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el caso.', error: error.message });
    }
};

// OBTENER ESTADÍSTICAS DE CASOS POR PARROQUIA
const getCaseStatsByParroquia = async (req, res) => {
    try {
        const stats = await Caso.aggregate([
            {
                $group: {
                    _id: '$parroquia',
                    count: { $sum: 1 }
                }
            }
        ]);
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas de casos por parroquia:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener estadísticas.' });
    }
};

// OBTENER ESTADÍSTICAS DE CASOS POR CONSEJO COMUNAL
const getCaseStatsByConsejoComunal = async (req, res) => {
    try {
        const stats = await Caso.aggregate([
            {
                $group: {
                    _id: '$consejo_comunal',
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    consejo_comunal: '$_id',
                    count: 1
                }
            }
        ]);
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas de casos por consejo comunal:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener estadísticas.' });
    }
};

module.exports = {
    getAllCasos,
    createCaso,
    uploadFile,
    getCasoById,
    updateCaso,
    updateCasoEstado,
    confirmCasoDelivery,
    deleteCaso,
    getCaseStatsByParroquia,
    getCaseStatsByConsejoComunal
};