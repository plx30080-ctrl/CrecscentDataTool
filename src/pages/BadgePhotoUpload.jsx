import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import { CloudUpload, CheckCircle, Link as LinkIcon } from '@mui/icons-material';
import { db, storage } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { discoverAndLinkPhotos } from '../services/badgeService';

const BadgePhotoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ uploaded: 0, failed: 0, skipped: 0 });
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleDiscoverAndLinkPhotos = async () => {
    setLinking(true);
    setError('');
    setLogs([]);
    addLog('🔍 Discovering and linking photos from Storage to badge records...');

    const result = await discoverAndLinkPhotos();
    setLinking(false);

    if (result.success) {
      const { linked, notFound, alreadyHave } = result.stats;
      addLog(`✅ Discovery complete!`);
      addLog(`   ${linked} photos linked to badge records`);
      addLog(`   ${alreadyHave} badges already have photos`);
      addLog(`   ${notFound} badges without photos in Storage`);
    } else {
      setError(result.error || 'Failed to discover photos');
      addLog(`❌ Error: ${result.error}`);
    }
  };

  const extractEIDFromFilename = (filename) => {
    // Extract EID from formats like: "10212782-photo.png" or "(802) 479-4469-photo.png"
    const match = filename.match(/^(\d+)-photo\.(png|jpg|jpeg)$/i);
    if (match) {
      return match[1];
    }
    return null;
  };

  const handlePhotoUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    setLogs([]);
    setProgress(0);
    setStats({ uploaded: 0, failed: 0, skipped: 0 });
    setComplete(false);

    addLog(`🚀 Starting upload of ${files.length} photos...`);

    let uploaded = 0;
    let failed = 0;
    let skipped = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const eid = extractEIDFromFilename(file.name);

        if (!eid) {
          addLog(`⚠️  Skipped ${file.name}: Could not extract EID`);
          skipped++;
          continue;
        }

        try {
          // Check if photo already exists in Storage
          const ext = file.name.split('.').pop();
          const storageRef = ref(storage, `badges/${eid}/photo.${ext}`);
          
          try {
            // Try to get the download URL - if it exists, skip
            await getDownloadURL(storageRef);
            addLog(`⏭️  Skipped ${file.name}: Photo already exists in Storage`);
            skipped++;
            continue;
          } catch (error) {
            // File doesn't exist, proceed with upload
          }

          // Check if badge record exists
          const badgeRef = doc(db, 'badges', eid);
          const badgeSnap = await getDoc(badgeRef);
          
          if (!badgeSnap.exists()) {
            addLog(`⚠️  Skipped ${file.name}: No badge record found for EID ${eid}`);
            skipped++;
            continue;
          }

          // Upload file to Storage
          await uploadBytes(storageRef, file);
          const photoURL = await getDownloadURL(storageRef);

          // Update badge document with photo URL
          await updateDoc(badgeRef, {
            photoURL: photoURL,
            photoUpdatedAt: new Date()
          });

          uploaded++;
          
          if (uploaded % 50 === 0) {
            addLog(`✅ Uploaded ${uploaded} photos...`);
          }
        } catch (err) {
          addLog(`❌ Failed ${file.name}: ${err.message}`);
          failed++;
        }

        // Update progress
        setProgress(((i + 1) / files.length) * 100);
        setStats({ uploaded, failed, skipped });
      }

      addLog(`\n✅ Upload complete!`);
      addLog(`   ${uploaded} uploaded`);
      addLog(`   ${failed} failed`);
      addLog(`   ${skipped} skipped`);
      setComplete(true);

    } catch (err) {
      setError(err.message);
      addLog(`❌ Fatal error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Badge Photo Upload
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Upload badge photos and link them to badge records
      </Typography>

      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Upload Badge Photos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select all photo files from: Sample Uploads/Bulk Upload Files/BADGE EXPORT/photos/
            <br />
            Photos should be named with format: <code>EID-photo.png</code> (e.g., 10212782-photo.png)
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<CloudUpload />}
              disabled={uploading || linking}
              size="large"
            >
              Select Photos
              <input
                type="file"
                hidden
                multiple
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePhotoUpload}
              />
            </Button>

            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={handleDiscoverAndLinkPhotos}
              disabled={uploading || linking}
              size="large"
            >
              Discover & Link Photos
            </Button>
          </Box>

          {uploading && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {Math.round(progress)}% complete - {stats.uploaded} uploaded, {stats.failed} failed, {stats.skipped} skipped
              </Typography>
            </Box>
          )}

          {linking && (
            <Box sx={{ mt: 3 }}>
              <LinearProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Discovering and linking photos...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {complete && (
            <Alert severity="success" icon={<CheckCircle />} sx={{ mt: 2 }}>
              Photo upload complete! {stats.uploaded} photos uploaded successfully.
            </Alert>
          )}

          {stats.uploaded > 0 && (
            <Box sx={{ mt: 2 }}>
              <Chip label={`${stats.uploaded} Uploaded`} color="success" sx={{ mr: 1 }} />
              <Chip label={`${stats.failed} Failed`} color="error" sx={{ mr: 1 }} />
              <Chip label={`${stats.skipped} Skipped`} color="default" />
            </Box>
          )}

          {logs.length > 0 && (
            <Paper sx={{ mt: 3, p: 2, bgcolor: 'grey.100' }}>
              <Typography variant="h6" gutterBottom>
                Upload Log
              </Typography>
              <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
                {logs.map((log, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemText 
                      primary={log}
                      primaryTypographyProps={{ 
                        variant: 'body2',
                        fontFamily: 'monospace',
                        fontSize: '0.85rem'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default BadgePhotoUpload;
