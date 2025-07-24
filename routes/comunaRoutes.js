const express = require('express');
const router = express.Router();
const comunaController = require('../controllers/comunaController');
const upload = require('../middleware/multerConfig');

router.post('/import-comunas', upload.single('excelFile'), comunaController.importComunas);
router.post('/', comunaController.createComuna);
router.get('/', comunaController.getAllComunas);
router.get('/parroquia/:parroquia', comunaController.getComunasByParroquia);
router.post('/:id/consejos-comunales', comunaController.addConsejosComunales);
router.post('/:idComuna/import-consejos', upload.single('excelFile'), comunaController.importConsejosFromExcel);
router.get('/:id/consejos', comunaController.getConsejosByComuna);
router.put('/:id', comunaController.updateComuna);
router.put('/consejo/:id', comunaController.updateConsejoComunal);
router.get('/stats/no-contactadas', comunaController.getComunasNoContactadas);
router.get('/stats/otc', comunaController.getOtcStats);

module.exports = router;
