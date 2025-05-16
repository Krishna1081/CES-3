// const csv = require('csv-parser');
// const {Recipients} = require('../schema');
// const { Readable } = require('stream');

// exports.uploadRecipientsCSV = async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: 'No file uploaded' });
//   }

//   const results = [];
//   const stream = Readable.from(req.file.buffer);

//   stream
//     .pipe(csv())
//     .on('data', (data) => {
//       if (data.email && /^\S+@\S+\.\S+$/.test(data.email)) {
//         results.push({
//           email: data.email,
//           name: data.name || ''
//         });
//       }
//     })
//     .on('end', async () => {
//       try {
//         // Insert unique recipients (skip duplicates)
//         const operations = results.map((entry) => ({
//           updateOne: {
//             filter: { email: entry.email },
//             update: { $setOnInsert: entry },
//             upsert: true
//           }
//         }));

//         await Recipients.bulkWrite(operations);
//         res.status(200).json({ message: 'Recipients uploaded successfully', count: results.length });
//       } catch (error) {
//         console.error('Upload Error:', error);
//         res.status(500).json({ error: 'Failed to save recipients' });
//       }
//     });
// };

// // Get all recipient emails
// exports.getAllRecipientEmails = async (req, res) => {
//   try {
//     const recipients = await Recipients.find({}, 'email').lean(); // Only fetch email field
//     const emails = recipients.map(r => r.email);
//     res.status(200).json({ emails });
//   } catch (error) {
//     console.error('Error fetching recipients:', error);
//     res.status(500).json({ error: 'Failed to fetch recipient emails' });
//   }
// };

// // Get all recipients with name, email, id, etc.
// exports.getRecipients = async (req, res) => {
//   try {
//     const recipients = await Recipients.find();
//     res.json(recipients);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Create recipient
// exports.createRecipient = async (req, res) => {
//   try {
//     const recipient = new Recipients(req.body);
//     await recipient.save();
//     res.status(201).json(recipient);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

// // Get a recipient by ID
// exports.getRecipientById = async (req, res) => {
//   try {
//     const recipient = await Recipients.findById(req.params.id);
//     if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
//     res.json(recipient);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // Update recipient
// exports.updateRecipient = async (req, res) => {
//   try {
//     const recipient = await Recipients.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
//     res.json(recipient);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// };

// // Delete recipient
// exports.deleteRecipient = async (req, res) => {
//   try {
//     const recipient = await Recipients.findByIdAndDelete(req.params.id);
//     if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
//     res.json({ message: 'Recipient deleted' });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

const AWS = require('aws-sdk');
const { Readable } = require('stream');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'MailSpace'; // Replace with your table name

// Upload CSV of recipients
exports.uploadRecipientsCSV = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  const seenEmails = new Set();
  const stream = Readable.from(req.file.buffer);

  stream
    .pipe(csv())
    .on('data', (data) => {
      const email = data.email?.trim().toLowerCase(); // normalize
      if (email && /^\S+@\S+\.\S+$/.test(email) && !seenEmails.has(email)) {
        seenEmails.add(email);
        results.push({
          PK: `RECIPIENT#${email}`, // normalized PK
          SK: 'PROFILE',
          email,
          name: data.name || '',
          id: uuidv4(),
        });
      }
    })
    .on('end', async () => {
      try {
        let insertedCount = 0;

        const putPromises = results.map(item =>
          dynamoDB.put({
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: 'attribute_not_exists(PK)', // skip if exists
          }).promise()
            .then(() => insertedCount++)
            .catch(err => {
              if (err.code !== 'ConditionalCheckFailedException') throw err;
            })
        );

        await Promise.all(putPromises);

        res.status(200).json({
          message: 'Recipients uploaded successfully',
          processed: results.length,
          inserted: insertedCount,
          skippedDuplicates: results.length - insertedCount
        });

      } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to save recipients' });
      }
    });
};


// Get all recipient emails
exports.getAllRecipientEmails = async (req, res) => {
  try {
    const result = await dynamoDB.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: { ':pk': 'RECIPIENT#' },
      ProjectionExpression: 'email',
    }).promise();

    const emails = result.Items.map(r => r.email);
    res.status(200).json({ emails });
  } catch (error) {
    console.error('Error fetching recipients:', error);
    res.status(500).json({ error: 'Failed to fetch recipient emails' });
  }
};

// Get all recipients
exports.getRecipients = async (req, res) => {
  try {
    const result = await dynamoDB.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: { ':pk': 'RECIPIENT#' },
    }).promise();

    res.status(200).json(result.Items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create recipient
exports.createRecipient = async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid or missing email' });
    }

    const item = {
      PK: `RECIPIENT#${email}`,
      SK: 'PROFILE',
      email,
      name: name || '',
      id: uuidv4(),
    };

    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    }).promise();

    res.status(201).json(item);
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      res.status(400).json({ error: 'Recipient already exists' });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
};

// Get a recipient by ID (requires GSI or storing ID in PK/SK — here we assume it's in an attribute)
exports.getRecipientById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await dynamoDB.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk) AND id = :id',
      ExpressionAttributeValues: {
        ':pk': 'RECIPIENT#',
        ':id': id,
      },
    }).promise();

    if (!result.Items.length) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    res.json(result.Items[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update recipient
exports.updateRecipient = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Find by scan (assuming you use `id` as attribute, not PK)
    const result = await dynamoDB.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk) AND id = :id',
      ExpressionAttributeValues: {
        ':pk': 'RECIPIENT#',
        ':id': id,
      },
    }).promise();

    if (!result.Items.length) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const recipient = result.Items[0];

    // Update
    await dynamoDB.update({
      TableName: TABLE_NAME,
      Key: { PK: recipient.PK, SK: 'PROFILE' },
      UpdateExpression: 'SET #name = :name',
      ExpressionAttributeNames: { '#name': 'name' },
      ExpressionAttributeValues: { ':name': name },
      ReturnValues: 'ALL_NEW',
    }).promise();

    res.json({ message: 'Recipient updated' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete recipient
exports.deleteRecipient = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await dynamoDB.scan({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(PK, :pk) AND id = :id',
      ExpressionAttributeValues: {
        ':pk': 'RECIPIENT#',
        ':id': id,
      },
    }).promise();

    if (!result.Items.length) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const recipient = result.Items[0];

    await dynamoDB.delete({
      TableName: TABLE_NAME,
      Key: { PK: recipient.PK, SK: 'PROFILE' },
    }).promise();

    res.json({ message: 'Recipient deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
