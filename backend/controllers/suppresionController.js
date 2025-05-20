const AWS = require("aws-sdk");
require('dotenv').config()
AWS.config.update({ region: process.env.AWS_REGION});

const docClient = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = "MailSpace";

exports.getSuppressedEmails = async (req, res) => {
  try {
    const data = await docClient.scan({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :prefix)",
      ExpressionAttributeValues: { ":prefix": "SUPPRESSION#" }
    }).promise();

    // Map results to get emails only
    const emails = data.Items.map(item => item.email);
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.addEmailToSuppression = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    await docClient.put({
      TableName: TABLE_NAME,
      Item: {
        PK: `SUPPRESSION#${email}`,
        SK: 'EMAIL',
        email: email
      }
    }).promise();

    res.json({ message: `Suppressed: ${email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.removeEmailFromSuppression = async (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    await docClient.delete({
      TableName: TABLE_NAME,
      Key: {
        PK: `SUPPRESSION#${email}`,
        SK: "EMAIL"
      }
    }).promise();

    res.json({ message: `Unsubscribed: ${email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

