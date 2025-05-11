const mongoose = require('mongoose');
const { SmtpConfig } = require('./schema');
require('dotenv').config();

// Connect to MongoDB using environment variable
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('Connected to MongoDB');

  try {
    // Check if config already exists
    const existingConfig = await SmtpConfig.findOne({ email: 'rahul@quickintell.online' });
    if (existingConfig) {
      console.log('SMTP config already exists');
      return mongoose.disconnect();
    }

    // Insert sample config
    const config = new SmtpConfig({
      host: 'smtpout.secureserver.net',
      port: 465,
      email: 'rahul@quickintell.online',
      password: '6ih8W$KNtY3fLWA',
    });

    await config.save();
    console.log('SMTP config saved successfully');
  } catch (error) {
    console.error('Error saving SMTP config:', error);
  } finally {
    mongoose.disconnect();
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});
