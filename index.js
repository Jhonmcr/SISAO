// index.js
// Punto de entrada principal para la aplicación backend (servidor Express).

// Carga las variables de entorno del archivo .env al inicio de la aplicación.
// Es importante que esto esté al principio para que process.env tenga acceso a las variables.
require('dotenv').config(); 

// IMPORTACIÓN DE MÓDULOS NECESARIOS
const express = require('express'); // Framework para construir aplicaciones web y APIs.
const mongoose = require('mongoose'); // ODM (Object Data Modeling) para MongoDB, facilita la interacción con la base de datos.
const cors = require('cors'); // Middleware para habilitar CORS (Cross-Origin Resource Sharing), permitiendo peticiones desde diferentes dominios.
// const multer = require('multer'); // Middleware para manejar la subida de archivos (multipart/form-data). Ya no se configura aquí directamente.
// const multerS3 = require('multer-s3'); // Adaptador para Multer para subir archivos a Amazon S3. Ya no se configura aquí.
// const { S3Client } = require('@aws-sdk/client-s3'); // Cliente S3 del SDK de AWS v3. Ya no se configura aquí.
// const path = require('path');    // Módulo de Node.js para trabajar con rutas de archivos y directorios. Ya no se usa directamente aquí para uploads.

// IMPORTACIÓN DE MODELOS DE DATOS (MongoDB Schemas)
// const User = require('./models/User'); // Modelo de Usuario (Mongoose). Ya no se usa directamente aquí, se maneja en userRoutes.
// const Caso = require('./models/Caso'); // Modelo de Caso (Mongoose). Ya no se usa directamente aquí, se maneja en caseRoutes.

// Creación de la instancia de la aplicación Express.
const app = express();

// CONFIGURACIÓN DEL PUERTO
// Define el puerto en el que escuchará el servidor Express.
// Intenta obtener el puerto de las variables de entorno (process.env.PORT),
// si no está definido, usa el puerto 3000 por defecto.
const port = process.env.PORT || 3000;

// MIDDLEWARES GLOBALES DE EXPRESS
// Configuración explícita de CORS
const corsOptions = {
  origin: [
    'https://gabinete5-project.onrender.com', // Dominio de producción del frontend
    'http://localhost:3001', // Si tienes un entorno de desarrollo local para el frontend
    'http://127.0.0.1:3001'  // Otra posible dirección local
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: ['Content-Type', 'Authorization'], // Asegúrate de incluir 'Authorization' si usas tokens JWT u otros encabezados personalizados
  credentials: true, // Si necesitas enviar cookies o encabezados de autorización
  optionsSuccessStatus: 200 // Algunos navegadores antiguos (IE11, varios SmartTVs) se bloquean con 204
};
app.use(cors(corsOptions)); // Habilita CORS con opciones específicas.
app.use(express.json()); // Parsea las solicitudes entrantes con payloads JSON (ej. req.body).

// Nota: La configuración de Multer, S3, y las constantes de tokens de roles
// se han movido a sus respectivos archivos de rutas (userRoutes.js, caseRoutes.js)
// o se acceden directamente a través de `process.env` donde sea necesario para mantener este archivo más limpio.

// CONEXIÓN A LA BASE DE DATOS MONGODB
// Utiliza la URI de MongoDB almacenada en las variables de entorno.
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log('Conexión exitosa a MongoDB Atlas establecida.')) // Mensaje de éxito en la conexión.
    .catch((error) => console.error('Error al intentar conectar a MongoDB Atlas:', error)); // Manejo de errores de conexión.

// -----------------------------------------------------
// ENDPOINT DE CONFIGURACIÓN PARA EL FRONTEND
// Proporciona configuraciones sensibles (como tokens de roles) al frontend de forma segura.
// El frontend puede hacer una petición GET a esta ruta para obtener los tokens necesarios para el registro de usuarios.
app.get('/api/config', (req, res) => {
    // Log para verificar el valor de REACT_APP_API_URL en el entorno de ejecución del backend
    console.log(`[Backend /api/config] REACT_APP_API_URL: ${process.env.REACT_APP_API_URL}`);
    
    const apiUrl = process.env.REACT_APP_API_URL || 'https://gabinete5-backend.onrender.com'; // Fallback por si acaso

    // Responde con un objeto JSON que contiene los tokens de roles definidos en las variables de entorno.
    // Es crucial que estas variables (SUPER_ADMIN_TOKEN, ADMIN_TOKEN, USER_TOKEN) estén definidas en el archivo .env.
    res.json({
        ROLES_TOKENS: {
            SUPER_ADMIN_TOKEN: process.env.SUPER_ADMIN_TOKEN,
            ADMIN_TOKEN: process.env.ADMIN_TOKEN,
            USER_TOKEN: process.env.USER_TOKEN,
        },
        API_BASE_URL: apiUrl 
    });
});

// -----------------------------------------------------
// IMPORTACIÓN Y USO DE RUTAS MODULARIZADAS

// RUTAS PARA LA GESTIÓN DE USUARIOS
// Importa el módulo de rutas de usuarios.
const userRoutes = require('./routes/userRoutes'); 
// Monta las rutas de usuarios bajo el prefijo '/users'.
// Todas las rutas definidas en `userRoutes.js` comenzarán con '/users' (ej. /users/login, /users/register).
app.use('/users', userRoutes);

// RUTAS PARA LA GESTIÓN DE CASOS
// Importa el módulo de rutas de casos.
const caseRoutes = require('./routes/caseRoutes'); 
// Monta las rutas de casos bajo el prefijo '/casos'.
// Todas las rutas definidas en `caseRoutes.js` comenzarán con '/casos' (ej. /casos, /casos/:id).
// La ruta para subir archivos (que antes era /upload) ahora está integrada dentro de `caseRoutes`
// y es accesible, por ejemplo, como '/casos/upload' o como parte de la creación/modificación de un caso.
app.use('/casos', caseRoutes); 


// INICIO DEL SERVIDOR EXPRESS
// Pone la aplicación Express a escuchar en el puerto configurado.
app.listen(port, () => console.log(`Servidor Express iniciado y escuchando en el puerto ${port}. Accede en http://localhost:${port}`));