const express = require('express');
const router = express.Router();
const { requestOtp, verifyOtp, checkStatus, logout } = require('../controllers/auth.controller');

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.get('/status', checkStatus);
router.post('/logout', logout);

module.exports = router;