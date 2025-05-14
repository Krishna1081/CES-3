import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

export default function SmtpManager() {
  const { register, handleSubmit, reset, setValue } = useForm();
  const [smtpConfigs, setSmtpConfigs] = useState([]);
  const [editId, setEditId] = useState(null);
  const hostname = import.meta.env.VITE_API_HOSTNAME;

  const smtpRegex = /^([a-z0-9-]+\.)*(smtp\.gmail\.com|smtp\.outlook\.com|smtp\.yahoo\.com|smtpout\.secureserver\.net|mail\.zoho\.com|smtp\.office365\.com)$/i;
  const smtpEmails = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const fetchConfigs = async () => {
    const res = await fetch(`${hostname}api/smtp`);
    const data = await res.json();
    setSmtpConfigs(data);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const onSubmit = async (formData) => {
    const method = editId ? 'PUT' : 'POST';
    const url = editId
      ? `${hostname}api/smtp/${editId}`
      : `${hostname}api/smtp`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      reset();
      setEditId(null);
      fetchConfigs();
    } else {
      console.error('Failed to save config');
    }
  };

  const handleDelete = async (id) => {
    await fetch(`${hostname}api/smtp/${id}`, {
      method: 'DELETE',
    });
    fetchConfigs();
  };

  const handleEdit = (config) => {
    setEditId(config._id);
    for (let key in config) {
      if (key !== '_id' && key !== '__v') {
        setValue(key, config[key]);
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-center">SMTP Config Manager</h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-6 rounded-xl shadow mb-10"
      >
        <input
          className="border p-2 rounded-md"
          placeholder="Host"
          {...register('host', { required: true, pattern: smtpRegex })}
        />
        <input
          className="border p-2 rounded-md"
          type="number"
          placeholder="Port"
          {...register('port', { required: true })}
        />
        <input
          className="border p-2 rounded-md"
          placeholder="Email"
          {...register('email', { required: true, pattern: smtpEmails })}
        />
        <input
          className="border p-2 rounded-md"
          type="password"
          placeholder="Password"
          {...register('password', { required: true })}
        />
        <input
          className="border p-2 rounded-md"
          type="number"
          placeholder="Daily Limit"
          {...register('dailyLimit', { valueAsNumber: true })}
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {editId ? 'Update' : 'Create'}
          </button>
          {editId && (
            <button
              type="button"
              onClick={() => {
                reset();
                setEditId(null);
              }}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-xl overflow-hidden shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 font-semibold">Host</th>
              <th className="text-left p-3 font-semibold">Port</th>
              <th className="text-left p-3 font-semibold">Email</th>
              <th className="text-left p-3 font-semibold">Limit</th>
              <th className="text-left p-3 font-semibold">Sent</th>
              <th className="text-left p-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {smtpConfigs.map((cfg) => (
              <tr key={cfg._id} className="border-t hover:bg-gray-50">
                <td className="p-3">{cfg.host}</td>
                <td className="p-3">{cfg.port}</td>
                <td className="p-3">{cfg.email}</td>
                <td className="p-3">{cfg.dailyLimit}</td>
                <td className="p-3">{cfg.sentCount}</td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => handleEdit(cfg)}
                    className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cfg._id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {smtpConfigs.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center p-4 text-gray-500">
                  No SMTP configurations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
