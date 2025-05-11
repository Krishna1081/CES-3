const { Campaign } = require('../schema');
const { SmtpConfig } = require('../schema');
const nodemailer = require('nodemailer');
const { DateTime } = require('luxon');

async function resetDailyQuotaIfNeeded(smtp) {
  const now = new Date();
  const lastReset = smtp.lastReset || new Date(0);
  const nowDate = now.toISOString().slice(0, 10);
  const lastResetDate = lastReset.toISOString().slice(0, 10);

  if (nowDate !== lastResetDate) {
    smtp.sentCount = 0;
    smtp.lastReset = now;
    await smtp.save();
  }
}

// Create a scheduled campaign
exports.createCampaign = async (req, res) => {
  try {
    const {subject, body, recipients, smtpConfigs, sendAt, timezone} = req.body;
    
    // Convert local time in timezone to UTC
    const localTime = DateTime.fromISO(sendAt, { zone: timezone });
    const utcSendAt = localTime.toUTC().toJSDate();

    const campaign = new Campaign({
      subject, body, recipients, smtpConfigs, sendAt: utcSendAt, timezone, status: 'scheduled', 
    });
    await campaign.save();
    res.status(201).json(campaign);
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

exports.sendCampaignById = async function sendCampaignById(id) {
  const campaign = await Campaign.findById(id).populate('smtpConfigs');
  if (!campaign || !campaign.recipients.length || !campaign.smtpConfigs.length) return;

  const { subject, body, recipients, smtpConfigs } = campaign;

  for (let i = 0; i < recipients.length; i++) {
    let sent = false;
    let attempts = 0;

    while (!sent && attempts < 3) {
      const smtp = smtpConfigs[i % smtpConfigs.length];
      await resetDailyQuotaIfNeeded(smtp);

      if (smtp.sentCount >= smtp.dailyLimit) {
        console.warn(`🚫 SMTP ${smtp.email} quota reached`);
        break;
      }

      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: {
            user: smtp.email,
            pass: smtp.password,
          },
        });

        await transporter.sendMail({
          from: smtp.email,
          to: recipients[i],
          subject,
          html: body,
        });

        smtp.sentCount += 1;
        await smtp.save();

        sent = true;
        console.log(`📤 Email sent to ${recipients[i]} using ${smtp.email}`);
      } catch (err) {
        console.error(`❌ Attempt ${attempts + 1} failed for ${recipients[i]}:`, err.message);
        attempts += 1;
        await new Promise(r => setTimeout(r, 2000)); // wait 2 sec before retry
      }
    }

    if (!sent) {
      console.error(`🚨 Failed to send to ${recipients[i]} after 3 retries.`);
    }
  }

  campaign.status = 'sent';
  await campaign.save();
};

// Send a campaign (one-time bulk send)
exports.sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await Campaign.findById(id).populate('smtpConfigs');

    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (!campaign.recipients.length || !campaign.smtpConfigs.length)
      return res.status(400).json({ error: 'Recipients or SMTP configs missing' });

    const { subject, body, recipients, smtpConfigs } = campaign;

    for (let i = 0; i < recipients.length; i++) {
      const smtp = smtpConfigs[i % smtpConfigs.length];

      await resetDailyQuotaIfNeeded(smtp);

      if (smtp.sentCount >= smtp.dailyLimit) {
        console.warn(`🚫 SMTP ${smtp.email} quota reached`);
        continue; // skip to next recipient
      }

      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: {
          user: smtp.email,
          pass: smtp.password,
        },
      });

      try {
        await transporter.sendMail({
          from: smtp.email,
          to: recipients[i],
          subject,
          html: body,
        });

        smtp.sentCount += 1;
        await smtp.save();

        console.log(`📤 Email sent to ${recipients[i]} using ${smtp.email}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${recipients[i]}:`, err.message);
      }
    }

    campaign.status = 'sent';
    await campaign.save();

    res.status(200).json({ message: 'Campaign emails sent successfully' });
  } catch (err) {
    console.error('Send campaign error:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
};


// GET /api/campaigns - fetch all campaigns
exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error.message);
    res.status(500).json({ message: 'Server error while fetching campaigns' });
  }
};

// UPDATE Campaign by ID
exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCampaign = await Campaign.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedCampaign) return res.status(404).json({ error: 'Campaign not found' });

    res.status(200).json(updatedCampaign);
  } catch (error) {
    console.error('Update campaign error:', error.message);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
};

// DELETE Campaign by ID
exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedCampaign = await Campaign.findByIdAndDelete(id);

    if (!deletedCampaign) return res.status(404).json({ error: 'Campaign not found' });

    res.status(200).json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error.message);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
};

// SEARCH Campaigns (by subject, status, recipient)
exports.searchCampaigns = async (req, res) => {
  try {
    const subjectQuery = req.query.subject || '';
    const campaigns = await Campaign.find({
      subject: { $regex: subjectQuery, $options: 'i' }
    });
    res.json(campaigns); // ✅ return array
  } catch (err) {
    console.error("Search failed:", err);
    res.status(500).json({ error: 'Server error during search' });
  }
};