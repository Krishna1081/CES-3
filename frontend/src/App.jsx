  import React from 'react'
  import Navbar from './Navbar'
  import CampaignPage from './CampaignManager'
  import SmtpManager from './SmtpManager'
  import RecipientUpload from './RecipientUpload'
  import RecipientManager from './RecipientManager'
  import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


  const App = () => {
    return (
      <Router>
      <Navbar />
      <div className="p-6">
        <Routes>
          <Route path="/smtp" element={<SmtpManager />} />
          <Route path="/campaigns" element={<CampaignPage />} />
          <Route path="/upload-recipients" element={<RecipientUpload />} />
          <Route path="/recipients" element={<RecipientManager />} />
          {/* Add login route, etc. */}
        </Routes>
      </div>
    </Router>
    )
  }

  export default App