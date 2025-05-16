const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = 'MailSpace';

exports.fetchReplies = async (email) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `REPLY#${email}`,
        ':sk': 'TIMESTAMP#',
      },
    };

    const data = await dynamoDB.query(params).promise();

    const replies = (data.Items || []).map(item => ({
      from: item.from || '',
      subject: item.subject || '',
      date: item.date || '',
      body: item.body || '',
      isReply: !!item.inReplyTo,
    }));

    // Optional: Sort by latest
    replies.sort((a, b) => new Date(b.date) - new Date(a.date));

    return replies;
  } catch (err) {
    console.error('🛑 fetchRepliesFromDB error:', err);
    throw new Error('Failed to fetch replies from DynamoDB');
  }
};
