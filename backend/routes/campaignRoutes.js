const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// POST /api/campaigns - Create a new campaign
router.post('/api/campaigns', campaignController.createCampaign);

// POST /api/campaigns/:id/send - Send campaign
router.post('/api/campaigns/:id/send', campaignController.sendCampaign);

// GET /api/campaigns/getAll - Get All Campaign
router.get('/api/campaigns/getAll', campaignController.getAllCampaigns);

// GET /api/campaigns/search - Serach for a Campaign
router.get('/api/campaigns/search', campaignController.searchCampaigns);

// PUT /api/campaigns/update/:id - Update a Campaign
router.put('/api/campaigns/update/:id', campaignController.updateCampaign);

// DELETE /api/campaigns/delete/:id - Delete a Campaign
router.delete('/api/campaigns/delete/:id', campaignController.deleteCampaign);

module.exports = router;
