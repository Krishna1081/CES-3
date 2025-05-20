import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import MainLayout from "./components/layouts/MainLayout";
import CampaignPage from "./components/campaign/CampaignManager";
import SmtpManager from "./components/smtp/SmtpManager";
import RecipientUpload from "./components/recipient/RecipientUpload";
import RecipientManager from "./components/recipient/RecipientManager";
import DnsCheck from "./components/dns/dnsCheck";
import Unibox from "./components/Unibox";
import SuppressionList from "./components/suppression/SuppressionList";
import Unsubscribe from "./components/unsubscribe/Unsubscribe";

import "./styles/App.css";

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Unsubscribe route with no layout */}
        <Route path="/unsubscribe" element={<Unsubscribe />} />

        {/* App layout routes */}
        <Route
          path="/*"
          element={
            <MainLayout>
              <Routes>
                <Route path="smtp" element={<SmtpManager />} />
                <Route path="campaigns" element={<CampaignPage />} />
                <Route path="upload-recipients" element={<RecipientUpload />} />
                <Route path="recipients" element={<RecipientManager />} />
                <Route path="unibox" element={<Unibox />} />
                <Route path="dns-check" element={<DnsCheck />} />
                <Route path="suppression-list" element={<SuppressionList />} />
              </Routes>
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
