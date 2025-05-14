const express = require('express');
const { fetchReplies } = require('../utils/imapClient');
const { SmtpConfig } = require('../schema');
const nodemailer = require('nodemailer');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');

exports.getUnibox = async (req, res) => {
  try {
    const { email } = req.params; // use :email in route

    const smtp = await SmtpConfig.findOne({ email });
    if (!smtp) return res.status(404).json({ error: 'SMTP config not found' });

    const replies = await fetchReplies({
      email: smtp.email,
      password: smtp.password, // direct usage
      host: 'imap.secureserver.net',
      port: 993,
    });

    res.status(200).json(replies);
  } catch (err) {
    console.error('Unibox fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
};

exports.sendReply = async (req, res) => {
  try {
    const { to, content, email } = req.body;

    if (!to || !content || !email) {
      return res.status(400).json({ error: 'Missing required fields: to, content, or email' });
    }

    // Find SMTP config using the email address
    const smtp = await SmtpConfig.findOne({ email });
    if (!smtp) {
      return res.status(404).json({ error: 'SMTP config not found for this email' });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.email,
        pass: smtp.password // use decrypt(smtp.password) if encrypted
      },
      tls: { rejectUnauthorized: false }
    });

    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      content: file.buffer
    }));

    // Send reply
    await transporter.sendMail({
      from: smtp.email,
      to,
      subject: 'Re: Follow-up',
      html: content,
      attachments
    });

    res.status(200).json({ message: 'Reply sent successfully' });
  } catch (err) {
    console.error('❌ Send reply error:', err);
    res.status(500).json({ error: 'Failed to send reply', details: err.message });
  }
};