const mongoose = require('mongoose');
const { Schema } = mongoose;

// User Schema
const UserSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});

const CampaignSchema = new Schema({
    subject: String,
    body: String,
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    recipients: [String], // List of recipients
    smtpConfigs: [{ type: Schema.Types.ObjectId, ref: 'SmtpConfig' }], // List of sender SMTPs
    status: { type: String, enum: ['draft', 'scheduled', 'sent'], default: 'draft' },
    sendAt: Date, // Optional scheduling
    timezone: String, // e.g., 'America/New_York'
    createdAt: { type: Date, default: Date.now },
    sendIntervalMinutes: { type: Number, default: 10 },
  });
  

// SMTP Config Schema
const SmtpConfigSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  host: String,
  port: Number,
  email: String,
  password: String,
  dailyLimit: { type: Number, default: 30 },       // Max emails per day
  sentCount: { type: Number, default: 0 },          // Emails sent today
  lastReset: { type: Date, default: Date.now },     // Last reset timestamp
});

// Email Template Schema
const EmailTemplateSchema = new Schema({
  name: String,
  subject: String,
  body: String,
  variables: [String],
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Scheduled Email Schema
const ScheduledEmailSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  recipient: String,
  subject: String,
  body: String,
  scheduledFor: Date,
  status: { type: String, enum: ['scheduled', 'sent', 'failed'], default: 'scheduled' },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 },
  template: { type: Schema.Types.ObjectId, ref: 'EmailTemplate', required: false },
  smtpConfig: { type: Schema.Types.ObjectId, ref: 'SmtpConfig' },
  trackingId: { type: String, unique: true },
});

// Email Log Schema
const EmailLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  recipient: String,
  subject: String,
  status: { type: String, enum: ['sent', 'failed', 'scheduled'] },
  error: String,
  template: { type: Schema.Types.ObjectId, ref: 'EmailTemplate', required: false },
  smtpConfig: { type: Schema.Types.ObjectId, ref: 'SmtpConfig' },
  scheduledEmail: { type: Schema.Types.ObjectId, ref: 'ScheduledEmail', required: false },
  openedAt: Date,
  trackingId: { type: String, unique: true },
  retryCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const recipientSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email address']
  },
  name: {
    type: String
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

// Model exports
module.exports = {
  User: mongoose.model('User', UserSchema),
  Campaign: mongoose.model('Campaign', CampaignSchema),
  SmtpConfig: mongoose.model('SmtpConfig', SmtpConfigSchema),
  EmailTemplate: mongoose.model('EmailTemplate', EmailTemplateSchema),
  ScheduledEmail: mongoose.model('ScheduledEmail', ScheduledEmailSchema),
  EmailLog: mongoose.model('EmailLog', EmailLogSchema),
  Recipients: mongoose.model('Recipient', recipientSchema)
};
