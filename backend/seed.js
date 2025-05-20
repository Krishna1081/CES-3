const AWS = require("aws-sdk");
require('dotenv').config();

AWS.config.update({ 
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "MailSpace";

const emails = [
  "test1@example.com",
  "spamuser@example.com",
  "noreply@example.org"
];

(async () => {
  for (const email of emails) {
    const item = {
      PK: `SUPPRESSION#${email}`,
      SK: "EMAIL",
      email: email
    };
    try {
      await docClient.put({ TableName: TABLE_NAME, Item: item }).promise();
      console.log(`Seeded: ${email}`);
    } catch (err) {
      console.error(`Error seeding ${email}`, err);
    }
  }
})();
