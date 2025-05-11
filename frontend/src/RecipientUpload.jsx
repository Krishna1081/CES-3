import React, { useState } from 'react';
import Papa from 'papaparse';
import { RiFileUploadLine } from "react-icons/ri";


const RecipientUpload = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'text/csv') {
      setCsvFile(file);
    } else {
      alert('Only CSV files are supported');
    }
  };

  const handleUploadClick = () => {
    if (!csvFile) return alert('No file selected');
    const formData = new FormData();
    formData.append('file', csvFile);

    fetch('http://localhost:5000/api/recipient/upload-csv', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(() => {
        alert('Upload successful!');
        setCsvFile(null);
      })
      .catch(err => {
        console.error(err);
        alert('Upload failed.');
      });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h2 className="text-3xl font-semibold mb-8 text-gray-800">Let’s import recipients!</h2>

      <div
        className={`w-full max-w-xl p-10 border-2 border-dashed rounded-xl bg-white shadow-sm transition-all 
          ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleFileDrop}
      >
        <div className="flex flex-col items-center text-center">
          <RiFileUploadLine  size={100}/>
          <p className="text-gray-700 font-medium">Drag and drop your file here</p>
          <p className="text-sm text-gray-500 mb-4">Support only for CSV files.</p>

          <input
          key={csvFile ? csvFile.name : 'new'}
            type="file"
            accept=".csv"
            id="csvInput"
            onChange={(e) => {
              setCsvFile(e.target.files[0])}}
            className="hidden"
          />
          <label
            htmlFor="csvInput"
            className="mt-2 inline-block bg-blue-600 text-white px-5 py-2 rounded-md cursor-pointer hover:bg-blue-700 transition"
          >
            Choose File
          </label>
        </div>
      </div>

      {csvFile && (
        <div className="mt-6 text-center">
          <p className="text-gray-800 font-medium">📄 File selected: {csvFile.name}</p>
          <button
            onClick={handleUploadClick}
            className="mt-3 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
          >
            Upload
          </button>
        </div>
      )}

      <p className="mt-8 text-sm text-gray-400">Fields are mapped on next step 🔁</p>
    </div>
  );
};

export default RecipientUpload;
