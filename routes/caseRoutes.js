// routes/caseRoutes.js

/**
 * @file routes/caseRoutes.js
 * @description Define las rutas para la gestión de "casos" (proyectos/obras).
 * Utiliza el caseController para manejar la lógica de negocio.
 */

const express = require('express'); // Framework para construir la API.
const router = express.Router(); // Módulo router de Express para definir rutas.
const caseController = require('../controllers/caseController'); // Importa el controlador de casos.

// --- DEFINICIÓN DE RUTAS PARA LOS CASOS ---

// RUTA PARA OBTENER TODOS LOS CASOS (GET /casos)
router.get('/', caseController.getAllCasos);

// RUTA PARA CREAR UN NUEVO CASO (POST /casos)
// Utiliza el middleware `upload.single('archivo')` (exportado desde el controlador)
// para manejar la subida del archivo PDF.
router.post('/', caseController.upload.single('archivo'), caseController.createCaso);

// RUTA PARA SUBIR/ACTUALIZAR ARCHIVOS PDF DE FORMA INDEPENDIENTE (POST /casos/upload)
// El archivo se espera en un campo llamado 'archivo'.
router.post('/upload', caseController.upload.single('archivo'), caseController.uploadFile);

// RUTA PARA OBTENER UN CASO ESPECÍFICO POR SU ID DE MONGODB (GET /casos/:id)
router.get('/:id', caseController.getCasoById);

// RUTA PARA ACTUALIZAR UN CASO EXISTENTE (PATCH /casos/:id)
router.patch('/:id', caseController.updateCaso);

// RUTA PARA ACTUALIZAR SOLO EL ESTADO DE UN CASO (PATCH /casos/:id/estado)
router.patch('/:id/estado', caseController.updateCasoEstado);

// RUTA PARA CONFIRMAR LA ENTREGA DE UN CASO (PATCH /casos/:id/confirm-delivery)
router.patch('/:id/confirm-delivery', caseController.confirmCasoDelivery);

// RUTA PARA ELIMINAR UN CASO (DELETE /casos/:id/delete-with-password)
router.delete('/:id/delete-with-password', caseController.deleteCaso);

// Exporta el router para ser usado en la aplicación principal (index.js).
module.exports = router;