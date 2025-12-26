import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Home from './pages/EnhancedHome';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DataEntry from './pages/EnhancedDataEntry';
import Dashboard from './pages/EnhancedDashboard';
import Upload from './pages/EnhancedUpload';
import ProfilePage from './pages/EnhancedProfile';
import ApplicantsPage from './pages/ApplicantsPage';
import ScorecardPage from './pages/ScorecardPage';
import BadgeManagement from './pages/BadgeManagement';
import AdminPanel from './pages/AdminPanel';
import DataDebug from './pages/DataDebug';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter basename="/CrecscentDataTool">
        <AuthProvider>
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
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="scorecard" element={<ScorecardPage />} />
            <Route path="applicants" element={<ApplicantsPage />} />
            <Route path="badges" element={<BadgeManagement />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="upload" element={<Upload />} />
            <Route path="debug" element={<DataDebug />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
