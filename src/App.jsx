
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  const { currentUser } = useAuth();

  return (
    <>
      <CssBaseline />
      <Navbar user={currentUser} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={currentUser ? <Navigate to="/profile" /> : <LoginPage />} />
        <Route path="/register" element={currentUser ? <Navigate to="/profile" /> : <RegisterPage />} />
        <Route path="/profile" element={currentUser ? <ProfilePage /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;
