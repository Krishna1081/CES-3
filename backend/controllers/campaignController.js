const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const { DateTime } = require('luxon');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'MailSpace'; // Single table for campaigns and SMTP

async function resetDailyQuotaIfNeeded(smtp) {
  if (!smtp) return; // safety check
  const now = new Date();
  const lastReset = smtp.lastReset || new Date(0).toISOString();
  const nowDate = now.toISOString().slice(0, 10);
  const lastResetDate = new Date(lastReset).toISOString().slice(0, 10);

  if (nowDate !== lastResetDate) {
    smtp.sentCount = 0;
    smtp.lastReset = now.toISOString();
    await dynamoDB.update({
      TableName: TABLE_NAME,
      Key: { PK: `SMTP#${smtp.email}`, SK: 'METADATA' },
      UpdateExpression: 'set sentCount = :s, lastReset = :r',
      ExpressionAttributeValues: {
        ':s': 0,
        ':r': smtp.lastReset
      }
    }).promise();
  }
}

function convertToUtcIso(userDateTime, userTimezone) {
  const localTime = DateTime.fromISO(userDateTime, { zone: userTimezone });
  const utcTime = localTime.toUTC().toISO(); // what you store in DynamoDB
  return utcTime;
}

exports.createCampaign = async (req, res) => {
  try {
    const { subject, body, recipients, smtpConfigs, sendAt, timezone } = req.body;
    const campaignId = Date.now().toString();
    // const localTime = DateTime.fromISO(sendAt, { zone: timezone });
    // const utcSendAt = localTime.toUTC().toISO();
    const sendAtUtc = convertToUtcIso(sendAt, timezone);

    const campaign = {
      PK: `CAMPAIGN#${campaignId}`,
      SK: 'METADATA',
      id: campaignId,
      subject,
      body,
      recipients,
      smtpConfigs,
      sendAt: sendAtUtc,
      timezone,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      entityType: 'campaign'
    };

    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: campaign
    }).promise();

    res.status(201).json(campaign);
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
};

exports.sendCampaignById = async function (id) {
  console.log(`📦 Campaign ID: ${id}`);
  
  const campaignData = await dynamoDB.get({
    TableName: TABLE_NAME,
    Key: { PK: `CAMPAIGN#${id}`, SK: 'METADATA' }
  }).promise();

  const campaign = campaignData.Item;
  if (!campaign || !campaign.recipients?.length || !campaign.smtpConfigs?.length) {
    console.log('❌ Campaign data is incomplete or invalid.');
    return;
  }

  console.log(`📧 Recipients: ${campaign.recipients.length}`);
  console.log(`📨 SMTPs: ${campaign.smtpConfigs.length}`);

  for (let i = 0; i < campaign.recipients.length; i++) {
    let sent = false;
    let attempts = 0;

    while (!sent && attempts < 3) {
      const smtpEmail = campaign.smtpConfigs[i % campaign.smtpConfigs.length];
      console.log(`🔍 Fetching SMTP config for: ${smtpEmail}`);

      // 📌 Replace this with a GSI query in production
      const smtpData = await dynamoDB.get({
        TableName: TABLE_NAME,
        Key: {
          PK: `SMTP#${smtpEmail}`,  // smtpEmail here is actually the ID
          SK: 'META'
        }
      }).promise();

      const smtp = smtpData.Item;
      if (!smtp) {
        console.log(`❌ SMTP config not found for ${smtpEmail}`);
        break;
      }

      await resetDailyQuotaIfNeeded(smtp);
      if (smtp.sentCount >= smtp.dailyLimit) {
        console.log(`⚠️ SMTP ${smtp.email} has hit its daily limit.`);
        break;
      }

      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: Number(smtp.port),
          secure: smtp.port === '465',
          auth: {
            user: smtp.email,
            pass: smtp.password
          }
        });

        await transporter.sendMail({
          from: smtp.email,
          to: campaign.recipients[i],
          subject: campaign.subject,
          html: campaign.body
        });

        smtp.sentCount++;
        await dynamoDB.update({
          TableName: TABLE_NAME,
          Key: { PK: `SMTP#${smtp.id}`, SK: 'META' },
          UpdateExpression: 'set sentCount = :s',
          ExpressionAttributeValues: {
            ':s': smtp.sentCount
          }
        }).promise();

        sent = true;
        console.log(`✅ Sent to ${campaign.recipients[i]} using ${smtp.email}`);
      } catch (err) {
        console.error(`❌ Attempt ${attempts + 1} failed for ${campaign.recipients[i]} using ${smtp.email}:`, err.message);
        attempts++;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
};


exports.sendCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    await exports.sendCampaignById(id);
    res.status(200).json({ message: 'Campaign sent' });
  } catch (err) {
    console.error('Send campaign error:', err);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
};

exports.getAllCampaigns = async (req, res) => {
  try {
    // Scan and filter campaigns by entityType
    const data = await dynamoDB.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :type',
      ExpressionAttributeValues: {
        ':type': 'campaign'
      }
    }).promise();

    res.status(200).json(data.Items);
  } catch (err) {
    console.error('Fetch campaigns error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
};

exports.updateCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body, recipients, smtpConfigs, sendAt, timezone, status } = req.body;

    const updates = [];
    const values = {};
    const names = {};

    if (subject) {
      updates.push('#subject = :subject');
      names['#subject'] = 'subject';
      values[':subject'] = subject;
    }
    if (body) {
      updates.push('#body = :body');
      names['#body'] = 'body';
      values[':body'] = body;
    }
    if (recipients) {
      updates.push('#recipients = :recipients');
      names['#recipients'] = 'recipients';
      values[':recipients'] = recipients;
    }
    if (smtpConfigs) {
      updates.push('#smtpConfigs = :smtpConfigs');
      names['#smtpConfigs'] = 'smtpConfigs';
      values[':smtpConfigs'] = smtpConfigs;
    }
    if (sendAt) {
      updates.push('#sendAt = :sendAt');
      names['#sendAt'] = 'sendAt';
      values[':sendAt'] = convertToUtcIso(sendAt, timezone || 'UTC');
    }
    if (timezone) {
      updates.push('#timezone = :timezone');
      names['#timezone'] = 'timezone';
      values[':timezone'] = timezone;
    }
    if (status) {
      updates.push('#status = :status');
      names['#status'] = 'status';
      values[':status'] = status;
    }

    await dynamoDB.update({
      TableName: TABLE_NAME,
      Key: { PK: `CAMPAIGN#${id}`, SK: 'METADATA' },
      UpdateExpression: `set ${updates.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW'
    }).promise();

    res.status(200).json({ message: 'Campaign updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
};

exports.deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    await dynamoDB.delete({
      TableName: TABLE_NAME,
      Key: { PK: `CAMPAIGN#${id}`, SK: 'METADATA' }
    }).promise();
    res.status(200).json({ message: 'Campaign deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
};

exports.searchCampaigns = async (req, res) => {
  try {
    const subjectQuery = (req.query.subject || '').toLowerCase();

    const data = await dynamoDB.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :type',
      ExpressionAttributeValues: {
        ':type': 'campaign'
      }
    }).promise();

    const filtered = data.Items.filter(c => c.subject?.toLowerCase().includes(subjectQuery));

    res.status(200).json(filtered);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search campaigns' });
  }
};
