// const express = require('express');
// const { fetchReplies } = require('../utils/imapClient');
// const { SmtpConfig } = require('../schema');
// const nodemailer = require('nodemailer');
// const multer = require('multer');
// const upload = multer({ dest: 'uploads/' });
// const fs = require('fs');

// exports.getUnibox = async (req, res) => {
//   try {
//     const { email } = req.params; // use :email in route

//     const smtp = await SmtpConfig.findOne({ email });
//     if (!smtp) return res.status(404).json({ error: 'SMTP config not found' });

//     const replies = await fetchReplies({
//       email: smtp.email,
//       password: smtp.password, // direct usage
//       host: 'imap.secureserver.net',
//       port: 993,
//     });

//     res.status(200).json(replies);
//   } catch (err) {
//     console.error('Unibox fetch error:', err);
//     res.status(500).json({ error: 'Failed to fetch replies' });
//   }
// };

// exports.sendReply = async (req, res) => {
//   try {
//     const { to, content, email } = req.body;

//     if (!to || !content || !email) {
//       return res.status(400).json({ error: 'Missing required fields: to, content, or email' });
//     }

//     // Find SMTP config using the email address
//     const smtp = await SmtpConfig.findOne({ email });
//     if (!smtp) {
//       return res.status(404).json({ error: 'SMTP config not found for this email' });
//     }

//     // Create transporter
//     const transporter = nodemailer.createTransport({
//       host: smtp.host,
//       port: smtp.port,
//       secure: smtp.port === 465,
//       auth: {
//         user: smtp.email,
//         pass: smtp.password // use decrypt(smtp.password) if encrypted
//       },
//       tls: { rejectUnauthorized: false }
//     });

//     const attachments = (req.files || []).map(file => ({
//       filename: file.originalname,
//       content: file.buffer
//     }));

//     // Send reply
//     await transporter.sendMail({
//       from: smtp.email,
//       to,
//       subject: 'Re: Follow-up',
//       html: content,
//       attachments
//     });

//     res.status(200).json({ message: 'Reply sent successfully' });
//   } catch (err) {
//     console.error('❌ Send reply error:', err);
//     res.status(500).json({ error: 'Failed to send reply', details: err.message });
//   }
// };

const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const { fetchReplies } = require('../utils/imapClient');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'MailSpace';

exports.getUnibox = async (req, res) => {
  try {
    const email = req.params.email;
    console.log('Received email:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }

    // Query DynamoDB by email
    const queryParams = {
      TableName: TABLE_NAME,
      IndexName: 'EmailIndex',  // make sure this matches your actual GSI name
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
      Limit: 1,
    };

    console.log('Query params:', JSON.stringify(queryParams));

    const result = await dynamoDB.query(queryParams).promise();
    console.log('Query result:', JSON.stringify(result));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'SMTP config not found for this email' });
    }

    const smtpItem = result.Items[0];
    console.log('SMTP item:', smtpItem);

    const smtpId = smtpItem.PK.replace('SMTP#', '');

    const getConfigParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: `SMTP#${smtpId}`,
        SK: 'META',
      },
    };

    console.log('Get config params:', JSON.stringify(getConfigParams));

    const { Item: smtpConfig } = await dynamoDB.get(getConfigParams).promise();
    console.log('SMTP config:', smtpConfig);

    if (!smtpConfig) {
      return res.status(404).json({ error: 'SMTP config not found for this SMTP ID' });
    }

    // Fetch replies using smtpConfig
    const replies = await fetchReplies({
      email: smtpConfig.email,
      password: smtpConfig.password,
      host: 'imap.secureserver.net',
      port: 993,
    });

    res.status(200).json(replies);
  } catch (err) {
    console.error('📥 Unibox fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch replies', details: err.message });
  }
};




// Send reply with optional attachments
exports.sendReply = async (req, res) => {
  try {
    const { to, content, email } = req.body;

    if (!to || !content || !email) {
      return res.status(400).json({ error: 'Missing required fields: to, content, or email' });
    }

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `SMTP#${email}`,
        SK: 'CONFIG',
      },
    };

    const { Item: smtp } = await dynamoDB.get(params).promise();
    if (!smtp) {
      return res.status(404).json({ error: 'SMTP config not found for this email' });
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: {
        user: smtp.email,
        pass: smtp.password,
      },
      tls: { rejectUnauthorized: false }
    });

    const attachments = (req.files || []).map(file => ({
      filename: file.originalname,
      content: file.buffer,
    }));

    await transporter.sendMail({
      from: smtp.email,
      to,
      subject: 'Re: Follow-up',
      html: content,
      attachments,
    });

    res.status(200).json({ message: 'Reply sent successfully' });
  } catch (err) {
    console.error('❌ Send reply error:', err);
    res.status(500).json({ error: 'Failed to send reply', details: err.message });
  }
};
