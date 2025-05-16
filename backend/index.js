// const express = require('express');
// const cors = require('cors');
// const connectDB = require('./connectDB'); // DynamoDB via Dynamoose
// const app = express();
// const port = 5000;

// // Routes
// const usersRouter = require('./routes/usersRouter');
// const sendEmailRouter = require('./routes/sendEmailRouter');
// const campaignRoutes = require('./routes/campaignRoutes');
// const smtpRoutes = require('./routes/smtpRoutes');
// const recipientRoutes = require('./routes/recipientRoutes');
// const uniboxRoutes = require('./routes/uniboxRoutes');

// // Scheduler
// require('./scheduler'); // Start the cron job

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Connect to DynamoDB first
// (async () => {
//   await connectDB();

//   // Routes after DB is ready
//   app.use(usersRouter);
//   app.use(sendEmailRouter);
//   app.use(campaignRoutes);
//   app.use(smtpRoutes);
//   app.use(recipientRoutes);
//   app.use(uniboxRoutes);

//   // Start server
//   app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
//   });
// })();

// server.js
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


// use routes
app.use(smtpRoutes);
app.use(recipientRoutes);
app.use(uniboxRoutes);
app.use(campaignRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


