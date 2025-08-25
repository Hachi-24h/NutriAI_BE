// routes/auth.js
const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/authController');

router.post('/create', authCtrl.createAccount);
router.get('/getAll', authCtrl.getAllAccounts);

module.exports = router;
