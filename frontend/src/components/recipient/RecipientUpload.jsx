// import React, { useState } from 'react';
// import Papa from 'papaparse';
// import { RiFileUploadLine } from "react-icons/ri";


// const RecipientUpload = () => {
//   const [csvFile, setCsvFile] = useState(null);
//   const [dragOver, setDragOver] = useState(false);

//   const handleFileDrop = (e) => {
//     e.preventDefault();
//     setDragOver(false);
//     const file = e.dataTransfer.files[0];
//     if (file?.type === 'text/csv') {
//       setCsvFile(file);
//     } else {
//       alert('Only CSV files are supported');
//     }
//   };

//   const handleUploadClick = () => {
//     if (!csvFile) return alert('No file selected');
//     const formData = new FormData();
//     formData.append('file', csvFile);

//     fetch('http://localhost:5000/api/recipient/upload-csv', {
//       method: 'POST',
//       body: formData
//     })
//       .then(res => res.json())
//       .then(() => {
//         alert('Upload successful!');
//         setCsvFile(null);
//       })
//       .catch(err => {
//         console.error(err);
//         alert('Upload failed.');
//       });
//   };

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
//       <h2 className="text-3xl font-semibold mb-8 text-gray-800">Let’s import recipients!</h2>

//       <div
//         className={`w-full max-w-xl p-10 border-2 border-dashed rounded-xl bg-white shadow-sm transition-all 
//           ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
//         onDragOver={(e) => {
//           e.preventDefault();
//           setDragOver(true);
//         }}
//         onDragLeave={() => setDragOver(false)}
//         onDrop={handleFileDrop}
//       >
//         <div className="flex flex-col items-center text-center">
//           <RiFileUploadLine  size={100}/>
//           <p className="text-gray-700 font-medium">Drag and drop your file here</p>
//           <p className="text-sm text-gray-500 mb-4">Support only for CSV files.</p>

//           <input
//           key={csvFile ? csvFile.name : 'new'}
//             type="file"
//             accept=".csv"
//             id="csvInput"
//             onChange={(e) => {
//               setCsvFile(e.target.files[0])}}
//             className="hidden"
//           />
//           <label
//             htmlFor="csvInput"
//             className="mt-2 inline-block bg-blue-600 text-white px-5 py-2 rounded-md cursor-pointer hover:bg-blue-700 transition"
//           >
//             Choose File
//           </label>
//         </div>
//       </div>

//       {csvFile && (
//         <div className="mt-6 text-center">
//           <p className="text-gray-800 font-medium">📄 File selected: {csvFile.name}</p>
//           <button
//             onClick={handleUploadClick}
//             className="mt-3 bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition"
//           >
//             Upload
//           </button>
//         </div>
//       )}

//       <p className="mt-8 text-sm text-gray-400">Fields are mapped on next step 🔁</p>
//     </div>
//   );
// };

// export default RecipientUpload;
import React, { useState } from 'react';
import Papa from 'papaparse';
import { RiFileUploadLine } from "react-icons/ri";

const RecipientUpload = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [parsedData, setParsedData] = useState([]); // NEW: parsed CSV rows
  const [headers, setHeaders] = useState([]); // NEW: store CSV headers
  const [dragOver, setDragOver] = useState(false);
  const validRowCount = parsedData.filter(row => row._rowStatus === 'valid').length;
  const [inferredNameCount, setInferredNameCount] = useState(0);


  const parseCSV = (file) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          const raw = results.data;
          const requiredField = 'email';

          const validRows = [];
          const invalidRows = [];
          let inferredNamesCount = 0;

          raw.forEach((row) => {
            const email = row[requiredField]?.trim();
            const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

            if (email && isValidEmail) {
              let name = row.name?.trim();

              // Infer name from email if missing
              if (!name) {
                const inferred = email.split('@')[0];
                name = inferred.charAt(0).toUpperCase() + inferred.slice(1);
                row.name = name;
                inferredNamesCount++;
              }

              validRows.push({ ...row, _rowStatus: 'valid' });
            } else {
              invalidRows.push({ ...row, _rowStatus: 'invalid' });
            }
          });

          const allRows = [...validRows, ...invalidRows];
          setParsedData(allRows);
          setHeaders(results.meta.fields);
          setInferredNameCount(inferredNamesCount); // NEW state
        },
      });
    };



  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'text/csv') {
      setCsvFile(file);
      parseCSV(file); // NEW
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
        setParsedData([]); // reset preview
        setHeaders([]);
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
          <RiFileUploadLine size={100} />
          <p className="text-gray-700 font-medium">Drag and drop your file here</p>
          <p className="text-sm text-gray-500 mb-4">Support only for CSV files.</p>

          <input
            key={csvFile ? csvFile.name : 'new'}
            type="file"
            accept=".csv"
            id="csvInput"
            onChange={(e) => {
              setCsvFile(e.target.files[0]);
              parseCSV(e.target.files[0]); // NEW
            }}
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
              className={`mt-3 px-6 py-2 rounded transition text-white ${
                validRowCount === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
              disabled={validRowCount === 0}
            >
              Upload
          </button>
        </div>
      )}

      {parsedData.length > 0 && (
        <div className="mt-10 w-full max-w-4xl overflow-auto">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">📋 Preview:</h3>
          <table className="w-full table-auto border border-gray-300 shadow">
            <thead>
              <tr className="bg-gray-100">
                {headers.map((header, index) => (
                  <th key={index} className="px-4 py-2 border">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedData.slice(0, 10).map((row, i) => (
                <tr key={i} className={row._rowStatus === 'invalid' ? 'bg-red-100' : ''}>
                  {headers.map((header, j) => (
                    <td key={j} className="px-4 py-2 border text-sm text-gray-700">
                      {row[header]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-gray-400">
            Showing first {parsedData.slice(0, 10).length} rows
          </p>
          {parsedData.some(row => row._rowStatus === 'invalid') && (
            <p className="text-sm text-red-600 mt-2">Some rows are invalid and will be ignored.</p>
          )}
          {inferredNameCount > 0 && (
            <p className="text-sm text-blue-600 mt-1">
              ✨ Inferred <strong>{inferredNameCount}</strong> missing names from email addresses.
            </p>
          )}
        </div>
      )}

    </div>
  );
};

export default RecipientUpload;
