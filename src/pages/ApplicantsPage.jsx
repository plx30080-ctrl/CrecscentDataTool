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
import { Add, Edit, TrendingUp, CameraAlt, PhotoCamera, Upload, Search, Print, Download, Sync, Folder, Delete, DeleteSweep } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useAuth } from '../hooks/useAuth';
import {
  addApplicant,
  updateApplicant,
  deleteApplicant,
  bulkDeleteApplicants,
  getApplicants,
  getApplicantPipeline
} from '../services/firestoreService';
import { createBadge, createOrUpdateBadgeFromApplicant, getBadgeByEID, deleteBadgesByEid } from '../services/badgeService';
import BadgePrintPreview from '../components/BadgePrintPreview';

const STATUS_ALIASES = {
  'CB Updated': 'Finalized'
};

const ALL_STATUSES = [
  'Started',
  'Rejected',
  'Declined',
  'No Contact',
  'BG Pending',
  'Adjudication Pending',
  'I-9 Pending',
  'Finalized',
  'Terminated'
];

const ApplicantsPage = () => {
  const { currentUser, userProfile } = useAuth();
  const [applicants, setApplicants] = useState([]);
  const [filteredApplicants, setFilteredApplicants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterShift, setFilterShift] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState(null);
  const [filterDateTo, setFilterDateTo] = useState(null);
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
    status: 'No Contact',
    shift: '1st',
    recruiter: '',
    projectedStartDate: null,
    tentativeStartDate: null,
    notes: ''
  });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const normalizeStatus = (status) => STATUS_ALIASES[status] || status || 'Unknown';

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

  // Documents dialog state

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

  // Search and filter
  useEffect(() => {
    let filtered = [...applicants];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(applicant => {
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
      });
    }

    // Apply status filter
    if (filterStatus && filterStatus !== 'All') {
      filtered = filtered.filter(applicant => normalizeStatus(applicant.status) === filterStatus);
    }

    // Apply shift filter
    if (filterShift && filterShift !== 'All') {
      filtered = filtered.filter(applicant => applicant.shift === filterShift);
    }

    // Apply date range filter (processDate)
    if (filterDateFrom) {
      filtered = filtered.filter(applicant => {
        if (!applicant.processDate) return false;
        const processDate = applicant.processDate instanceof Date
          ? applicant.processDate
          : new Date(applicant.processDate);
        return processDate >= filterDateFrom.toDate();
      });
    }

    if (filterDateTo) {
      filtered = filtered.filter(applicant => {
        if (!applicant.processDate) return false;
        const processDate = applicant.processDate instanceof Date
          ? applicant.processDate
          : new Date(applicant.processDate);
        return processDate <= filterDateTo.toDate();
      });
    }

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
    
    // Recalculate pipeline based on filtered data
    const newPipeline = {
      total: filtered.length,
      byStatus: {}
    };
    
    // Initialize all statuses to 0
    ALL_STATUSES.forEach(status => {
      newPipeline.byStatus[status] = 0;
    });
    
    // Count filtered applicants by status
    filtered.forEach(applicant => {
      const status = normalizeStatus(applicant.status);
      newPipeline.byStatus[status] = (newPipeline.byStatus[status] || 0) + 1;
    });
    
    setPipeline(newPipeline);
  }, [searchTerm, filterStatus, filterShift, filterDateFrom, filterDateTo, applicants, sortField, sortDirection]);

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
        status: normalizeStatus(applicant.status) || 'No Contact',
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
        status: 'No Contact',
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
    // Check both eid and crmNumber fields (bulk uploads use crmNumber)
    const employeeId = editingApplicant?.eid || editingApplicant?.crmNumber;

    if (!editingApplicant || !employeeId) {
      setError('Cannot print badge: Employee ID is missing');
      return;
    }

    try {
      setLoading(true);

      // Check if badge exists
      const existingBadge = await getBadgeByEID(employeeId);

      if (existingBadge.success && existingBadge.data) {
        // Badge exists - use it directly
        setBadgeToPrint(existingBadge.data);
        setPrintPreviewOpen(true);
      } else {
        // No badge yet - create one from applicant data
        const result = await createOrUpdateBadgeFromApplicant(
          editingApplicant,
          photoFile || (editingApplicant.photoURL ? null : null), // Use existing photo if available
          currentUser.uid
        );

        if (result.success) {
          // Fetch the newly created badge
          const newBadge = await getBadgeByEID(employeeId);
          if (newBadge.success && newBadge.data) {
            setBadgeToPrint(newBadge.data);
            setPrintPreviewOpen(true);
            setSuccess('Badge created from applicant data');
          }
        } else {
          setError(result.error || 'Failed to create badge');
        }
      }
    } catch (err) {
      setError('Error preparing badge: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToBadge = async () => {
    const employeeId = editingApplicant?.eid || editingApplicant?.crmNumber;

    if (!employeeId) {
      setError('Cannot sync: Employee ID is missing');
      return;
    }

    try {
      setLoading(true);
      const result = await createOrUpdateBadgeFromApplicant(
        editingApplicant,
        photoFile,
        currentUser.uid
      );

      if (result.success) {
        setSuccess(result.isNew === false
          ? 'Badge updated with applicant data'
          : `Badge created successfully! ID: ${result.badgeId}`
        );
      } else {
        setError(result.error || 'Failed to sync badge');
      }
    } catch (err) {
      setError('Error syncing badge: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSuccess = () => {
    setSuccess('Badge printed successfully');
    setPrintPreviewOpen(false);
  };

  const handleExportPhoneList = () => {
    // Export phone numbers of filtered applicants
    const phonesWithNames = filteredApplicants
      .filter(app => app.phoneNumber || app.phone)
      .map(app => {
        const phone = app.phoneNumber || app.phone;
        const name = app.firstName && app.lastName
          ? `${app.firstName} ${app.lastName}`
          : app.name || 'Unknown';
        const status = app.status || 'N/A';
        return `${name}\t${phone}\t${status}`;
      });

    if (phonesWithNames.length === 0) {
      setError('No phone numbers found in current filter');
      return;
    }

    // Create downloadable CSV file
    const header = 'Name,Phone Number,Status';
    const content = [header, ...phonesWithNames.map(row => row.replace(/\t/g, ','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `phone-list-${dayjs().format('YYYY-MM-DD')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess(`Exported ${phonesWithNames.length} phone number(s)`);
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

    const normalizedStatus = normalizeStatus(formData.status);
    const processDate = formData.processDate ? formData.processDate.toDate() : null;
    const tentativeStartDate = formData.tentativeStartDate ? formData.tentativeStartDate.toDate() : null;

    const applicantData = {
      ...formData,
      phoneNumber: formData.phone, // Normalize to phoneNumber
      processDate,
      tentativeStartDate
    };

    if (normalizedStatus === 'Started') {
      const startCandidate = editingApplicant?.actualStartDate || tentativeStartDate || processDate || new Date();
      applicantData.actualStartDate = startCandidate instanceof Date ? startCandidate : new Date(startCandidate);
    } else if (editingApplicant?.actualStartDate) {
      // Preserve any previously set actual start date when not changing to Started
      applicantData.actualStartDate = editingApplicant.actualStartDate;
    }

    applicantData.status = normalizedStatus;
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
    const target = applicants.find((a) => a.id === applicantId);
    const updatePayload = { status: newStatus };

    if (normalizeStatus(newStatus) === 'Started') {
      const startCandidate = target?.actualStartDate || target?.tentativeStartDate || target?.processDate || new Date();
      updatePayload.actualStartDate = startCandidate instanceof Date ? startCandidate : new Date(startCandidate);
    }

    const result = await updateApplicant(applicantId, updatePayload);
    if (result.success) {
      setSuccess(`Status updated to ${newStatus}`);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(`Failed to update status: ${result.error}`);
    }
  };

  const handleDeleteApplicant = async (applicant) => {
    const confirmMessage = `Are you sure you want to delete ${applicant.firstName} ${applicant.lastName}?\n\nThis action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const result = await deleteApplicant(applicant.id);
    if (result.success) {
      setSuccess(`${applicant.firstName} ${applicant.lastName} has been deleted`);
      const eid = applicant.eid || applicant.crmNumber;
      if (eid) {
        deleteBadgesByEid(eid);
      }
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(`Failed to delete applicant: ${result.error}`);
    }
  };

  const handlePurgeOldApplicants = async () => {
    // Calculate date 6 months ago
    const sixMonthsAgo = dayjs().subtract(6, 'months').toDate();

    // Statuses that indicate applicant didn't start
    const nonStartedStatuses = ['Applied', 'Interviewed', 'Processed', 'Hired', 'Rejected', 'CB Updated', 'BG Pending', 'Adjudication Pending', 'I-9 Pending', 'Declined', 'No Contact'];

    // Find applicants to purge
    const applicantsToPurge = applicants.filter(applicant => {
      if (!applicant.processDate) return false;

      const processDate = applicant.processDate instanceof Date
        ? applicant.processDate
        : new Date(applicant.processDate);

      const isOld = processDate < sixMonthsAgo;
      const didntStart = nonStartedStatuses.includes(applicant.status);

      return isOld && didntStart;
    });

    if (applicantsToPurge.length === 0) {
      setError('No applicants found that meet purge criteria (6+ months old and did not start)');
      setTimeout(() => setError(''), 5000);
      return;
    }

    const confirmMessage = `This will permanently delete ${applicantsToPurge.length} applicants that:\n- Were processed more than 6 months ago\n- Did not start or were rejected/declined\n\nThis action cannot be undone.\n\nContinue?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const idsToDelete = applicantsToPurge.map(a => a.id);
    const result = await bulkDeleteApplicants(idsToDelete);

    if (result.success) {
      setSuccess(`Successfully purged ${result.deletedCount} old applicant records`);
      loadData();
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setError(`Failed to purge applicants: ${result.error}`);
    }
  };

  // Update pipeline based on date filters
  useEffect(() => {
    if (!applicants.length) return;

    let dateFiltered = [...applicants];

    // Apply date range filter (processDate)
    if (filterDateFrom) {
      dateFiltered = dateFiltered.filter(applicant => {
        if (!applicant.processDate) return false;
        const processDate = applicant.processDate instanceof Date
          ? applicant.processDate
          : new Date(applicant.processDate);
        return processDate >= filterDateFrom.toDate();
      });
    }

    if (filterDateTo) {
      dateFiltered = dateFiltered.filter(applicant => {
        if (!applicant.processDate) return false;
        const processDate = applicant.processDate instanceof Date
          ? applicant.processDate
          : new Date(applicant.processDate);
        return processDate <= filterDateTo.toDate();
      });
    }

    // Calculate pipeline stats
    const stats = {
      total: dateFiltered.length,
      byStatus: {}
    };

    // Initialize all statuses with 0
    ALL_STATUSES.forEach(status => {
      stats.byStatus[status] = 0;
    });

    // Count statuses
    dateFiltered.forEach(app => {
      const status = normalizeStatus(app.status);
      if (status) {
         stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      }
    });

    setPipeline(stats);
  }, [applicants, filterDateFrom, filterDateTo]);

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
          <Box sx={{ display: 'flex', gap: 2 }}>
            {(userProfile?.role === 'admin' || userProfile?.role === 'Market Manager') && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteSweep />}
                onClick={handlePurgeOldApplicants}
              >
                Purge Old Records
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportPhoneList}
            >
              Export Phone List
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Add Applicant
            </Button>
          </Box>
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
            sx={{ marginBottom: 2 }}
          />

          {/* Advanced Filters */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="All">All Statuses</MenuItem>
                  {ALL_STATUSES.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Shift</InputLabel>
                <Select
                  value={filterShift}
                  label="Shift"
                  onChange={(e) => setFilterShift(e.target.value)}
                >
                  <MenuItem value="All">All Shifts</MenuItem>
                  <MenuItem value="1st">1st Shift</MenuItem>
                  <MenuItem value="2nd">2nd Shift</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Process Date From"
                  value={filterDateFrom}
                  onChange={(newValue) => setFilterDateFrom(newValue)}
                 <Button
                  size="small"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('All');
                    setFilterShift('All');
                    setFilterDateFrom(null);
                    setFilterDateTo(null);
                 }}
                >
                  Clear All Filters
                </Button>
            )}
          </Box>
        </Paper>

        {/* Pipeline Overview */}
        {pipeline && (
          <Grid container spacing={2} sx={{ marginBottom: 4 }}>
            {Object.entries(pipeline.byStatus)
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <Grid item xs={12} sm={6} md={3} lg={2} key={status}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      border: filterStatus === status ? '2px solid #1976d2' : 'none',
                      backgroundColor: filterStatus === status ? '#e3f2fd' : 'inherit',
                      '&:hover': {
                        boxShadow: 4,
                        transform: 'translateY(-2px)'
                      }
                    }}
                    onClick={() => setFilterStatus(filterStatus === status ? 'All' : status)}
                  >
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
              <Card
                sx={{
                  background: filterStatus === 'All'
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'linear-gradient(135deg, #999 0%, #666 100%)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-2px)'
                  }
                }}
                onClick={() => setFilterStatus('All')}
              >
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
                  <TableCell sx={{ width: '80px', minWidth: '80px' }}>
                    <TableSortLabel
                      active={sortField === 'eid'}
                      direction={sortField === 'eid' ? sortDirection : 'asc'}
                      onClick={() => handleSort('eid')}
                    >
                      EID
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: '140px', minWidth: '140px' }}>
                    <TableSortLabel
                      active={sortField === 'name'}
                      direction={sortField === 'name' ? sortDirection : 'asc'}
                      onClick={() => handleSort('name')}
                    >
                      Name
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: '160px', minWidth: '160px' }}>Email</TableCell>
                  <TableCell sx={{ width: '120px', minWidth: '120px' }}>Phone</TableCell>
                  <TableCell sx={{ width: '140px', minWidth: '140px' }}>
                    <TableSortLabel
                      active={sortField === 'status'}
                      direction={sortField === 'status' ? sortDirection : 'asc'}
                      onClick={() => handleSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: '60px', minWidth: '60px' }}>
                    <TableSortLabel
                      active={sortField === 'shift'}
                      direction={sortField === 'shift' ? sortDirection : 'asc'}
                      onClick={() => handleSort('shift')}
                    >
                      Shift
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: '120px', minWidth: '120px' }}>
                    <TableSortLabel
                      active={sortField === 'recruiter'}
                      direction={sortField === 'recruiter' ? sortDirection : 'asc'}
                      onClick={() => handleSort('recruiter')}
                    >
                      Recruiter
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: '110px', minWidth: '110px' }}>
                    <TableSortLabel
                      active={sortField === 'processDate'}
                      direction={sortField === 'processDate' ? sortDirection : 'asc'}
                      onClick={() => handleSort('processDate')}
                    >
                      Process Date
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: '110px', minWidth: '110px' }}>
                    <TableSortLabel
                      active={sortField === 'tentativeStartDate'}
                      direction={sortField === 'tentativeStartDate' ? sortDirection : 'asc'}
                      onClick={() => handleSort('tentativeStartDate')}
                    >
                      Tentative Start
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ width: '120px', minWidth: '120px' }}>Notes</TableCell>
                  <TableCell sx={{ width: '100px', minWidth: '100px', position: 'sticky', right: 0, background: 'white', zIndex: 2 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredApplicants.map((applicant) => (
                  <TableRow key={applicant.id} sx={{ '& td': { padding: '6px 8px', fontSize: '0.875rem' } }}>
                    <TableCell sx={{ width: '80px', minWidth: '80px' }}>
                      <Typography variant="body2" fontWeight="medium" noWrap>
                        {applicant.eid || applicant.crmNumber || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '140px', minWidth: '140px' }}>
                      <Typography
                        variant="body2"
                        onClick={() => handleOpenDialog(applicant)}
                        noWrap
                        sx={{
                          color: '#1976d2',
                          cursor: 'pointer',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                        title={applicant.firstName && applicant.lastName
                          ? `${applicant.firstName} ${applicant.lastName}`
                          : applicant.name || 'N/A'}
                      >
                        {applicant.firstName && applicant.lastName
                          ? `${applicant.firstName} ${applicant.lastName}`
                          : applicant.name || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '160px', minWidth: '160px' }}>
                      {applicant.email ? (
                        <a
                          href={`mailto:${applicant.email}`}
                          style={{ color: '#1976d2', textDecoration: 'none' }}
                          onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                          onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                          title={applicant.email}
                        >
                          <Typography variant="body2" noWrap>
                            {applicant.email}
                          </Typography>
                        </a>
                      ) : <Typography variant="body2">-</Typography>}
                    </TableCell>
                    <TableCell sx={{ width: '120px', minWidth: '120px' }}>
                      <Typography variant="body2" noWrap>
                        {formatPhone(applicant.phoneNumber || applicant.phone) || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '140px', minWidth: '140px', padding: '0 8px !important' }}>
                      <FormControl size="small" fullWidth variant="standard">
                        <Select
                          value={normalizeStatus(applicant.status)}
                          onChange={(e) => handleQuickStatusUpdate(applicant.id, e.target.value)}
                          sx={{ fontSize: '0.875rem' }}
                        >
                          {ALL_STATUSES.map(status => (
                            <MenuItem key={status} value={status} sx={{ fontSize: '0.875rem' }}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ width: '60px', minWidth: '60px' }}>
                      <Typography variant="body2" noWrap>
                        {applicant.shift || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '120px', minWidth: '120px' }}>
                      <Typography variant="body2" noWrap title={applicant.recruiter || ''}>
                        {applicant.recruiter || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '110px', minWidth: '110px' }}>
                      <Typography variant="body2" noWrap>
                        {applicant.processDate
                          ? dayjs(applicant.processDate).format('M/D/YY')
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '110px', minWidth: '110px' }}>
                      <Typography variant="body2" noWrap>
                        {applicant.tentativeStartDate
                          ? dayjs(applicant.tentativeStartDate).format('M/D/YY')
                          : applicant.projectedStartDate
                          ? dayjs(applicant.projectedStartDate).format('M/D/YY')
                          : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '120px', minWidth: '120px' }}>
                      <Typography variant="body2" noWrap title={applicant.notes || ''}>
                        {applicant.notes || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ width: '100px', minWidth: '100px', position: 'sticky', right: 0, background: 'white', zIndex: 1 }}>
                      <Stack direction="row" spacing={0.5}>

                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteApplicant(applicant)}
                          title="Delete Applicant"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredApplicants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
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
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
          <DialogTitle>
            {editingApplicant ? 'Applicant Profile' : 'Add New Applicant'}
          </DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ marginBottom: 2 }}>{error}</Alert>}

            <Grid container spacing={3} sx={{ marginTop: 1 }}>
              {/* Photo Capture Section */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ marginBottom: 2, color: 'primary.main' }}>
                  Photo
                </Typography>
                <Paper sx={{ padding: 2, backgroundColor: '#f5f5f5' }}>
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
                            playsInline
                            style={{ width: '320px', height: '240px', borderRadius: '8px', border: '2px solid #ccc' }}
                          />
                          <canvas ref={canvasRef} style={{ display: 'none' }} />
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
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ marginBottom: 2, color: 'primary.main' }}>
                  Personal Information
                </Typography>
              </Grid>
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

              <Grid item xs={12}>
                <Typography variant="h6" sx={{ marginTop: 2, marginBottom: 2, color: 'primary.main' }}>
                  Employment Details
                </Typography>
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
                <TextField
                  label="Recruiter"
                  fullWidth
                  value={formData.recruiter}
                  onChange={(e) => handleChange('recruiter', e.target.value)}
                  placeholder="Enter recruiter name"
                />
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
          <DialogActions sx={{ justifyContent: 'space-between' }}>
            <Box>
              {editingApplicant && (
                <Button
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => {
                    handleCloseDialog();
                    handleDeleteApplicant(editingApplicant);
                  }}
                >
                  Delete
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              {editingApplicant && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<Sync />}
                    onClick={handleSyncToBadge}
                    disabled={loading}
                  >
                    Sync to Badge
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Print />}
                    onClick={handlePrintBadge}
                    disabled={loading}
                  >
                    Print Badge
                  </Button>
                </>
              )}
              <Button variant="contained" onClick={handleSubmit} disabled={loading}>
                {editingApplicant ? 'Update' : 'Add'}
              </Button>
            </Box>
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
