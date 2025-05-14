const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

exports.fetchReplies = async ({ email, password, host, port }) => {
  const config = {
    imap: {
      user: email,
      password,
      host,
      port,
      tls: true,
      authTimeout: 10000,
    },
  };

  const connection = await imaps.connect(config);
  await connection.openBox('INBOX');

  const searchCriteria = ['ALL'];

  const fetchOptions = {
    bodies: [''],
    markSeen: false,
  };

  const messages = await connection.search(searchCriteria, fetchOptions);

  const replies = [];

  for (const item of messages) {
    const allParts = item.parts.find(part => part.which === '');

    if (!allParts || !allParts.body) continue;

    try {
      const parsed = await simpleParser(allParts.body);

      replies.push({
        from: parsed.from?.text || '',
        subject: parsed.subject || '',
        date: parsed.date || '',
        body: parsed.text || '',
        isReply: !!parsed.inReplyTo,
      });
    } catch (err) {
      console.error('Failed to parse message:', err.message);
    }
  }

  // Sort replies by date descending (most recent first)
  replies.sort((a, b) => new Date(b.date) - new Date(a.date));

  await connection.end();
  return replies;
};
