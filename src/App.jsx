import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { NotificationProvider } from './contexts/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Home from './pages/EnhancedHome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DataEntry from './pages/DataEntry';
import UnifiedDashboard from './pages/UnifiedDashboard';
import Upload from './pages/EnhancedUpload';
import ProfilePage from './pages/EnhancedProfile';
import ApplicantsPage from './pages/ApplicantsPage';
import ScorecardPage from './pages/ScorecardPage';
import BadgeManagement from './pages/BadgeManagement';
import AdminPanel from './pages/AdminPanel';
import DataDebug from './pages/DataDebug';
import EarlyLeavesPage from './pages/EarlyLeavesPage';
import DNRManagement from './pages/DNRManagement';
import DataBackup from './pages/DataBackup';
import BulkHistoricalImport from './pages/BulkHistoricalImport';
import DataCleaner from './pages/DataCleaner';
import AdminBulkUpload from './pages/AdminBulkUpload';
import BadgePhotoUpload from './pages/BadgePhotoUpload';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/CrecscentDataTool">
        <AuthProvider>
          <NotificationProvider>
            <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="data-entry" element={<DataEntry />} />
            <Route path="analytics" element={<UnifiedDashboard />} />
            <Route path="scorecard" element={<ScorecardPage />} />
            <Route path="applicants" element={<ApplicantsPage />} />
            <Route path="badges" element={<BadgeManagement />} />
            <Route path="early-leaves" element={<EarlyLeavesPage />} />
            <Route path="dnr" element={<DNRManagement />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="upload" element={<Upload />} />
            <Route path="bulk-import" element={<BulkHistoricalImport />} />
            <Route path="admin-bulk-upload" element={<AdminBulkUpload />} />
            <Route path="badge-photo-upload" element={<BadgePhotoUpload />} />
            <Route path="backup" element={<DataBackup />} />
            <Route path="clear-data" element={<DataCleaner />} />
            <Route path="debug" element={<DataDebug />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          </Routes>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
