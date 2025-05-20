import React, { useState } from 'react';
import axios from 'axios';

const Badge = ({ status }) => {
  const color = {
    OK: 'bg-green-100 text-green-800',
    'Not Found': 'bg-red-100 text-red-800',
    Error: 'bg-yellow-100 text-yellow-800',
    'None Found': 'bg-gray-200 text-gray-800',
  }[status] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 py-1 rounded text-sm font-medium ${color}`}>
      {status}
    </span>
  );
};
const hostname = import.meta.env.VITE_API_HOSTNAME
const RecordSection = ({ title, result }) => {
  if (!result) return null;

  return (
    <div className="bg-white border rounded p-4 shadow-sm">
      <h4 className="font-semibold text-lg mb-1">{title}</h4>
      <Badge status={result.status} />
      {result.value && typeof result.value === 'string' && (
        <div className="mt-1 text-sm text-gray-700 break-words">{result.value}</div>
      )}
      {Array.isArray(result.value) && (
        <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
          {result.value.map((mx, i) => (
            <li key={i}>
              {mx.exchange} <span className="text-gray-500">(priority {mx.priority})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const DnsCheck = () => {
  const [domain, setDomain] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (!domain) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await axios.get(`${hostname}api/dns-check?domain=${domain}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
      setResults({ error: '❌ Failed to fetch DNS records' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-6 border rounded shadow bg-gray-50">
      <h2 className="text-2xl font-semibold mb-4">🔍 Domain DNS Checker</h2>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter domain (e.g. example.com)"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          className="flex-1 border px-3 py-2 rounded"
        />

        <button
          onClick={handleCheck}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>

      {results && (
        <div className="mt-6 space-y-4">
          {results.error ? (
            <div className="text-red-600">{results.error}</div>
          ) : (
            <>
              <RecordSection title="✅ SPF" result={results.spf} />
              <RecordSection title="🔒 DKIM" result={results.dkim} />
              <RecordSection title="📜 DMARC" result={results.dmarc} />
              <RecordSection title="📬 MX Records" result={results.mx} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DnsCheck;
