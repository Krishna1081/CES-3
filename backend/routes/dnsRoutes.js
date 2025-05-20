const express = require('express');
const router = express.Router();
const dnsController = require('../controllers/dnsController');

router.get('/api/dns-check', dnsController.checkDomainDNS);

module.exports = router;
