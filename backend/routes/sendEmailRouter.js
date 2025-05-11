const express = require('express');
const nodemailer = require('nodemailer');
const { SmtpConfig } = require('../schema');
const router = express.Router();

router.post('/api/send-email', async (req, res) => {
    try {
      const { smtpId, to, cc, bcc, subject, body } = req.body;
  
      // Fetch the SMTP config
      const config = await SmtpConfig.findById(smtpId);
      if (!config) {
        return res.status(404).json({ error: 'SMTP configuration not found' });
      }
  
      // Create transporter
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.email,
          pass: config.password,
        },
      });
  
      // Send mail
      const mailOptions = {
        from: config.email,
        to,
        cc,
        bcc,
        subject,
        html: body,
      };
  
      const info = await transporter.sendMail(mailOptions);
      res.status(200).json({ message: 'Email sent', messageId: info.messageId });
    } catch (err) {
      console.error('Email send error:', err);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });       

  module.exports = router;