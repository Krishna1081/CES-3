const express = require('express');
const router = express.Router();
const smtpController = require('../controllers/smtpController');

router.post('/api/smtp', smtpController.createSmtp);
router.get('/api/smtp', smtpController.getAllSmtp);
router.get('/api/smtp/:id', smtpController.getSmtpById);
router.put('/api/smtp/:id', smtpController.updateSmtp);
router.delete('/api/smtp/:id', smtpController.deleteSmtp);

module.exports = router;
