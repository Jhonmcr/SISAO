const express = require('express');
const router = express.Router();
const comunaController = require('../controllers/comunaController');

router.post('/', comunaController.createComuna);
router.get('/parroquia/:parroquia', comunaController.getComunasByParroquia);
router.get('/stats/no-contactadas', comunaController.getComunasNoContactadas);

module.exports = router;
