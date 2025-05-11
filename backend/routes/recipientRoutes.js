const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadRecipientsCSV, getAllRecipientEmails, createRecipient, getRecipientById, updateRecipient,deleteRecipient, getRecipients } = require('../controllers/recepientController');

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/api/recipient/upload-csv', upload.single('file'), uploadRecipientsCSV);
router.get('/api/recipient/getAllRecipientsEmails', getAllRecipientEmails);
router.get('/api/recipient/getRecipients', getRecipients);
router.post('/api/recipient/createRecipient', createRecipient);
router.get('/api/recipient/getRecipient/:id', getRecipientById);
router.put('/api/recipient/updateRecipient/:id', updateRecipient);
router.delete('/api/recipient/deleteRecipient/:id', deleteRecipient);


module.exports = router;
