const dns = require('dns').promises;

// Get SPF
async function getSPF(domain) {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.map(r => r.join(''));
    const spf = flat.find(r => r.startsWith('v=spf1'));
    return spf ? { status: 'OK', value: spf } : { status: 'Not Found' };
  } catch (e) {
    return { status: 'Error', error: e.message };
  }
}

// Get DKIM (default selector unless provided)
async function getDKIM(domain, selector = 'default') {
  const dkimHost = `${selector}._domainkey.${domain}`;
  try {
    const records = await dns.resolveTxt(dkimHost);
    const flat = records.map(r => r.join(''));
    return { status: 'OK', value: flat.join('') };
  } catch (e) {
    return { status: 'Not Found' };
  }
}

// Get DMARC
async function getDMARC(domain) {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const flat = records.map(r => r.join(''));
    const dmarc = flat.find(r => r.startsWith('v=DMARC1'));
    return dmarc ? { status: 'OK', value: dmarc } : { status: 'Not Found' };
  } catch (e) {
    return { status: 'Error', error: e.message };
  }
}

// Get MX
async function getMX(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return records.length > 0 ? { status: 'OK', value: records } : { status: 'None Found' };
  } catch (e) {
    return { status: 'Error', error: e.message };
  }
}

// Main handler
exports.checkDomainDNS = async (req, res) => {
  const { domain, selector } = req.query;
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  try {
    const [spf, dkim, dmarc, mx] = await Promise.all([
      getSPF(domain),
      getDKIM(domain, selector || 'default'),
      getDMARC(domain),
      getMX(domain),
    ]);

    res.json({ domain, spf, dkim, dmarc, mx });
  } catch (error) {
    res.status(500).json({ error: 'Error checking DNS records', details: error.message });
  }
};
