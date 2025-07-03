// index.js
require('dotenv').config(); // Carga las variables de entorno al inicio.

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer'); // Importa la librería Multer
const multerS3 = require('multer-s3'); // Importa multer-s3
const { S3Client } = require('@aws-sdk/client-s3'); // Importa S3Client de AWS SDK v3
const path = require('path');    // Importa el módulo 'path' para manejar rutas de archivos
// const fs = require('fs'); // fs ya no será necesario para el directorio de subidas local

const User = require('./models/User'); // Importa el modelo de usuario existente
const Caso = require('./models/Caso'); // ***** CAMBIO 1: Importar el modelo Caso desde models/Caso.js *****

const app = express();

// Puerto para el servidor Express
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json()); // Permite a Express leer JSON en el cuerpo de las peticiones

// La configuración de Multer, S3 y las constantes de token se han movido a los archivos de rutas
// o se acceden directamente a través de process.env donde sea necesario.

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
    // Asegurarse de que estas variables de entorno estén definidas en .env
    res.json({
        ROLES_TOKENS: {
            SUPER_ADMIN_TOKEN: process.env.SUPER_ADMIN_TOKEN,
            ADMIN_TOKEN: process.env.ADMIN_TOKEN,
            USER_TOKEN: process.env.USER_TOKEN,
        },
    });
});

// -----------------------------------------------------
// RUTAS PARA MANEJAR USUARIOS CON MONGODB
const userRoutes = require('./routes/userRoutes');
app.use('/users', userRoutes);

// RUTAS PARA MANEJAR CASOS CON MONGODB
const caseRoutes = require('./routes/caseRoutes');
app.use('/casos', caseRoutes); // Todas las rutas de casos estarán bajo /casos
// La ruta /upload que estaba separada ahora estará en caseRoutes y será accesible como /casos/upload


// Iniciar el servidor Express
app.listen(port, () => console.log(`Servidor Express escuchando en el puerto ${port}`));