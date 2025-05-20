require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Create DynamoDB service object
const dynamoDB = new AWS.DynamoDB.DocumentClient();
require('./scheduler');


app.use(cors({
  origin: 'http://localhost:5173', // or use '*' to allow all origins (not recommended for production)
  credentials: true // if you're sending cookies or Authorization headers
}));

app.use(express.json());

// Routes
const smtpRoutes = require('./routes/smtpRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const recipientRoutes = require('./routes/recipientRoutes');
const uniboxRoutes = require('./routes/uniboxRoutes');
const dnsRoutes = require('./routes/dnsRoutes');
const suppressionRoutes = require('./routes/suppressionRoutes');

// use routes
app.use(smtpRoutes);
app.use(recipientRoutes);
app.use(uniboxRoutes);
app.use(campaignRoutes);
app.use(dnsRoutes);
app.use(suppressionRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


