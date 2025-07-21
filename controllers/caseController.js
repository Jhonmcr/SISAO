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

// --- CONFIGURACIÓN DE AWS S3 Y MULTER PARA LA SUBIDA DE ARCHIVOS ---

// Crea una instancia del cliente S3.
// Las credenciales y la región se toman de las variables de entorno (process.env).
// Es crucial que AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY y S3_BUCKET_NAME estén definidas en el archivo .env.
const s3Client = new S3Client({
    region: process.env.AWS_REGION, // Región de AWS donde está el bucket S3.
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Clave de acceso de AWS.
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Clave secreta de AWS.
    }
});

// Configura el almacenamiento en S3 para Multer.
const s3Storage = multerS3({
    s3: s3Client, // El cliente S3 configurado.
    bucket: process.env.S3_BUCKET_NAME, // Nombre del bucket S3 donde se guardarán los archivos.
    // acl: 'public-read', // Opcional: Establece los archivos como públicamente legibles. Comentado por defecto para mayor seguridad.
    metadata: (req, file, cb) => { // Función para añadir metadatos personalizados al objeto en S3.
        cb(null, { fieldName: file.fieldname }); // Guarda el nombre del campo original del formulario.
    },
    key: (req, file, cb) => { // Función para generar la clave (nombre del archivo) en S3.
        // Crea un nombre de archivo único usando el nombre del campo, la fecha actual y la extensión original.
        // Los archivos se guardan en una carpeta 'casos_pdfs/' dentro del bucket.
        const fileName = `casos_pdfs/${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, fileName);
    }
});

// Filtro de archivos para Multer: solo permite archivos PDF.
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') { // Verifica el tipo MIME del archivo.
        cb(null, true); // Acepta el archivo.
    } else {
        // Rechaza el archivo si no es PDF, enviando un error.
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan archivos PDF.'), false);
    }
};

// Configuración de Multer con el almacenamiento S3, el filtro de archivos y límites.
// Se exporta para que pueda ser usado como middleware en las rutas.
const upload = multer({
    storage: s3Storage, // Usa el almacenamiento S3 configurado.
    fileFilter: fileFilter, // Aplica el filtro de tipo de archivo.
    limits: {
        fileSize: 2 * 1024 * 1024 // Límite de tamaño de archivo: 2MB.
    }
});

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
    console.log('Petición POST recibida en /casos para crear un nuevo caso.');
    console.log('Cuerpo de la solicitud (req.body):', JSON.stringify(req.body, null, 2)); // Log para depuración.
    console.log('Archivo subido (req.file):', req.file); // Log del archivo subido.
    try {
        const casoData = req.body; // Datos del caso del cuerpo de la solicitud.
        const file = req.file; // Información del archivo subido por Multer.

        // Valida que se haya subido un archivo.
        if (!file) {
            return res.status(400).json({ message: 'Es obligatorio adjuntar un archivo PDF para el caso.' });
        }
        // Asigna la URL pública del archivo en S3 (proporcionada por multer-s3) al campo 'archivo' del caso.
        casoData.archivo = file.location;
        
        // Extraer nombre_obra del cuerpo de la solicitud
        const { nombre_obra } = req.body;
        if (nombre_obra) {
            casoData.nombre_obra = nombre_obra;
        }

        // Parsea y valida la fecha del caso si se proporciona.
        if (casoData.caseDate) {
            const parsedDate = new Date(casoData.caseDate);
            if (isNaN(parsedDate.getTime())) { // Si la fecha no es válida.
                return res.status(400).json({ message: 'El formato de la fecha del caso es inválido.' });
            }
            casoData.caseDate = parsedDate; // Asigna la fecha parseada.
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
        const estadosPermitidos = ['Cargado', 'Supervisado', 'En Desarrollo'];
        if (!estadosPermitidos.includes(estado)) {
            return res.status(400).json({ message: `El estado '${estado}' no es válido para esta operación. Use la confirmación de entrega para el estado 'Entregado'.` });
        }

        const caso = await Caso.findById(id); // Busca el caso.
        if (!caso) {
            return res.status(404).json({ message: 'Caso no encontrado para actualizar estado.' });
        }
        // Previene cambiar el estado si ya está 'Entregado'.
        if (caso.estado === 'Entregado') {
            return res.status(403).json({ message: 'No se puede cambiar el estado de un caso que ya ha sido marcado como "Entregado".' });
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

        // Establece la fecha de entrega a la fecha actual.
        const currentDate = new Date(); // Usar el objeto Date completo para la actuación
        const currentDateString = currentDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD para fechaEntrega.

        // Añadir la actuación de entrega
        const nuevaActuacion = {
            descripcion: "Caso entregado.",
            fecha: currentDate, // Guardar la fecha completa con hora para la actuación
            usuario: username 
        };

        if (!Array.isArray(caso.actuaciones)) {
            caso.actuaciones = [];
        }
        caso.actuaciones.push(nuevaActuacion);

        // Actualiza el estado y la fecha de entrega.
        caso.estado = 'Entregado';
        caso.fechaEntrega = currentDateString;
        
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

module.exports = {
    upload, // Exporta la configuración de Multer para usarla en las rutas.
    getAllCasos,
    createCaso,
    uploadFile,
    getCasoById,
    updateCaso,
    updateCasoEstado,
    confirmCasoDelivery,
    deleteCaso,
    getCaseStatsByParroquia
};