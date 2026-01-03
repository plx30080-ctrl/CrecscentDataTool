import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { DeleteSweep, Warning, CheckCircle } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

const COLLECTIONS_TO_CLEAR = [
  { name: 'applicants', label: 'Applicants' },
  { name: 'associates', label: 'Associates' },
  { name: 'badges', label: 'Badges' },
  { name: 'earlyLeaves', label: 'Early Leaves' },
  { name: 'dnrDatabase', label: 'DNR Database' },
  { name: 'laborReports', label: 'Labor Reports' },
  { name: 'onPremiseData', label: 'On Premise Data' },
  { name: 'branchDaily', label: 'Branch Daily' },
  { name: 'branchWeekly', label: 'Branch Weekly' },
  { name: 'hoursData', label: 'Hours Data' },
  { name: 'shiftData', label: 'Shift Data' },
  { name: 'recruiterData', label: 'Recruiter Data' },
  { name: 'applicantDocuments', label: 'Applicant Documents' }
];

const PRESERVED_COLLECTIONS = [
  { name: 'users', label: 'User Accounts' },
  { name: 'auditLog', label: 'Audit Log' },
  { name: 'badgeTemplates', label: 'Badge Templates' }
];

const DataCleaner = () => {
  const { currentUser } = useAuth();
  const [clearing, setClearing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentCollection, setCurrentCollection] = useState('');
  const [message, setMessage] = useState(null);
  const [results, setResults] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const clearCollection = async (collectionName) => {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      if (snapshot.empty) {
        return { success: true, deleted: 0 };
      }
      
      const totalDocs = snapshot.size;
      let deletedCount = 0;
      const batchSize = 500;
      
      while (true) {
        const batch = writeBatch(db);
        const docs = await getDocs(collectionRef);
        
        if (docs.empty) break;
        
        let batchCount = 0;
        docs.forEach((document) => {
          if (batchCount < batchSize) {
            batch.delete(document.ref);
            batchCount++;
          }
        });
        
        if (batchCount === 0) break;
        
        await batch.commit();
        deletedCount += batchCount;
      }
      
      return { success: true, deleted: deletedCount };
      
    } catch (error) {
      console.error(`Error clearing ${collectionName}:`, error);
      return { success: false, error: error.message };
    }
  };

  const handleClearData = async () => {
    if (confirmText !== 'DELETE ALL DATA') {
      setMessage({ type: 'error', text: 'Please type "DELETE ALL DATA" to confirm' });
      return;
    }

    setConfirmOpen(false);
    setClearing(true);
    setProgress(0);
    setMessage(null);
    
    try {
      const clearResults = {
        successful: [],
        failed: [],
        totalDeleted: 0
      };

      for (let i = 0; i < COLLECTIONS_TO_CLEAR.length; i++) {
        const { name, label } = COLLECTIONS_TO_CLEAR[i];
        setCurrentCollection(label);
        setProgress(((i + 1) / COLLECTIONS_TO_CLEAR.length) * 100);

        const result = await clearCollection(name);
        
        if (result.success) {
          clearResults.successful.push({ name: label, count: result.deleted });
          clearResults.totalDeleted += result.deleted;
        } else {
          clearResults.failed.push({ name: label, error: result.error });
        }
      }

      setResults(clearResults);
      setMessage({ 
        type: 'success', 
        text: `Successfully cleared ${clearResults.successful.length} collections and deleted ${clearResults.totalDeleted} documents!` 
      });
    } catch (error) {
      console.error('Clear error:', error);
      setMessage({ type: 'error', text: `Clear failed: ${error.message}` });
    } finally {
      setClearing(false);
      setCurrentCollection('');
      setProgress(100);
    }
  };

  const handleOpenConfirm = () => {
    setConfirmText('');
    setConfirmOpen(true);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <DeleteSweep fontSize="large" color="error" />
          <Typography variant="h4">
            Clear All Data
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            ⚠️ DANGER ZONE
          </Typography>
          <Typography variant="body2">
            This action will permanently delete ALL data from your database. This cannot be undone!
            Make sure you have created a backup before proceeding.
          </Typography>
        </Alert>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom color="error">
            Collections That Will Be Cleared
          </Typography>
          <List dense>
            {COLLECTIONS_TO_CLEAR.map(({ name, label }) => (
              <ListItem key={name}>
                <ListItemText 
                  primary={label}
                  secondary={name}
                />
                <Chip label="Will be deleted" color="error" size="small" />
              </ListItem>
            ))}
          </List>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom color="success.main">
            Collections That Will Be Preserved
          </Typography>
          <List dense>
            {PRESERVED_COLLECTIONS.map(({ name, label }) => (
              <ListItem key={name}>
                <ListItemText 
                  primary={label}
                  secondary={name}
                />
                <Chip label="Will be kept" color="success" size="small" />
              </ListItem>
            ))}
          </List>
        </Box>

        {clearing && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Clearing: <strong>{currentCollection}</strong>
            </Typography>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption" color="text.secondary">
              {Math.round(progress)}% complete
            </Typography>
          </Box>
        )}

        {results && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Clear Complete
              </Typography>
              <Typography variant="body2">
                Successfully cleared {results.successful.length} collections
              </Typography>
              <Typography variant="body2">
                Total documents deleted: {results.totalDeleted}
              </Typography>
            </Alert>

            {results.successful.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Cleared Collections:
                </Typography>
                <List dense>
                  {results.successful.map((item) => (
                    <ListItem key={item.name}>
                      <CheckCircle color="success" fontSize="small" sx={{ mr: 1 }} />
                      <ListItemText 
                        primary={item.name}
                        secondary={`${item.count} documents deleted`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {results.failed.length > 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Failed Collections:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {results.failed.map((item) => (
                    <li key={item.name}>
                      {item.name}: {item.error}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteSweep />}
            onClick={handleOpenConfirm}
            disabled={clearing}
            size="large"
          >
            Clear All Data
          </Button>
          <Button
            variant="outlined"
            onClick={() => window.location.href = '/backup'}
            disabled={clearing}
          >
            Create Backup First
          </Button>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            ⚠️ Always create a backup before clearing data
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            ℹ️ This operation may take several minutes for large datasets
          </Typography>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="error" />
            <span>Confirm Data Deletion</span>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            This action cannot be undone! All data will be permanently deleted.
          </Alert>
          <Typography variant="body2" paragraph>
            To confirm, type <strong>DELETE ALL DATA</strong> in the box below:
          </Typography>
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE ALL DATA"
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleClearData}
            color="error"
            variant="contained"
            disabled={confirmText !== 'DELETE ALL DATA'}
          >
            Delete All Data
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DataCleaner;
