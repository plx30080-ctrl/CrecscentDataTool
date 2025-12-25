import React, { useState } from 'react';
import { Container, Typography, Paper, Box, TextField, Button, Alert, Avatar, Chip } from '@mui/material';
import { AccountCircle, Email, Work } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthProvider';

const EnhancedProfile = () => {
  const { currentUser, userProfile } = useAuth();
  const [success, setSuccess] = useState('');

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>

      {success && (
        <Alert severity="success" sx={{ marginBottom: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ padding: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 4 }}>
          <Avatar sx={{ width: 100, height: 100, marginBottom: 2, bgcolor: 'primary.main', fontSize: '2.5rem' }}>
            {userProfile?.displayName?.charAt(0) || 'U'}
          </Avatar>
          <Typography variant="h5">{userProfile?.displayName || 'User'}</Typography>
          <Chip label={userProfile?.role || 'User'} color="primary" sx={{ marginTop: 1 }} />
        </Box>

        <Box sx={{ marginTop: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
            <Email sx={{ marginRight: 2, color: 'text.secondary' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Email Address</Typography>
              <Typography variant="body1">{currentUser?.email}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
            <AccountCircle sx={{ marginRight: 2, color: 'text.secondary' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">User ID</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                {currentUser?.uid}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
            <Work sx={{ marginRight: 2, color: 'text.secondary' }} />
            <Box>
              <Typography variant="caption" color="text.secondary">Role</Typography>
              <Typography variant="body1">{userProfile?.role || 'Not assigned'}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Member Since</Typography>
              <Typography variant="body1">
                {currentUser?.metadata?.creationTime
                  ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
                  : 'Unknown'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ marginTop: 4, padding: 3, background: '#f5f5f5', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>Account Information</Typography>
          <Typography variant="body2" color="text.secondary">
            To update your role or account settings, please contact your administrator.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default EnhancedProfile;
