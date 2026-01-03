import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import { Download, Upload, DeleteSweep } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import dayjs from 'dayjs';

const COLLECTIONS_TO_BACKUP = [
  'applicants',
  'associates',
  'badges',
  'earlyLeaves',
  'dnrDatabase',
  'laborReports',
  'onPremiseData',
  'branchDaily',
  'branchWeekly',
  'hoursData',
  'shiftData',
  'recruiterData',
  'applicantDocuments'
];

const DataBackup = () => {
  const [backing, setBacking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCollection, setCurrentCollection] = useState('');
  const [message, setMessage] = useState(null);
  const [backupStats, setBackupStats] = useState(null);

  const serializeData = (data) => {
    if (data === null || data === undefined) return data;
    
    if (data.toDate && typeof data.toDate === 'function') {
      return data.toDate().toISOString();
    }
    
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => serializeData(item));
    }
    
    if (typeof data === 'object') {
      const serialized = {};
      for (const key in data) {
        serialized[key] = serializeData(data[key]);
      }
      return serialized;
    }
    
    return data;
  };

  const handleBackup = async () => {
    setBacking(true);
    setProgress(0);
    setMessage(null);
    
    try {
      const allData = {};
      let totalDocs = 0;
      const stats = [];

      for (let i = 0; i < COLLECTIONS_TO_BACKUP.length; i++) {
        const collectionName = COLLECTIONS_TO_BACKUP[i];
        setCurrentCollection(collectionName);
        setProgress(((i + 1) / COLLECTIONS_TO_BACKUP.length) * 100);

        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);
        
        const documents = [];
        snapshot.forEach((doc) => {
          documents.push({
            id: doc.id,
            data: serializeData(doc.data())
          });
        });

        allData[collectionName] = documents;
        stats.push({ name: collectionName, count: documents.length });
        totalDocs += documents.length;
      }

      // Create backup object
      const backup = {
        backupDate: new Date().toISOString(),
        backupVersion: '1.0',
        totalDocuments: totalDocs,
        collections: stats,
        data: allData
      };

      // Download as JSON file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `firestore-backup-${dayjs().format('YYYY-MM-DD-HHmmss')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupStats(stats);
      setMessage({ 
        type: 'success', 
        text: `Backup complete! Downloaded ${totalDocs} documents from ${stats.length} collections.` 
      });
    } catch (error) {
      console.error('Backup error:', error);
      setMessage({ type: 'error', text: `Backup failed: ${error.message}` });
    } finally {
      setBacking(false);
      setCurrentCollection('');
      setProgress(100);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Data Backup & Management
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create a complete backup of all your Firestore data. This backup can be used to restore data if needed.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Backup Data
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Creates a JSON file containing all your data that you can download to your computer.
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleBackup}
            disabled={backing}
            size="large"
          >
            {backing ? 'Creating Backup...' : 'Download Backup'}
          </Button>

          {backing && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" gutterBottom>
                Backing up: <strong>{currentCollection}</strong>
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {Math.round(progress)}% complete
              </Typography>
            </Box>
          )}
        </Box>

        {backupStats && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Last Backup Summary
            </Typography>
            <List dense>
              {backupStats.map((stat) => (
                <ListItem key={stat.name} sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary={stat.name}
                    secondary={`${stat.count} documents`}
                  />
                  <Chip 
                    label={stat.count} 
                    size="small" 
                    color={stat.count > 0 ? 'primary' : 'default'}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        <Box>
          <Typography variant="h6" gutterBottom color="warning.main">
            ⚠️ Important Notes
          </Typography>
          <List>
            <ListItem>
              <ListItemText 
                primary="Backup File Format"
                secondary="The backup is a JSON file that includes all documents from your Firestore collections. Keep this file safe!"
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="What's Included"
                secondary="All collections except system collections. Timestamps are converted to ISO format."
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Storage"
                secondary="Store the backup file in a safe location. You can upload it later to restore your data."
              />
            </ListItem>
            <ListItem>
              <ListItemText 
                primary="Before Major Changes"
                secondary="Always create a backup before clearing data or making bulk changes."
              />
            </ListItem>
          </List>
        </Box>
      </Paper>
    </Container>
  );
};

export default DataBackup;
