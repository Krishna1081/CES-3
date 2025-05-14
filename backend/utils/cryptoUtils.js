const crypto = require('crypto');
const dotenv = require('dotenv')

const algorithm = 'aes-256-cbc';
const secretKey = process.env.SMTP_SECRET_KEY || 'a_secure_random_key_32bytes!!'; // must be 32 bytes
const iv = crypto.randomBytes(16);

exports.encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

exports.decrypt = (text) => {
  const [ivStr, encryptedText] = text.split(':');
  const iv = Buffer.from(ivStr, 'hex');
  const encrypted = Buffer.from(encryptedText, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
