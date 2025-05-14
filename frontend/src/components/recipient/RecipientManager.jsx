import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RecipientForm from './RecipientForm';
import RecipientTable from './RecipientTable';

const RecipientManager = () => {
  const [recipients, setRecipients] = useState([]);
  const [editing, setEditing] = useState(null);
   const hostname = import.meta.env.VITE_API_HOSTNAME;

  const fetchRecipients = async () => {
    const res = await axios.get(`${hostname}api/recipient/getRecipients`);
    setRecipients(res.data);
  };

  const handleSubmit = async (data) => {
    if (editing) {
      await axios.put(`${hostname}api/recipient/updateRecipient/${editing._id}`, data);
    } else {
      await axios.post(`${hostname}api/recipient/createRecipient`, data);
    }
    fetchRecipients();
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await axios.delete(`${hostname}api/recipient/deleteRecipient/${id}`);
    fetchRecipients();
  };

  useEffect(() => {
    fetchRecipients();
  }, []);

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <RecipientForm onSubmit={handleSubmit} defaultValues={editing || {}} />
      <RecipientTable recipients={recipients} onEdit={setEditing} onDelete={handleDelete} />
    </div>
  );
};

export default RecipientManager;
