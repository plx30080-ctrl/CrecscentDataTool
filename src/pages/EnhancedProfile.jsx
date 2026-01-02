import React, { useState, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  AccountCircle,
  Email,
  Work,
  CameraAlt,
  Upload,
  Delete,
  Close
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { updateUserPhoto, deleteUserPhoto } from '../services/firestoreService';
import FixMyUserProfile from '../utils/FixMyUserProfile';
import logger from '../utils/logger';

const EnhancedProfile = () => {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }

      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setPhotoDialogOpen(true);
      setError('');
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) return;

    setLoading(true);
    setError('');

    try {
      const result = await updateUserPhoto(currentUser.uid, photoFile);

      if (result.success) {
        setSuccess('Profile photo updated successfully!');
        setPhotoDialogOpen(false);
        setPhotoFile(null);
        setPhotoPreview(null);

        // Refresh user profile to get updated photo
        if (refreshUserProfile) {
          await refreshUserProfile();
        }
      } else {
        setError(result.error || 'Failed to update photo');
      }
    } catch (err) {
      setError('An error occurred while uploading your photo');
      logger.error('Upload error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to delete your profile photo?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await deleteUserPhoto(currentUser.uid);

      if (result.success) {
        setSuccess('Profile photo deleted successfully!');

        // Refresh user profile to reflect deletion
        if (refreshUserProfile) {
          await refreshUserProfile();
        }
      } else {
        setError(result.error || 'Failed to delete photo');
      }
    } catch (err) {
      setError('An error occurred while deleting your photo');
      logger.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelUpload = () => {
    setPhotoDialogOpen(false);
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        My Profile
      </Typography>

      {/* Temporary fix tool - remove after fixing profile */}
      <FixMyUserProfile />

      {/* Debug info - remove this after fixing */}
      {import.meta.env.DEV && (
        <Alert severity="info" sx={{ marginBottom: 2 }}>
          <Typography variant="caption" component="pre" sx={{ fontSize: '0.7rem' }}>
            {JSON.stringify(userProfile, null, 2)}
          </Typography>
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ marginBottom: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ marginBottom: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper sx={{ padding: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 4 }}>
          <Box sx={{ position: 'relative', marginBottom: 2 }}>
            <Avatar
              src={userProfile?.photoURL}
              sx={{ width: 120, height: 120, bgcolor: 'primary.main', fontSize: '2.5rem' }}
            >
              {!userProfile?.photoURL && (userProfile?.displayName?.charAt(0) || 'U')}
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1, marginBottom: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={userProfile?.photoURL ? <CameraAlt /> : <Upload />}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              {userProfile?.photoURL ? 'Change Photo' : 'Upload Photo'}
            </Button>

            {userProfile?.photoURL && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<Delete />}
                onClick={handleDeletePhoto}
                disabled={loading}
              >
                Remove
              </Button>
            )}
          </Box>

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

      {/* Photo Upload Dialog */}
      <Dialog
        open={photoDialogOpen}
        onClose={handleCancelUpload}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upload Profile Photo
          <IconButton
            onClick={handleCancelUpload}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {photoPreview && (
            <Box sx={{ display: 'flex', justifyContent: 'center', padding: 3 }}>
              <img
                src={photoPreview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  borderRadius: '8px',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
          <Typography variant="body2" color="text.secondary" align="center">
            Make sure your face is clearly visible in the photo
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelUpload} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleUploadPhoto}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Upload />}
          >
            {loading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EnhancedProfile;
