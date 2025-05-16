import React from 'react';

const RecipientTable = ({ recipients, onEdit, onDelete }) => {
  return (
    <table className="min-w-full bg-white border mt-4">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Name</th>
          <th className="p-2 text-left">Email</th>
          <th className="p-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody>
        {recipients.map((r, index) => (
          <tr key={index} className="border-t">
            <td className="p-2">{r.name}</td>
            <td className="p-2">{r.email}</td>
            <td className="p-2">
              <button onClick={() => onEdit(r)} className="text-blue-500 mr-2">Edit</button>
              <button onClick={() => onDelete(r.id)} className="text-red-500">Delete</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RecipientTable;
