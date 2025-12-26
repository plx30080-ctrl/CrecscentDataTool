import React, { useState, useEffect, useRef } from 'react';
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
  IconButton,
  Avatar,
  Stack
} from '@mui/material';
import { Add, Edit, TrendingUp, CameraAlt, PhotoCamera, Upload } from '@mui/icons-material';
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
import { createBadge } from '../services/badgeService';

const ApplicantsPage = () => {
  const { currentUser } = useAuth();
  const [applicants, setApplicants] = useState([]);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    eid: '',
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

  // Photo capture state
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [webcamActive, setWebcamActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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
        firstName: applicant.firstName || '',
        lastName: applicant.lastName || '',
        eid: applicant.eid || '',
        email: applicant.email || '',
        phone: applicant.phone || '',
        source: applicant.source || 'Indeed',
        status: applicant.status || 'Applied',
        position: applicant.position || '',
        shift: applicant.shift || '1st',
        projectedStartDate: applicant.projectedStartDate ? dayjs(applicant.projectedStartDate) : null,
        notes: applicant.notes || ''
      });
      if (applicant.photoURL) {
        setPhotoPreview(applicant.photoURL);
      }
    } else {
      setEditingApplicant(null);
      setFormData({
        firstName: '',
        lastName: '',
        eid: '',
        email: '',
        phone: '',
        source: 'Indeed',
        status: 'Applied',
        position: '',
        shift: '1st',
        projectedStartDate: null,
        notes: ''
      });
      setPhotoFile(null);
      setPhotoPreview('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    stopWebcam();
    setDialogOpen(false);
    setEditingApplicant(null);
    setPhotoFile(null);
    setPhotoPreview('');
    setError('');
  };

  // Webcam functions
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setWebcamActive(true);
      }
    } catch (err) {
      setError('Unable to access webcam: ' + err.message);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setWebcamActive(false);
    }
  };

  const capturePhoto = () => {
    if (canvasRef.current && videoRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        setPhotoFile(blob);
        setPhotoPreview(URL.createObjectURL(blob));
        stopWebcam();
      }, 'image/jpeg');
    }
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required');
      return;
    }

    if (!formData.eid) {
      setError('Employee ID is required');
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
      // Auto-create badge for new applicants or when photo is provided
      if (!editingApplicant || photoFile) {
        const badgeData = {
          firstName: formData.firstName.toUpperCase(),
          lastName: formData.lastName.toUpperCase(),
          eid: formData.eid,
          position: formData.position || 'Production Associate',
          shift: formData.shift,
          status: formData.status === 'Hired' || formData.status === 'Started' ? 'Pending' : 'Not Cleared',
          notes: `Auto-created from applicant: ${formData.firstName} ${formData.lastName}`,
          applicantId: result.id || editingApplicant.id
        };

        const badgeResult = await createBadge(badgeData, photoFile, currentUser.uid);

        if (badgeResult.success) {
          setSuccess(
            editingApplicant
              ? 'Applicant updated and badge created!'
              : `Applicant added! Badge ID: ${badgeResult.badgeId}`
          );
        } else {
          setSuccess(
            editingApplicant
              ? 'Applicant updated but badge creation failed'
              : 'Applicant added but badge creation failed: ' + badgeResult.error
          );
        }
      } else {
        setSuccess(editingApplicant ? 'Applicant updated!' : 'Applicant added!');
      }

      handleCloseDialog();
      loadData();
    } else {
      setError(result.error || 'Failed to save applicant');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      // Original statuses
      'Applied': 'info',
      'Interviewed': 'warning',
      'Processed': 'secondary',
      'Hired': 'success',
      'Started': 'primary',
      'Rejected': 'error',
      // Bulk upload statuses
      'CB Updated': 'info',
      'BG Pending': 'warning',
      'Adjudication Pending': 'warning',
      'I-9 Pending': 'secondary',
      'Declined': 'error',
      'No Contact': 'default'
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
            {Object.entries(pipeline.byStatus)
              .filter(([_, count]) => count > 0)
              .map(([status, count]) => (
                <Grid item xs={12} sm={6} md={3} lg={2} key={status}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom fontSize="0.85rem">
                        {status}
                      </Typography>
                      <Typography variant="h4">{count}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            }
            <Grid item xs={12} sm={6} md={3} lg={2}>
              <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <CardContent>
                  <Typography color="white" gutterBottom fontSize="0.85rem">Total</Typography>
                  <Typography variant="h4" color="white">{pipeline.total}</Typography>
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
                    <TableCell>
                      {applicant.firstName && applicant.lastName
                        ? `${applicant.firstName} ${applicant.lastName}`
                        : applicant.name || 'N/A'}
                    </TableCell>
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
              {/* Photo Capture Section */}
              <Grid item xs={12}>
                <Paper sx={{ padding: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Associate Photo
                  </Typography>

                  <Stack direction="row" spacing={2} alignItems="center">
                    {photoPreview && (
                      <Avatar
                        src={photoPreview}
                        sx={{ width: 120, height: 120 }}
                        variant="rounded"
                      />
                    )}

                    <Stack spacing={1}>
                      {!webcamActive && (
                        <>
                          <Button
                            variant="outlined"
                            startIcon={<CameraAlt />}
                            onClick={startWebcam}
                            size="small"
                          >
                            Use Webcam
                          </Button>
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<Upload />}
                            size="small"
                          >
                            Upload Photo
                            <input
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={handlePhotoUpload}
                            />
                          </Button>
                        </>
                      )}

                      {webcamActive && (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            style={{ width: '200px', borderRadius: '8px' }}
                          />
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              startIcon={<PhotoCamera />}
                              onClick={capturePhoto}
                              size="small"
                            >
                              Capture
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={stopWebcam}
                              size="small"
                            >
                              Cancel
                            </Button>
                          </Stack>
                        </>
                      )}
                    </Stack>
                  </Stack>
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </Paper>
              </Grid>

              {/* Basic Information */}
              <Grid item xs={12} md={4}>
                <TextField
                  label="First Name"
                  fullWidth
                  required
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Last Name"
                  fullWidth
                  required
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Employee ID"
                  fullWidth
                  required
                  value={formData.eid}
                  onChange={(e) => handleChange('eid', e.target.value)}
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
