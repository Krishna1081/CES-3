const cron = require('node-cron');
const { Campaign } = require('./schema');
const { SmtpConfig } = require('./schema');
const nodemailer = require('nodemailer');
const { DateTime } = require('luxon');

cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Checking for scheduled campaigns...`);

  // Find campaigns due to be sent
  const campaigns = await Campaign.find({
    status: 'scheduled',
    sendAt: { $lte: new Date() },
  }).populate('smtpConfigs');

  for (const campaign of campaigns) {
    const { subject, body, recipients, smtpConfigs } = campaign;

    if (!recipients.length || !smtpConfigs.length) continue;

    try {
      for (let i = 0; i < recipients.length; i++) {
        const smtp = smtpConfigs[i % smtpConfigs.length];

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
      }

      campaign.status = 'sent';
      await campaign.save();
      console.log(`✅ Campaign "${campaign.subject}" sent successfully.`);

    } catch (err) {
      console.error(`❌ Failed to send campaign "${campaign.subject}":`, err);
    }
  }
});

cron.schedule('0 0 * * *', async () => {
  console.log(`[${new Date().toISOString()}] 🔄 Resetting SMTP quotas`);
  const smtps = await SmtpConfig.find();

  for (const smtp of smtps) {
    smtp.sentCount = 0;
    smtp.lastReset = new Date();
    await smtp.save();
  }
});