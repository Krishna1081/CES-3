const express = require('express');
const cors = require('cors');
const connectDB = require('./db');
const app = express();
const port = 5000;

const usersRouter = require('./routes/usersRouter');
const sendEmailRouter = require('./routes/sendEmailRouter');
const campaignRoutes = require('./routes/campaignRoutes');
const smtpRoutes = require('./routes/smtpRoutes');
const recipientRoutes = require('./routes/recipientRoutes');
const uniboxRoutes = require('./routes/uniboxRoutes');


require('./scheduler'); // Start the cron job

// Middleware
app.use(cors());
app.use(express.json());

connectDB();

app.use(usersRouter);
app.use(sendEmailRouter);
app.use(campaignRoutes);
app.use(smtpRoutes);
app.use(recipientRoutes);
app.use(recipientRoutes);
app.use(uniboxRoutes);



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
