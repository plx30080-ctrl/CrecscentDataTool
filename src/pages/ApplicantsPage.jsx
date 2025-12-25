import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  IconButton
} from '@mui/material';
import { Add, Edit, TrendingUp } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthProvider';
import {
  addApplicant,
  updateApplicant,
  getApplicants,
  getApplicantPipeline
} from '../services/firestoreService';

const ApplicantsPage = () => {
  const { currentUser } = useAuth();
  const [applicants, setApplicants] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'Indeed',
    status: 'Applied',
    position: '',
    shift: '1st',
    projectedStartDate: null,
    notes: ''
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [applicantsResult, pipelineResult] = await Promise.all([
      getApplicants(),
      getApplicantPipeline()
    ]);

    if (applicantsResult.success) {
      setApplicants(applicantsResult.data);
    }

    if (pipelineResult.success) {
      setPipeline(pipelineResult.data);
    }

    setLoading(false);
  };

  const handleOpenDialog = (applicant = null) => {
    if (applicant) {
      setEditingApplicant(applicant);
      setFormData({
        name: applicant.name || '',
        email: applicant.email || '',
        phone: applicant.phone || '',
        source: applicant.source || 'Indeed',
        status: applicant.status || 'Applied',
        position: applicant.position || '',
        shift: applicant.shift || '1st',
        projectedStartDate: applicant.projectedStartDate ? dayjs(applicant.projectedStartDate) : null,
        notes: applicant.notes || ''
      });
    } else {
      setEditingApplicant(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        source: 'Indeed',
        status: 'Applied',
        position: '',
        shift: '1st',
        projectedStartDate: null,
        notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingApplicant(null);
    setError('');
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.name) {
      setError('Name is required');
      return;
    }

    const applicantData = {
      ...formData,
      projectedStartDate: formData.projectedStartDate ? formData.projectedStartDate.toDate() : null
    };

    let result;
    if (editingApplicant) {
      result = await updateApplicant(editingApplicant.id, applicantData);
    } else {
      result = await addApplicant(applicantData, currentUser.uid);
    }

    if (result.success) {
      setSuccess(editingApplicant ? 'Applicant updated!' : 'Applicant added!');
      handleCloseDialog();
      loadData();
    } else {
      setError(result.error || 'Failed to save applicant');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Applied': 'info',
      'Interviewed': 'warning',
      'Processed': 'secondary',
      'Hired': 'success',
      'Started': 'primary',
      'Rejected': 'error'
    };
    return colors[status] || 'default';
  };

  if (loading) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <Typography variant="h4">
            Applicant Tracking System
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Applicant
          </Button>
        </Box>

        {success && (
          <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* Pipeline Overview */}
        {pipeline && (
          <Grid container spacing={2} sx={{ marginBottom: 4 }}>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Applied</Typography>
                  <Typography variant="h4">{pipeline.byStatus['Applied']}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Interviewed</Typography>
                  <Typography variant="h4">{pipeline.byStatus['Interviewed']}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Processed</Typography>
                  <Typography variant="h4">{pipeline.byStatus['Processed']}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Hired</Typography>
                  <Typography variant="h4">{pipeline.byStatus['Hired']}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Started</Typography>
                  <Typography variant="h4">{pipeline.byStatus['Started']}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={2}>
              <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <CardContent>
                  <Typography color="white" gutterBottom>Conversion</Typography>
                  <Typography variant="h4" color="white">{pipeline.conversionRate}%</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Applicants Table */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell>Projected Start</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {applicants.map((applicant) => (
                  <TableRow key={applicant.id}>
                    <TableCell>{applicant.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{applicant.email}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {applicant.phone}
                      </Typography>
                    </TableCell>
                    <TableCell>{applicant.source}</TableCell>
                    <TableCell>
                      <Chip
                        label={applicant.status}
                        color={getStatusColor(applicant.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{applicant.position}</TableCell>
                    <TableCell>{applicant.shift}</TableCell>
                    <TableCell>
                      {applicant.projectedStartDate
                        ? dayjs(applicant.projectedStartDate).format('MMM D, YYYY')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(applicant)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {applicants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ padding: 4 }}>
                        No applicants yet. Click &quot;Add Applicant&quot; to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingApplicant ? 'Edit Applicant' : 'Add New Applicant'}
          </DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ marginBottom: 2 }}>{error}</Alert>}

            <Grid container spacing={2} sx={{ marginTop: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Full Name"
                  fullWidth
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={formData.source}
                    label="Source"
                    onChange={(e) => handleChange('source', e.target.value)}
                  >
                    <MenuItem value="Indeed">Indeed</MenuItem>
                    <MenuItem value="Referral">Referral</MenuItem>
                    <MenuItem value="Walk-in">Walk-in</MenuItem>
                    <MenuItem value="LinkedIn">LinkedIn</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleChange('status', e.target.value)}
                  >
                    <MenuItem value="Applied">Applied</MenuItem>
                    <MenuItem value="Interviewed">Interviewed</MenuItem>
                    <MenuItem value="Processed">Processed</MenuItem>
                    <MenuItem value="Hired">Hired</MenuItem>
                    <MenuItem value="Started">Started</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Position"
                  fullWidth
                  value={formData.position}
                  onChange={(e) => handleChange('position', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Shift</InputLabel>
                  <Select
                    value={formData.shift}
                    label="Shift"
                    onChange={(e) => handleChange('shift', e.target.value)}
                  >
                    <MenuItem value="1st">1st Shift</MenuItem>
                    <MenuItem value="2nd">2nd Shift</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Projected Start Date"
                  value={formData.projectedStartDate}
                  onChange={(newValue) => handleChange('projectedStartDate', newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {editingApplicant ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default ApplicantsPage;
