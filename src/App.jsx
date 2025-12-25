import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DataEntry from './pages/DataEntry';
import Dashboard from './pages/EnhancedDashboard';
import Upload from './pages/Upload';
import ProfilePage from './pages/ProfilePage';
import ApplicantsPage from './pages/ApplicantsPage';
import ScorecardPage from './pages/ScorecardPage';

function App() {
  return (
    <BrowserRouter>
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
            <Route path="upload" element={<Upload />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
