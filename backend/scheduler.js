// const cron = require('node-cron');
// const { Campaign } = require('./schema');
// const { SmtpConfig } = require('./schema');
// const nodemailer = require('nodemailer');
// const { DateTime } = require('luxon');

// cron.schedule('* * * * *', async () => {
//   console.log(`[${new Date().toISOString()}] Checking for scheduled campaigns...`);

//   // Find campaigns due to be sent
//   const campaigns = await Campaign.find({
//     status: 'scheduled',
//     sendAt: { $lte: new Date() },
//   }).populate('smtpConfigs');

//   for (const campaign of campaigns) {
//     const { subject, body, recipients, smtpConfigs } = campaign;

//     if (!recipients.length || !smtpConfigs.length) continue;

//     try {
//       for (let i = 0; i < recipients.length; i++) {
//         const smtp = smtpConfigs[i % smtpConfigs.length];

//         const transporter = nodemailer.createTransport({
//           host: smtp.host,
//           port: smtp.port,
//           secure: smtp.port === 465,
//           auth: {
//             user: smtp.email,
//             pass: smtp.password,
//           },
//         });

//         await transporter.sendMail({
//           from: smtp.email,
//           to: recipients[i],
//           subject,
//           html: body,
//         });
//       }

//       campaign.status = 'sent';
//       await campaign.save();
//       console.log(`✅ Campaign "${campaign.subject}" sent successfully.`);

//     } catch (err) {
//       console.error(`❌ Failed to send campaign "${campaign.subject}":`, err);
//     }
//   }
// });

// cron.schedule('0 0 * * *', async () => {
//   console.log(`[${new Date().toISOString()}] 🔄 Resetting SMTP quotas`);
//   const smtps = await SmtpConfig.find();

//   for (const smtp of smtps) {
//     smtp.sentCount = 0;
//     smtp.lastReset = new Date();
//     await smtp.save();
//   }
// });

const cron = require('node-cron');
const { Campaign } = require('./schema');
const { SmtpConfig } = require('./schema');
const nodemailer = require('nodemailer');
const { DateTime } = require('luxon');

cron.schedule('* * * * *', async () => {
  console.log(`[${new Date().toISOString()}] Checking for scheduled campaigns...`);

  // Find scheduled campaigns whose sendAt is past
  const campaigns = await Campaign.find({
    status: 'scheduled',
    sendAt: { $lte: new Date() },
  }).populate('smtpConfigs');

  for (const campaign of campaigns) {
    const { subject, body, recipients, smtpConfigs, sendIntervalMinutes = 10 } = campaign;

    if (!recipients.length || !smtpConfigs.length) continue;

    // Check if we should send the next email
    const now = DateTime.local();
    const lastSent = campaign.lastSentAt ? DateTime.fromJSDate(campaign.lastSentAt) : null;
    const nextIndex = campaign.nextRecipientIndex || 0;

    // If done sending all, mark as sent
    if (nextIndex >= recipients.length) {
      campaign.status = 'sent';
      await campaign.save();
      console.log(`✅ Campaign "${campaign.subject}" finished sending to all recipients.`);
      continue;
    }

    // If this is the first send or enough time has passed
    if (!lastSent || now.diff(lastSent, 'minutes').minutes >= sendIntervalMinutes) {
      const recipient = recipients[nextIndex];
      const smtp = smtpConfigs[nextIndex % smtpConfigs.length];

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
          to: recipient,
          subject,
          html: body,
        });

        console.log(`📤 Sent email to ${recipient} using ${smtp.email}`);

        campaign.lastSentAt = new Date();
        campaign.nextRecipientIndex = nextIndex + 1;
        await campaign.save();

        // If this was the last recipient, mark as sent
        if (campaign.nextRecipientIndex >= recipients.length) {
          campaign.status = 'sent';
          await campaign.save();
          console.log(`✅ Campaign "${campaign.subject}" fully sent.`);
        }

      } catch (err) {
        console.error(`❌ Failed to send email to ${recipient}:`, err.message);
      }
    }
  }
});

// Daily quota reset
cron.schedule('0 0 * * *', async () => {
  console.log(`[${new Date().toISOString()}] 🔄 Resetting SMTP quotas`);
  const smtps = await SmtpConfig.find();

  for (const smtp of smtps) {
    smtp.sentCount = 0;
    smtp.lastReset = new Date();
    await smtp.save();
  }
});
