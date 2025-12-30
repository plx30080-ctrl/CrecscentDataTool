import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';

const PrivateRoute = ({ children, requiredRoles = null }) => {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Check role requirements
  if (requiredRoles && userProfile) {
    const hasRequiredRole = Array.isArray(requiredRoles)
      ? requiredRoles.includes(userProfile.role)
      : userProfile.role === requiredRoles;

    if (!hasRequiredRole) {
      return <Navigate to="/" />;
    }
  }

  return children;
};

export default PrivateRoute;
