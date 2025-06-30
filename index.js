// index.js
require('dotenv').config(); // Carga las variables de entorno al inicio.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // Importa la librería Multer
const path = require('path');    // Importa el módulo 'path' para manejar rutas de archivos

const User = require('./models/User'); // Importa el modelo de usuario existente

// Define el esquema de Caso aquí para incluir 'usuario' en actuaciones y modificaciones
const casoSchema = new mongoose.Schema({
    tipo_obra: String,
    parroquia: String,
    circuito: String,
    eje: String,
    comuna: String,
    codigoComuna: String,
    nameJC: String,
    nameJU: String,
    enlaceComunal: String,
    caseDescription: String,
    caseDate: Date,
    archivo: String,
    estado: {
        type: String,
        enum: ['Cargado', 'Supervisado', 'En Desarrollo', 'Entregado'],
        default: 'Cargado'
    },
    fechaEntrega: {
        type: Date,
        default: null
    },
    actuaciones: [
        {
            descripcion: String,
            fecha: Date,
            usuario: String // NUEVO CAMPO: Quién realizó la actuación
        }
    ],
    modificaciones: [
        {
            campo: String,
            valorAntiguo: mongoose.Schema.Types.Mixed, // Puede ser cualquier tipo
            valorNuevo: mongoose.Schema.Types.Mixed,
            fecha: Date,
            usuario: String // NUEVO CAMPO: Quién realizó la modificación
        }
    ]
}, { timestamps: true }); // Añade timestamps para createdAt y updatedAt

const Caso = mongoose.model('Caso', casoSchema); // Define el modelo Caso

const app = express();

// Puerto para el servidor Express
const port = process.env.PORT || 3000;

// --- CLAVES DE ACCESO DESDE .ENV (Tokens de Registro y Confirmación) ---
const SUPER_ADMIN_REGISTER_TOKEN = process.env.SUPER_ADMIN_TOKEN;
const ADMIN_REGISTER_TOKEN = process.env.ADMIN_TOKEN;
const USER_REGISTER_TOKEN = process.env.USER_TOKEN;
const CONFIRM_CASE_TOKEN = process.env.CONFIRM_CASE_TOKEN; // Carga la clave de confirmación de .env
const DELETE_CASE_TOKEN = process.env.DELETE_CASE_TOKEN; // NUEVO: Carga la clave de eliminación de .env

// Middlewares
app.use(cors());
app.use(express.json()); // Permite a Express leer JSON en el cuerpo de las peticiones

// --- Configuración de Multer para almacenamiento local ---

// Define el directorio donde se guardarán los archivos PDF.
// '__dirname' es la ruta absoluta al directorio del archivo actual (index.js).
const uploadsDir = path.join(__dirname, 'uploads', 'pdfs');

// Configuración de almacenamiento de Multer en disco (diskStorage).
// Esto le dice a Multer dónde y cómo guardar los archivos físicos en el servidor.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // `cb` (callback) es una función que se llama para indicar dónde guardar el archivo.
        // El primer argumento es para errores (null si no hay), el segundo es la ruta de destino.
        cb(null, uploadsDir); // Guarda los archivos en la carpeta `uploads/pdfs`
    },
    filename: (req, file, cb) => {
        // Genera un nombre de archivo único para evitar colisiones.
        // Combina el nombre del campo (ej. 'archivo') con un timestamp y un número aleatorio,
        // y le añade la extensión original del file.
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + originalExtension);
    }
});

// NUEVA RUTA: Ruta para ACTUALIZAR el ESTADO de un caso (PATCH)
app.patch('/casos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, username } = req.body; // Esperamos 'estado' y 'username' del frontend

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }

        if (!estado) {
            return res.status(400).json({ message: 'El nuevo estado es requerido.' });
        }

        // Validar que el estado sea uno de los permitidos por el select del frontend
        const estadosPermitidos = ['Cargado', 'Supervisado', 'En Desarrollo'];
        if (!estadosPermitidos.includes(estado)) {
            return res.status(400).json({ message: `Estado '${estado}' no es válido para esta operación.` });
        }

        const caso = await Caso.findById(id);
        if (!caso) {
            return res.status(404).json({ message: 'Caso no encontrado.' });
        }

        // No permitir cambiar desde "Entregado" a otro estado mediante esta ruta.
        // El estado "Entregado" se gestiona a través de 'confirm-delivery'.
        if (caso.estado === 'Entregado') {
            return res.status(403).json({ message: 'No se puede cambiar el estado de un caso que ya ha sido marcado como "Entregado". Utilice la funcionalidad específica si es necesario revertir.' });
        }

        const valorAntiguo = caso.estado;
        caso.estado = estado;

        // Registrar la modificación en el historial del caso
        caso.modificaciones.push({
            campo: 'estado',
            valorAntiguo: valorAntiguo,
            valorNuevo: estado,
            fecha: new Date(),
            usuario: username || 'Sistema' // Guardar el nombre de usuario o 'Sistema' si no se provee
        });

        const updatedCase = await caso.save();

        // Devolver el caso actualizado, incluyendo el array de modificaciones.
        res.status(200).json({ message: 'Estado del caso actualizado exitosamente.', caso: updatedCase });

    } catch (error) {
        console.error('Error al actualizar el estado del caso:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el estado del caso.', error: error.message });
    }
});

// Filtro para Multer: Acepta solo archivos con el tipo MIME 'application/pdf'.
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true); // Aceptar el archivo (true).
    } else {
        // Rechazar el archivo y enviar un error si no es un PDF.
        cb(new Error('Tipo de archivo no permitido. Solo se aceptan PDFs.'), false);
    }
};

// Inicializa Multer con la configuración de almacenamiento en disco y el filtro de archivos.
// `upload` es un middleware que puedes usar en tus rutas de Express.
const upload = multer({
    storage: storage, // Usa la configuración de almacenamiento definida.
    fileFilter: fileFilter, // Aplica el filtro para solo aceptar PDFs.
    limits: {
        fileSize: 2 * 1024 * 1024 // Limite de 2MB (2 * 1024 * 1024 bytes) para el archivo.
    }
});

// --- ¡IMPORTANTE! Sirve los archivos estáticos desde la carpeta 'uploads/pdfs' ---
// Esto permite que los archivos PDF subidos sean accesibles públicamente en el navegador.
// Por ejemplo, un PDF guardado como `mi-documento-123.pdf` en `uploads/pdfs/`
// será accesible a través de `http://localhost:3000/uploads/pdfs/mi-documento-123.pdf`.
app.use('/uploads/pdfs', express.static(uploadsDir));

// Conexión a MONGODB
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('¡Te has conectado a MongoDB!'))
    .catch((error) => console.error('Error al conectar a MongoDB:', error));

// -----------------------------------------------------
// RUTA PARA LOS TOKENS DEL FRONTEND
// Esta ruta proporciona los tokens de registro de roles al frontend.
app.get('/api/config', (req, res) => {
    console.log('Solicitud recibida para /api/config');
    res.json({
        ROLES_TOKENS: {
            SUPER_ADMIN_TOKEN: SUPER_ADMIN_REGISTER_TOKEN,
            ADMIN_TOKEN: ADMIN_REGISTER_TOKEN,
            USER_TOKEN: USER_REGISTER_TOKEN,
        },
    });
});

// -----------------------------------------------------
// RUTAS PARA MANEJAR USUARIOS CON MONGODB
// -----------------------------------------------------

// Ruta para CREAR un nuevo usuario (POST)
// Espera un cuerpo JSON con 'name', 'username', 'password' y 'role'.
app.post('/users', async (req, res) => {
    try {
        const { name, username, password, role } = req.body;

        // Validación básica de campos obligatorios.
        if (!name || !username || !password || !role) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }
        // Validación del rol.
        if (!['superadmin', 'admin', 'user'].includes(role)) {
            return res.status(400).json({ message: 'Rol inválido.' });
        }

        // Verifica si el nombre de usuario ya existe en la base de datos.
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: 'El nombre de usuario ya existe.' }); // 409 Conflict
        }

        // Crea una nueva instancia del modelo User y guarda el usuario en MongoDB.
        // En una aplicación real, aquí deberías hashear la contraseña antes de guardarla.
        const newUser = new User({ name, username, password, role });
        await newUser.save();

        res.status(201).json({ message: `Usuario ${username} creado exitosamente con rol: ${role}`, user: newUser });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar usuario.' });
    }
});

// Ruta para VERIFICAR la existencia de un usuario o INICIAR SESIÓN (GET)
// Puede recibir 'username' y 'password' en la query para login, o solo 'username' para verificación.
app.get('/users', async (req, res) => {
    try {
        const { username, password } = req.query; // Obtiene parámetros de la query string.

        if (username) {
            // Busca un usuario por el nombre de usuario.
            const user = await User.findOne({ username });

            // Lógica para intentar iniciar sesión si se proporciona contraseña.
            if (password && user && user.password === password) { // Lógica simple para login (sin hash).
                return res.status(200).json(user); // Usuario encontrado y contraseña coincide.
            } else if (password && user && user.password !== password) {
                return res.status(401).json({ message: 'Contraseña incorrecta.' });
            } else if (username && user) {
                // Si solo se proporciona username y el usuario existe (para verificación en signup).
                return res.status(200).json(user);
            } else {
                // Usuario no encontrado.
                return res.status(200).json(null);
            }
        }
        // Si no se proporciona username en la query, devuelve todos los usuarios (o un error 400, según la necesidad).
        const allUsers = await User.find({});
        res.status(200).json(allUsers);

    } catch (error) {
        console.error('Error al obtener usuario(s):', error);
        res.status(500).json({ message: 'Error interno del servidor al buscar usuarios.' });
    }
});

// -----------------------------------------------------
// RUTAS PARA MANEJAR CASOS CON MONGODB
// -----------------------------------------------------

// Ruta para obtener TODOS los casos (GET)
// Devuelve una lista de todos los documentos de casos almacenados en MongoDB.
app.get('/casos', async (req, res) => {
    try {
        const casos = await Caso.find({}); // Encuentra todos los documentos en la colección 'casos'.
        res.status(200).json(casos);
    } catch (error) {
        console.error('Error al obtener los casos:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener casos.' });
    }
});

// Ruta para obtener UN caso por su _id de MongoDB (GET)
// Espera el _id del caso en los parámetros de la URL.
app.get('/casos/:id', async (req, res) => {
    try {
        const { id } = req.params; // Captura el ID del caso de la URL.

        // Verifica si el ID proporcionado es un ObjectId válido de MongoDB.
        // Esto es crucial para que Mongoose pueda realizar la búsqueda correctamente.
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }

        // Busca el caso por su _id en la base de datos MongoDB.
        const caso = await Caso.findById(id);

        // Si el caso no se encuentra con el _id dado, devuelve un error 404.
        if (!caso) {
            return res.status(404).json({ message: `Caso con _id ${id} no encontrado.` });
        }

        res.status(200).json(caso); // Devuelve el caso encontrado.
    } catch (error) {
        console.error('Error al obtener el caso por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el caso por ID.', error: error.message });
    }
});


// Ruta para CREAR un nuevo caso (POST)
// Utiliza el middleware `upload.single('archivo')` de Multer para procesar el archivo PDF.
// 'archivo' debe ser el nombre del campo 'input type="file"' en tu formulario HTML.
app.post('/casos', upload.single('archivo'), async (req, res) => {
    try {
        // `req.body` contendrá los campos de texto del formulario.
        const casoData = req.body;
        // `req.file` contendrá la información del archivo subido por Multer (si se subió uno).
        const file = req.file;

        // Si no se subió un archivo o Multer lo rechazó, envía un error.
        if (!file) {
            return res.status(400).json({ message: 'No se subió ningún archivo PDF válido para el caso.' });
        }
        casoData.archivo = file.filename; // Solo asigna si el archivo está presente

        // Asegura que 'caseDate' se convierta a un objeto Date antes de guardar en MongoDB.
        if (casoData.caseDate) {
            casoData.caseDate = new Date(casoData.caseDate);
        }

        // Inicializa 'actuaciones' y 'modificaciones' como arrays vacíos si no existen
        if (!casoData.actuaciones) {
            casoData.actuaciones = [];
        }
        if (!casoData.modificaciones) {
            casoData.modificaciones = [];
        }
        if (!casoData.fechaEntrega) {
            casoData.fechaEntrega = null;
        }

        // Crea una nueva instancia del modelo Caso con los datos recibidos.
        const newCase = new Caso(casoData);
        await newCase.save(); // Guarda el nuevo documento en MongoDB.

        // Envía la respuesta de éxito, incluyendo el _id de MongoDB del caso creado.
        res.status(201).json({ message: 'Caso creado exitosamente', id: newCase._id, caso: newCase });
    } catch (error) {
        console.error('Error al crear el caso:', error);
        // Manejo de errores específicos de Multer (ej., si el archivo es demasiado grande o el tipo es incorrecto).
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: `El archivo es demasiado grande. Máximo ${error.limits.fileSize / (1024 * 1024)}MB.` });
            }
            return res.status(400).json({ message: `Error de subida de archivo: ${error.message}` });
        }
        res.status(500).json({ message: 'Error interno del servidor al crear caso.', error: error.message });
    }
});

// Ruta para subir archivos PDF de forma independiente (POST /upload)
// Esta ruta es utilizada por el frontend para subir un nuevo archivo PDF
// cuando se modifica un caso, antes de enviar los datos del caso actualizado.
app.post('/upload', upload.single('archivo'), (req, res) => {
    try {
        // `req.file` contendrá la información del archivo subido por Multer.
        const file = req.file;

        if (!file) {
            // Si no se subió ningún archivo o Multer lo rechazó.
            return res.status(400).json({ message: 'No se subió ningún archivo PDF válido.' });
        }

        // Si la subida fue exitosa, devuelve el nombre único del archivo.
        // El frontend usará este nombre para actualizar el campo 'archivo' del caso.
        res.status(200).json({ message: 'Archivo subido exitosamente.', fileName: file.filename });
    } catch (error) {
        console.error('Error al subir archivo:', error);
        // Manejo de errores específicos de Multer.
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ message: `El archivo es demasiado grande. Máximo ${error.limits.fileSize / (1024 * 1024)}MB.` });
            }
            return res.status(400).json({ message: `Error de subida de archivo: ${error.message}` });
        }
        res.status(500).json({ message: 'Error interno del servidor al subir archivo.', error: error.message });
    }
});


// Ruta para ACTUALIZAR un caso existente (PATCH)
// Espera el ID del caso en los parámetros de la URL y los datos a actualizar en el cuerpo JSON.
app.patch('/casos/:id', async (req, res) => {
    try {
        const { id } = req.params; // Captura el ID del caso de la URL.
        const updateData = req.body; // Obtiene los datos a actualizar del cuerpo de la petición.

        // Añadí una verificación adicional para `_id` en el caso de que venga en `updateData`,
        // lo cual Mongoose podría intentar validar y causar conflictos.
        // Es mejor no permitir que el _id sea modificado por una petición PATCH.
        if (updateData._id) {
            delete updateData._id;
        }

        // Verifica si el ID proporcionado es un ObjectId válido de MongoDB antes de buscar.
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }

        // Busca el caso por su ID de MongoDB y actualiza sus datos.
        // `new: true` asegura que la función devuelva el documento modificado.
        // `runValidators: true` ejecuta las validaciones definidas en el esquema de Mongoose durante la actualización.
        const updatedCase = await Caso.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

        // Si el caso no se encuentra, devuelve un error 404.
        if (!updatedCase) {
            return res.status(404).json({ message: 'Caso no encontrado.' });
        }

        res.status(200).json({ message: 'Caso actualizado exitosamente', caso: updatedCase });
    } catch (error) {
        console.error('Error al actualizar el caso:', error);
        console.error('Mongoose Error Name:', error.name);
        console.error('Mongoose Error Message:', error.message);
        console.error('Mongoose Error Details (if any):', error.errors);
        res.status(500).json({ message: 'Error interno del servidor al actualizar caso.', error: error.message });
    }
});

// Ruta para confirmar la entrega de un caso con validación de clave (PATCH)
app.patch('/casos/:id/confirm-delivery', async (req, res) => {
    try {
        const { id } = req.params; // ID del caso
        const { password } = req.body; // Contraseña enviada desde el frontend

        // 1. Validar el ID de MongoDB
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }

        // 2. Validar la contraseña
        if (password !== CONFIRM_CASE_TOKEN) {
            return res.status(401).json({ message: 'Clave de seguridad incorrecta para confirmar entrega.' });
        }

        // 3. Actualizar el estado del caso
        const currentDate = new Date().toISOString().split('T')[0]; // Formato ISO-MM-DD
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
        console.error('Error en la ruta /casos/:id/confirm-delivery:', error);
        res.status(500).json({ message: 'Error interno del servidor al confirmar entrega.', error: error.message });
    }
});

// NUEVA RUTA: Ruta para ELIMINAR un caso con validación de clave (DELETE)
// Este endpoint ahora también requiere una clave de seguridad.
app.delete('/casos/:id/delete-with-password', async (req, res) => {
    try {
        const { id } = req.params; // Captura el ID del caso de la URL.
        const { password } = req.body; // Captura la contraseña enviada en el cuerpo

        // 1. Validar el ID de MongoDB
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'ID de caso inválido.' });
        }

        // 2. Validar la contraseña
        if (password !== DELETE_CASE_TOKEN) { // Compara con la clave del .env
            return res.status(401).json({ message: 'Clave de seguridad incorrecta para eliminar caso.' });
        }

        // 3. Busca el caso por su ID de MongoDB y lo elimina.
        const deletedCase = await Caso.findByIdAndDelete(id);

        // Si el caso no se encuentra, devuelve un error 404.
        if (!deletedCase) {
            return res.status(404).json({ message: 'Caso no encontrado para eliminar.' });
        }

        res.status(200).json({ message: 'Caso eliminado exitosamente', caso: deletedCase });
    } catch (error) {
        console.error('Error al eliminar el caso:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar caso.', error: error.message });
    }
});


// Iniciar el servidor Express
app.listen(port, () => console.log(`Servidor Express escuchando en el puerto ${port}`));