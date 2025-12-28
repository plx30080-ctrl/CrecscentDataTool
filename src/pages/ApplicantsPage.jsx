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
  TableSortLabel,
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
import { Add, Edit, TrendingUp, CameraAlt, PhotoCamera, Upload, Search, Print } from '@mui/icons-material';
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
import { createBadge, searchBadges } from '../services/badgeService';
import BadgePrintPreview from '../components/BadgePrintPreview';

const ApplicantsPage = () => {
  const { currentUser } = useAuth();
  const [applicants, setApplicants] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('processDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);

  // Phone formatter utility
  const formatPhone = (phone) => {
    if (!phone) return '';
    const cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    eid: '',
    email: '',
    phone: '',
    status: 'Applied',
    shift: '1st',
    projectedStartDate: null,
    tentativeStartDate: null,
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

  // Print preview state
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [badgeToPrint, setBadgeToPrint] = useState(null);

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
      setFilteredApplicants(applicantsResult.data);
    }

    if (pipelineResult.success) {
      setPipeline(pipelineResult.data);
    }

    setLoading(false);
  };

  // Search and sort filter
  useEffect(() => {
    let filtered = searchTerm ? applicants.filter(applicant => {
      const searchLower = searchTerm.toLowerCase();
      const name = (applicant.name || '').toLowerCase();
      const email = (applicant.email || '').toLowerCase();
      const crmNumber = (applicant.crmNumber || '').toLowerCase();
      const eid = (applicant.eid || '').toLowerCase();
      const status = (applicant.status || '').toLowerCase();

      return name.includes(searchLower) ||
             email.includes(searchLower) ||
             crmNumber.includes(searchLower) ||
             eid.includes(searchLower) ||
             status.includes(searchLower);
    }) : [...applicants];

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined values
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      // Handle dates
      if (sortField === 'processDate' || sortField === 'projectedStartDate' || sortField === 'tentativeStartDate') {
        aVal = aVal instanceof Date ? aVal.getTime() : 0;
        bVal = bVal instanceof Date ? bVal.getTime() : 0;
      }

      // Handle strings (case-insensitive)
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredApplicants(filtered);
  }, [searchTerm, applicants, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleOpenDialog = (applicant = null) => {
    if (applicant) {
      setEditingApplicant(applicant);

      // Parse name field if firstName/lastName don't exist
      let firstName = applicant.firstName || '';
      let lastName = applicant.lastName || '';

      if (!firstName && !lastName && applicant.name) {
        const nameParts = applicant.name.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      setFormData({
        firstName: firstName,
        lastName: lastName,
        eid: applicant.eid || applicant.crmNumber || '',
        email: applicant.email || '',
        phone: applicant.phoneNumber || applicant.phone || '',
        status: applicant.status || 'Applied',
        shift: applicant.shift || '1st',
        processDate: applicant.processDate ? dayjs(applicant.processDate) : null,
        tentativeStartDate: applicant.tentativeStartDate ? dayjs(applicant.tentativeStartDate) : null,
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
        status: 'Applied',
        shift: '1st',
        processDate: null,
        tentativeStartDate: null,
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

  const handlePrintBadge = async () => {
    if (!editingApplicant || !editingApplicant.eid) {
      setError('Cannot print badge: Employee ID is missing');
      return;
    }

    // Search for badge by EID
    const result = await searchBadges(editingApplicant.eid);
    if (result.success && result.data.length > 0) {
      // Badge exists, open print preview
      setBadgeToPrint(result.data[0]);
      setPrintPreviewOpen(true);
    } else {
      setError('No badge found for this applicant. Please create a badge first in Badge Management.');
    }
  };

  const handlePrintSuccess = () => {
    setSuccess('Badge printed successfully');
    setPrintPreviewOpen(false);
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

    // Check for duplicate EID when creating new applicant
    if (!editingApplicant) {
      const existingApplicant = applicants.find(a =>
        a.eid === formData.eid || a.crmNumber === formData.eid
      );
      if (existingApplicant) {
        setError(`An applicant with EID ${formData.eid} already exists. Updating existing profile instead.`);
        // Update the existing applicant instead
        const applicantData = {
          ...formData,
          phoneNumber: formData.phone,
          processDate: formData.processDate ? formData.processDate.toDate() : null,
          tentativeStartDate: formData.tentativeStartDate ? formData.tentativeStartDate.toDate() : null
        };
        delete applicantData.phone;

        const result = await updateApplicant(existingApplicant.id, applicantData);
        if (result.success) {
          setSuccess('Existing applicant profile updated successfully');
          loadData();
          handleCloseDialog();
        } else {
          setError(result.error || 'Failed to update applicant');
        }
        return;
      }
    }

    const applicantData = {
      ...formData,
      phoneNumber: formData.phone, // Normalize to phoneNumber
      processDate: formData.processDate ? formData.processDate.toDate() : null,
      tentativeStartDate: formData.tentativeStartDate ? formData.tentativeStartDate.toDate() : null
    };
    delete applicantData.phone; // Remove phone, use phoneNumber

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

  const handleQuickStatusUpdate = async (applicantId, newStatus) => {
    const result = await updateApplicant(applicantId, { status: newStatus });
    if (result.success) {
      setSuccess(`Status updated to ${newStatus}`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(`Failed to update status: ${result.error}`);
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

  const ALL_STATUSES = [
    'Applied', 'Interviewed', 'Processed', 'Hired', 'Started', 'Rejected',
    'CB Updated', 'BG Pending', 'Adjudication Pending', 'I-9 Pending', 'Declined', 'No Contact'
  ];

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

        {/* Search Bar */}
        <Paper sx={{ padding: 2, marginBottom: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by name, email, CRM number, EID, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ marginRight: 1, color: 'text.secondary' }} />
            }}
          />
          {searchTerm && (
            <Typography variant="caption" color="text.secondary" sx={{ marginTop: 1, display: 'block' }}>
              Found {filteredApplicants.length} result{filteredApplicants.length !== 1 ? 's' : ''}
            </Typography>
          )}
        </Paper>

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
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'eid'}
                      direction={sortField === 'eid' ? sortDirection : 'asc'}
                      onClick={() => handleSort('eid')}
                    >
                      EID
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'name'}
                      direction={sortField === 'name' ? sortDirection : 'asc'}
                      onClick={() => handleSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'status'}
                      direction={sortField === 'status' ? sortDirection : 'asc'}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'shift'}
                      direction={sortField === 'shift' ? sortDirection : 'asc'}
                      onClick={() => handleSort('shift')}
                    >
                      Shift
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortField === 'tentativeStartDate'}
                      direction={sortField === 'tentativeStartDate' ? sortDirection : 'asc'}
                      onClick={() => handleSort('tentativeStartDate')}
                    >
                      Tentative Start
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredApplicants.map((applicant) => (
                  <TableRow key={applicant.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {applicant.eid || applicant.crmNumber || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        onClick={() => handleOpenDialog(applicant)}
                        sx={{
                          color: '#1976d2',
                          cursor: 'pointer',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {applicant.firstName && applicant.lastName
                          ? `${applicant.firstName} ${applicant.lastName}`
                          : applicant.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {applicant.email ? (
                        <a
                          href={`mailto:${applicant.email}`}
                          style={{ color: '#1976d2', textDecoration: 'none' }}
                          onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                        >
                          {applicant.email}
                        </a>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {formatPhone(applicant.phoneNumber || applicant.phone) || '-'}
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={applicant.status}
                          onChange={(e) => handleQuickStatusUpdate(applicant.id, e.target.value)}
                          sx={{ minWidth: 140 }}
                        >
                          {ALL_STATUSES.map(status => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>{applicant.shift || '-'}</TableCell>
                    <TableCell>
                      {applicant.tentativeStartDate
                        ? dayjs(applicant.tentativeStartDate).format('MMM D, YYYY')
                        : applicant.projectedStartDate
                        ? dayjs(applicant.projectedStartDate).format('MMM D, YYYY')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                        {applicant.notes ? (
                          applicant.notes.length > 30
                            ? `${applicant.notes.substring(0, 30)}...`
                            : applicant.notes
                        ) : '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredApplicants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography color="text.secondary" sx={{ padding: 4 }}>
                        {searchTerm ? 'No applicants found matching your search.' : 'No applicants yet. Click "Add Applicant" to get started.'}
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
            {editingApplicant ? 'Applicant Profile' : 'Add New Applicant'}
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
                  placeholder="(555) 123-4567"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleChange('status', e.target.value)}
                  >
                    {ALL_STATUSES.map(status => (
                      <MenuItem key={status} value={status}>{status}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
                  label="Process Date"
                  value={formData.processDate}
                  onChange={(newValue) => handleChange('processDate', newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Tentative Start Date"
                  value={formData.tentativeStartDate}
                  onChange={(newValue) => handleChange('tentativeStartDate', newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Add any additional notes about this applicant..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            {editingApplicant && (
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrintBadge}
              >
                Print Badge
              </Button>
            )}
            <Button variant="contained" onClick={handleSubmit}>
              {editingApplicant ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Print Preview Dialog */}
        <BadgePrintPreview
          open={printPreviewOpen}
          onClose={() => setPrintPreviewOpen(false)}
          badge={badgeToPrint}
          onPrintSuccess={handlePrintSuccess}
        />
      </Container>
    </LocalizationProvider>
  );
};

export default ApplicantsPage;
