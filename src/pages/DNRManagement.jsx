import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Box,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { Add, Delete, RestoreFromTrash, Block } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthProvider';
import {
  getDNRDatabase,
  addToDNR,
  removeFromDNR
} from '../services/earlyLeaveService';

const DNRManagement = () => {
  const { currentUser } = useAuth();
  const [dnrEntries, setDnrEntries] = useState([]);
  const [showRemoved, setShowRemoved] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    associateName: '',
    eid: '',
    reason: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [showRemoved]);

  const loadData = async () => {
    const result = await getDNRDatabase(showRemoved);
    if (result.success) {
      setDnrEntries(result.data);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      associateName: '',
      eid: '',
      reason: '',
      notes: ''
    });
    setDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.associateName || !formData.eid) {
      setError('Associate Name and EID are required');
      return;
    }

    const dnrData = {
      associateName: formData.associateName.trim().toUpperCase(),
      eid: formData.eid.trim(),
      reason: formData.reason.trim(),
      notes: formData.notes.trim(),
      source: 'Manual'
    };

    const result = await addToDNR(dnrData, currentUser.uid);

    if (result.success) {
      if (result.message) {
        setSuccess(result.message);
      } else {
        setSuccess('DNR entry added successfully');
      }
      loadData();
      handleCloseDialog();
    } else {
      setError(result.error);
    }
  };

  const handleRemove = async (dnrId, associateName) => {
    const notes = window.prompt(
      `Are you sure you want to remove ${associateName} from the DNR list?\n\nOptional: Enter a reason for removal:`
    );

    if (notes === null) return; // User cancelled

    const result = await removeFromDNR(dnrId, currentUser.uid, notes);

    if (result.success) {
      setSuccess(`${associateName} removed from DNR list`);
      loadData();
    } else {
      setError(result.error);
    }
  };

  const handleRestore = async (dnrId) => {
    // To restore, we'd need to update status back to Active
    // This would require a new service function
    setError('Restore functionality not yet implemented');
  };

  const activeEntries = dnrEntries.filter(entry => entry.status === 'Active');
  const removedEntries = dnrEntries.filter(entry => entry.status === 'Removed');

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <Typography variant="h4">DNR Database</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={showRemoved ? 'outlined' : 'contained'}
            onClick={() => setShowRemoved(!showRemoved)}
          >
            {showRemoved ? 'Show Active Only' : 'Show Removed'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenDialog}
          >
            Add Manual DNR
          </Button>
        </Box>
      </Box>

      {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Statistics */}
      <Grid container spacing={3} sx={{ marginBottom: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: '#ffebee' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Block fontSize="large" color="error" />
                <Box>
                  <Typography color="text.secondary" gutterBottom fontSize="0.85rem">
                    Active DNR Entries
                  </Typography>
                  <Typography variant="h3" color="error.main">
                    {activeEntries.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <RestoreFromTrash fontSize="large" color="action" />
                <Box>
                  <Typography color="text.secondary" gutterBottom fontSize="0.85rem">
                    Removed Entries
                  </Typography>
                  <Typography variant="h3">
                    {removedEntries.length}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Warning Message */}
      <Alert severity="warning" sx={{ marginBottom: 3 }}>
        <strong>Warning:</strong> The DNR (Do Not Return) list permanently flags associates.
        All applicants are automatically checked against this database during upload.
        Exercise caution when adding or removing entries.
      </Alert>

      {/* Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Associate Name</strong></TableCell>
              <TableCell><strong>EID</strong></TableCell>
              <TableCell><strong>Reason</strong></TableCell>
              <TableCell><strong>Source</strong></TableCell>
              <TableCell><strong>Date Added</strong></TableCell>
              <TableCell><strong>Added By</strong></TableCell>
              <TableCell><strong>Notes</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dnrEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="text.secondary" sx={{ padding: 3 }}>
                    No DNR entries found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              dnrEntries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Chip
                      label={entry.status}
                      color={entry.status === 'Active' ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell><strong>{entry.associateName}</strong></TableCell>
                  <TableCell>{entry.eid}</TableCell>
                  <TableCell>{entry.reason}</TableCell>
                  <TableCell>
                    <Chip
                      label={entry.source}
                      color={entry.source === 'Early Leave' ? 'warning' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{dayjs(entry.dateAdded).format('MM/DD/YYYY')}</TableCell>
                  <TableCell>{entry.addedBy || 'System'}</TableCell>
                  <TableCell>
                    {entry.status === 'Removed' && entry.notes ? (
                      <Typography variant="caption" color="text.secondary">
                        {entry.notes}
                      </Typography>
                    ) : (
                      entry.notes
                    )}
                  </TableCell>
                  <TableCell>
                    {entry.status === 'Active' ? (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemove(entry.id, entry.associateName)}
                        title="Remove from DNR"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        onClick={() => handleRestore(entry.id)}
                        title="Restore to Active"
                      >
                        <RestoreFromTrash fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Manual DNR Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Manual DNR Entry</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ marginTop: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Associate Name"
                value={formData.associateName}
                onChange={(e) => handleChange('associateName', e.target.value)}
                helperText="Enter full name in UPPERCASE"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="EID"
                value={formData.eid}
                onChange={(e) => handleChange('eid', e.target.value)}
                helperText="Employee ID number"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason"
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                helperText="Why is this person being added to DNR?"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                helperText="Additional details (optional)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="error">
            Add to DNR
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DNRManagement;
