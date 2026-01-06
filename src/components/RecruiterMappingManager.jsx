import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import {
  getRecruiterMappings,
  getAvailableRecruiters,
  setRecruiterMapping,
  deleteRecruiterMapping
} from '../services/recruiterMappingService';
import logger from '../utils/logger';

const RecruiterMappingManager = () => {
  const [mappings, setMappings] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    initials: '',
    recruiterUid: '',
    fullName: '',
    email: ''
  });

  useEffect(() => {
    loadMappings();
    loadRecruiters();
  }, []);

  const loadMappings = async () => {
    setLoading(true);
    try {
      const mappingsData = await getRecruiterMappings();
      setMappings(Object.values(mappingsData));
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load recruiter mappings' });
      logger.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecruiters = async () => {
    try {
      const recruitersList = await getAvailableRecruiters();
      setRecruiters(recruitersList);
    } catch (error) {
      logger.error('Error loading recruiters:', error);
    }
  };

  const handleOpenDialog = (mapping = null) => {
    if (mapping) {
      setEditingId(mapping.id);
      setFormData({
        initials: mapping.initials,
        recruiterUid: mapping.uid,
        fullName: mapping.fullName || '',
        email: mapping.email || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        initials: '',
        recruiterUid: '',
        fullName: '',
        email: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      initials: '',
      recruiterUid: '',
      fullName: '',
      email: ''
    });
  };

  const handleSave = async () => {
    if (!formData.initials || !formData.recruiterUid) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    try {
      const result = await setRecruiterMapping(
        formData.initials,
        formData.recruiterUid,
        formData.fullName || recruiters.find(r => r.uid === formData.recruiterUid)?.displayName || '',
        formData.email || recruiters.find(r => r.uid === formData.recruiterUid)?.email || ''
      );

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Recruiter mapping saved: ${formData.initials}` 
        });
        loadMappings();
        handleCloseDialog();
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save mapping' });
      logger.error('Error saving mapping:', error);
    }
  };

  const handleDelete = async (initials) => {
    if (window.confirm(`Delete mapping for "${initials}"?`)) {
      try {
        const result = await deleteRecruiterMapping(initials);
        if (result.success) {
          setMessage({ 
            type: 'success', 
            text: `Deleted mapping: ${initials}` 
          });
          loadMappings();
        } else {
          setMessage({ type: 'error', text: result.error });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to delete mapping' });
        logger.error('Error deleting mapping:', error);
      }
    }
  };

  const handleRecruiterChange = (uid) => {
    const recruiter = recruiters.find(r => r.uid === uid);
    setFormData({
      ...formData,
      recruiterUid: uid,
      fullName: recruiter?.displayName || '',
      email: recruiter?.email || ''
    });
  };

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Recruiter Initials Mapping</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add New Mapping
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          Create mappings between recruiter initials (like "JD") and their actual user accounts.
          This allows automatic replacement of initials in bulk applicant uploads.
        </Typography>

        {message && (
          <Alert 
            severity={message.type} 
            sx={{ mb: 2 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell><strong>Initials</strong></TableCell>
                  <TableCell><strong>Recruiter Name</strong></TableCell>
                  <TableCell><strong>Email</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ p: 3 }}>
                      <Typography color="text.secondary">
                        No recruiter mappings yet. Create one to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  mappings.map((mapping) => (
                    <TableRow key={mapping.initials}>
                      <TableCell>
                        <Chip 
                          label={mapping.initials} 
                          color="primary" 
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{mapping.fullName}</TableCell>
                      <TableCell>{mapping.email}</TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(mapping)}
                          title="Edit"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(mapping.initials)}
                          title="Delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog for adding/editing mappings */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Recruiter Mapping' : 'Add New Recruiter Mapping'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Initials (e.g., JD)"
            placeholder="e.g., JD, AB, CM"
            value={formData.initials}
            onChange={(e) => setFormData({ ...formData, initials: e.target.value.toUpperCase() })}
            sx={{ mb: 2 }}
            inputProps={{ maxLength: 3, style: { textTransform: 'uppercase' } }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Recruiter</InputLabel>
            <Select
              value={formData.recruiterUid}
              label="Select Recruiter"
              onChange={(e) => handleRecruiterChange(e.target.value)}
            >
              <MenuItem value="">
                <em>Choose a recruiter...</em>
              </MenuItem>
              {recruiters.map((recruiter) => (
                <MenuItem key={recruiter.uid} value={recruiter.uid}>
                  {recruiter.displayName} ({recruiter.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Full Name"
            value={formData.fullName}
            disabled
            sx={{ mb: 2 }}
            helperText="Auto-filled from selected recruiter"
          />

          <TextField
            fullWidth
            label="Email"
            value={formData.email}
            disabled
            helperText="Auto-filled from selected recruiter"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.initials || !formData.recruiterUid}
          >
            Save Mapping
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecruiterMappingManager;
