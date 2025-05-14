const express = require('express');
const router = express.Router();
const uniboxController = require('../controllers/uniboxController');
const multer = require('multer');
const upload = multer();

router.get('/api/unibox/:email', uniboxController.getUnibox);
router.post('/api/unibox/reply', upload.array('attachments'), uniboxController.sendReply);

module.exports = router