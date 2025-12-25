import React, { useState } from 'react';
import { Button, Paper, Typography, Alert, Box } from '@mui/material';
import { useAuth } from '../contexts/AuthProvider';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Temporary utility component to fix user profile structure
 * This checks if your user document is using the old structure and migrates it
 *
 * TO USE:
 * 1. Import this component in App.jsx
 * 2. Add it somewhere in your app (maybe on the profile page)
 * 3. Click the "Fix My Profile" button while logged in
 * 4. Remove this component after it's fixed
 */
const FixMyUserProfile = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fixProfile = async () => {
    if (!currentUser) {
      setStatus('Error: Not logged in');
      return;
    }

    setLoading(true);
    setStatus('Checking your profile...');

    try {
      const uid = currentUser.uid;

      // Check if document exists with UID as document ID
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setStatus(`✓ Your profile is already correct! Role: ${data.role || 'Not set'}`);
        setLoading(false);
        return;
      }

      // If not, look for old document structure
      setStatus('Looking for old user document...');
      const q = query(collection(db, 'users'), where('uid', '==', uid));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setStatus('Error: No user document found at all. You may need to sign up again.');
        setLoading(false);
        return;
      }

      // Found old document - migrate it
      const oldDoc = querySnapshot.docs[0];
      const oldData = oldDoc.data();

      setStatus(`Found old document! Migrating... (Old ID: ${oldDoc.id})`);

      // Create new document with UID as document ID
      await setDoc(doc(db, 'users', uid), {
        email: oldData.email || currentUser.email,
        displayName: oldData.displayName || currentUser.displayName,
        role: oldData.role || 'On-Site Manager',
        createdAt: oldData.createdAt,
        lastLogin: oldData.lastLogin
      });

      setStatus(`✓ Migration complete! Your role is: ${oldData.role}. Please refresh the page.`);
      setLoading(false);

    } catch (error) {
      console.error('Error fixing profile:', error);
      setStatus(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <Alert severity="warning">
        You must be logged in to use this tool.
      </Alert>
    );
  }

  return (
    <Paper sx={{ padding: 3, marginBottom: 3, border: '2px solid #ff9800' }}>
      <Typography variant="h6" gutterBottom>
        🔧 User Profile Fix Tool
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        If your role is showing as "Not assigned", click the button below to check and fix your user profile structure.
      </Typography>

      <Box sx={{ marginTop: 2, marginBottom: 2 }}>
        <Typography variant="caption" display="block">
          Current User ID: {currentUser.uid}
        </Typography>
        <Typography variant="caption" display="block">
          Email: {currentUser.email}
        </Typography>
      </Box>

      <Button
        variant="contained"
        color="warning"
        onClick={fixProfile}
        disabled={loading}
      >
        {loading ? 'Checking...' : 'Fix My Profile'}
      </Button>

      {status && (
        <Alert
          severity={status.startsWith('✓') ? 'success' : status.startsWith('Error') ? 'error' : 'info'}
          sx={{ marginTop: 2 }}
        >
          {status}
        </Alert>
      )}

      <Typography variant="caption" display="block" sx={{ marginTop: 2, color: 'text.secondary' }}>
        Note: Remove this component from your app after the fix is complete.
      </Typography>
    </Paper>
  );
};

export default FixMyUserProfile;
