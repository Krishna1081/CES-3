const csv = require('csv-parser');
const {Recipients} = require('../schema');
const { Readable } = require('stream');

exports.uploadRecipientsCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const stream = Readable.from(req.file.buffer);

  stream
    .pipe(csv())
    .on('data', (data) => {
      if (data.email && /^\S+@\S+\.\S+$/.test(data.email)) {
        results.push({
          email: data.email,
          name: data.name || ''
        });
      }
    })
    .on('end', async () => {
      try {
        // Insert unique recipients (skip duplicates)
        const operations = results.map((entry) => ({
          updateOne: {
            filter: { email: entry.email },
            update: { $setOnInsert: entry },
            upsert: true
          }
        }));

        await Recipients.bulkWrite(operations);
        res.status(200).json({ message: 'Recipients uploaded successfully', count: results.length });
      } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to save recipients' });
      }
    });
};

// Get all recipient emails
exports.getAllRecipientEmails = async (req, res) => {
  try {
    const recipients = await Recipients.find({}, 'email').lean(); // Only fetch email field
    const emails = recipients.map(r => r.email);
    res.status(200).json({ emails });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipient emails' });
  }
};

// Get all recipients with name, email, id, etc.
exports.getRecipients = async (req, res) => {
  try {
    const recipients = await Recipients.find();
    res.json(recipients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create recipient
exports.createRecipient = async (req, res) => {
  try {
    const recipient = new Recipients(req.body);
    await recipient.save();
    res.status(201).json(recipient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get a recipient by ID
exports.getRecipientById = async (req, res) => {
  try {
    const recipient = await Recipients.findById(req.params.id);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    res.json(recipient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update recipient
exports.updateRecipient = async (req, res) => {
  try {
    const recipient = await Recipients.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    res.json(recipient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete recipient
exports.deleteRecipient = async (req, res) => {
  try {
    const recipient = await Recipients.findByIdAndDelete(req.params.id);
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
    res.json({ message: 'Recipient deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};