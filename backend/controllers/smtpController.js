// const { SmtpConfig } = require('../schema');

// // Create a new SMTP config
// exports.createSmtp = async (req, res) => {
//   try {
//     const smtp = new SmtpConfig(req.body);
//     await smtp.save();
//     res.status(201).json(smtp);
//   } catch (err) {
//     console.error('Create SMTP error:', err);
//     res.status(500).json({ error: 'Failed to create SMTP config' });
//   }
// };

// // Get all SMTP configs
// exports.getAllSmtp = async (req, res) => {
//   try {
//     const smtpList = await SmtpConfig.find();
//     res.status(200).json(smtpList);
//   } catch (err) {
//     console.error('Get SMTPs error:', err);
//     res.status(500).json({ error: 'Failed to fetch SMTP configs' });
//   }
// };

// // Get a single SMTP config by ID
// exports.getSmtpById = async (req, res) => {
//   try {
//     const smtp = await SmtpConfig.findById(req.params.id);
//     if (!smtp) return res.status(404).json({ error: 'SMTP config not found' });
//     res.status(200).json(smtp);
//   } catch (err) {
//     console.error('Get SMTP error:', err);
//     res.status(500).json({ error: 'Failed to fetch SMTP config' });
//   }
// };

// // Update SMTP config
// exports.updateSmtp = async (req, res) => {
//   try {
//     const smtp = await SmtpConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!smtp) return res.status(404).json({ error: 'SMTP config not found' });
//     res.status(200).json(smtp);
//   } catch (err) {
//     console.error('Update SMTP error:', err);
//     res.status(500).json({ error: 'Failed to update SMTP config' });
//   }
// };

// // Delete SMTP config
// exports.deleteSmtp = async (req, res) => {
//   try {
//     const smtp = await SmtpConfig.findByIdAndDelete(req.params.id);
//     if (!smtp) return res.status(404).json({ error: 'SMTP config not found' });
//     res.status(200).json({ message: 'SMTP config deleted' });
//   } catch (err) {
//     console.error('Delete SMTP error:', err);
//     res.status(500).json({ error: 'Failed to delete SMTP config' });
//   }
// };

const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DB_NAME; // Change if your table has a different name
const ENTITY_TYPE = "SMTP";

// Create a new SMTP config
exports.createSmtp = async (req, res) => {
  const smtpId = uuidv4();
  const smtp = {
    PK: `SMTP#${smtpId}`,
    SK: "META",
    Type: ENTITY_TYPE,
    id: smtpId,
    ...req.body,
    sentCount: 0,
    createdAt: new Date().toISOString(),
  };

  const params = {
    TableName: TABLE_NAME,
    Item: smtp,
  };

  try {
    await dynamoDB.put(params).promise();
    res.status(201).json(smtp);
  } catch (err) {
    console.error("Create SMTP error:", err);
    res.status(500).json({ error: "Failed to create SMTP config" });
  }
};

// Get all SMTP configs (filter by Type if using scan)
exports.getAllSmtp = async (req, res) => {
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: "#type = :type",
    ExpressionAttributeNames: { "#type": "Type" },
    ExpressionAttributeValues: { ":type": ENTITY_TYPE },
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    res.status(200).json(data.Items);
  } catch (err) {
    console.error("Get SMTPs error:", err);
    res.status(500).json({ error: "Failed to fetch SMTP configs" });
  }
};

// Get a single SMTP config by ID
exports.getSmtpById = async (req, res) => {
  const id = req.params.id;
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `SMTP#${id}`,
      SK: "META",
    },
  };

  try {
    const data = await dynamoDB.get(params).promise();
    if (!data.Item)
      return res.status(404).json({ error: "SMTP config not found" });
    res.status(200).json(data.Item);
  } catch (err) {
    console.error("Get SMTP error:", err);
    res.status(500).json({ error: "Failed to fetch SMTP config" });
  }
};

// Update SMTP config
exports.updateSmtp = async (req, res) => {
  const { id } = req.params;

  // Remove PK and SK from update fields to avoid trying to update keys
  const allowedUpdates = Object.entries(req.body).filter(
    ([key]) => key !== "PK" && key !== "SK"
  );

  if (allowedUpdates.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const updateExpression =
    "set " +
    allowedUpdates.map(([key], idx) => `#${key} = :val${idx}`).join(", ");
  const expressionAttributeValues = allowedUpdates.reduce(
    (acc, [key, val], idx) => {
      acc[`:val${idx}`] = val;
      return acc;
    },
    {}
  );
  const expressionAttributeNames = allowedUpdates.reduce((acc, [key], idx) => {
    acc[`#${key}`] = key;
    return acc;
  }, {});

  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `SMTP#${id}`,
      SK: "META",
    },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    ExpressionAttributeNames: expressionAttributeNames,
    ReturnValues: "ALL_NEW",
  };

  try {
    const result = await dynamoDB.update(params).promise();
    res.status(200).json(result.Attributes);
  } catch (err) {
    console.error("Update SMTP error:", err);
    res.status(500).json({ error: "Failed to update SMTP config" });
  }
};

// Delete SMTP config
exports.deleteSmtp = async (req, res) => {
  const id = req.params.id;
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `SMTP#${id}`,
      SK: "META",
    },
  };

  try {
    await dynamoDB.delete(params).promise();
    res.status(200).json({ message: "SMTP config deleted" });
  } catch (err) {
    console.error("Delete SMTP error:", err);
    res.status(500).json({ error: "Failed to delete SMTP config" });
  }
};
