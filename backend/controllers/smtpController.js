const { SmtpConfig } = require('../schema');

// Create a new SMTP config
exports.createSmtp = async (req, res) => {
  try {
    const smtp = new SmtpConfig(req.body);
    await smtp.save();
    res.status(201).json(smtp);
  } catch (err) {
    console.error('Create SMTP error:', err);
    res.status(500).json({ error: 'Failed to create SMTP config' });
  }
};

// Get all SMTP configs
exports.getAllSmtp = async (req, res) => {
  try {
    const smtpList = await SmtpConfig.find();
    res.status(200).json(smtpList);
  } catch (err) {
    console.error('Get SMTPs error:', err);
    res.status(500).json({ error: 'Failed to fetch SMTP configs' });
  }
};

// Get a single SMTP config by ID
exports.getSmtpById = async (req, res) => {
  try {
    const smtp = await SmtpConfig.findById(req.params.id);
    if (!smtp) return res.status(404).json({ error: 'SMTP config not found' });
    res.status(200).json(smtp);
  } catch (err) {
    console.error('Get SMTP error:', err);
    res.status(500).json({ error: 'Failed to fetch SMTP config' });
  }
};

// Update SMTP config
exports.updateSmtp = async (req, res) => {
  try {
    const smtp = await SmtpConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!smtp) return res.status(404).json({ error: 'SMTP config not found' });
    res.status(200).json(smtp);
  } catch (err) {
    console.error('Update SMTP error:', err);
    res.status(500).json({ error: 'Failed to update SMTP config' });
  }
};

// Delete SMTP config
exports.deleteSmtp = async (req, res) => {
  try {
    const smtp = await SmtpConfig.findByIdAndDelete(req.params.id);
    if (!smtp) return res.status(404).json({ error: 'SMTP config not found' });
    res.status(200).json({ message: 'SMTP config deleted' });
  } catch (err) {
    console.error('Delete SMTP error:', err);
    res.status(500).json({ error: 'Failed to delete SMTP config' });
  }
};
