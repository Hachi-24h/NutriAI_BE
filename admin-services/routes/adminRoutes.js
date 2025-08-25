// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');

router.post('/createAD', adminCtrl.createAdmin);
router.get('/getAllAD', adminCtrl.getAllAdmins);

module.exports = router;
