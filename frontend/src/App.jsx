  import React from 'react'
  import Navbar from './components/common/Navbar'
  import CampaignPage from './components/campaign/CampaignManager'
  import SmtpManager from './components/smtp/SmtpManager'
  import RecipientUpload from './components/recipient/RecipientUpload'
  import RecipientManager from './components/recipient/RecipientManager'
  import Unibox from './components/Unibox';
  import './styles/App.css'
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
          <Route path='/unibox' element={<Unibox/>}/>
          {/* Add login route, etc. */}
        </Routes>
      </div>
    </Router>
    )
  }

  export default App