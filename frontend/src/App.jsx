import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/common/Navbar';
import Sidebar from './components/common/Sidebar'; // ✅ Correct import
import CampaignPage from './components/campaign/CampaignManager';
import SmtpManager from './components/smtp/SmtpManager';
import RecipientUpload from './components/recipient/RecipientUpload';
import RecipientManager from './components/recipient/RecipientManager';
import Unibox from './components/Unibox';

import './styles/App.css';

const App = () => {
  return (
    <Router>
      <div className="flex">
        <Sidebar />
        <div className="p-6 flex-1">
          <Routes>
            <Route path="/smtp" element={<SmtpManager />} />
            <Route path="/campaigns" element={<CampaignPage />} />
            <Route path="/upload-recipients" element={<RecipientUpload />} />
            <Route path="/recipients" element={<RecipientManager />} />
            <Route path="/unibox" element={<Unibox />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
