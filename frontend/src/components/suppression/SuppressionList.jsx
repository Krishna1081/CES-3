import React, { useState, useEffect } from 'react';
import axios from 'axios';

const hostname = import.meta.env.VITE_API_HOSTNAME; // your backend URL

function SuppressionList() {
  const [emails, setEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [message, setMessage] = useState('');

  // Fetch suppressed emails
  const fetchEmails = async () => {
    try {
      const res = await axios.get(`${hostname}api/suppression`);
      setEmails(res.data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load suppressed emails.');
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  // Add email to suppression list
  const addEmail = async () => {
    if (!newEmail) return setMessage('Please enter an email to suppress.');
    try {
      await axios.post(`${hostname}api/suppression`, { email: newEmail });
      setMessage(`Suppressed: ${newEmail}`);
      setNewEmail('');
      fetchEmails();
    } catch (err) {
      setMessage('Error suppressing email.', err);
    }
  };

  // Remove email from suppression list
  const removeEmail = async (email) => {
    try {
      await axios.delete(`${hostname}api/suppression/${email}`);
      setMessage(`Unsubscribed: ${email}`);
      fetchEmails();
    } catch (err) {
      setMessage('Error unsubscribing email.', err);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 font-sans">
      <h2 className="text-3xl font-bold mb-6 text-center">Suppressed Emails</h2>

      {message && <h3 className="mb-4 text-center text-red-600">{message}</h3>}

      <ul className="mb-6 space-y-2">
        {emails.length > 0 && emails.map((item, key) => (
          <li 
            key={key} 
            className="flex justify-between items-center border rounded p-3 bg-gray-50"
          >
            <span className="break-all">{item}</span>
            <button
              onClick={() => removeEmail(item)}
              className="ml-4 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded transition"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <hr className="my-6" />

      <section className="mb-6">
        <h3 className="text-xl font-semibold mb-3">Add Email to Suppression</h3>
        <div className="flex gap-3">
          <input
            type="email"
            placeholder="Email to suppress"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-grow border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addEmail}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded transition"
          >
            Suppress
          </button>
        </div>
      </section>

      <hr className="my-6" />
    </div>
  );
}

export default SuppressionList;
