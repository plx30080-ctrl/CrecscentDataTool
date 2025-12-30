import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Checkbox,
  Toolbar
} from '@mui/material';
import {
  CameraAlt,
  Upload,
  Print,
  Search,
  Add,
  CheckCircle,
  Cancel,
  Person,
  Badge as BadgeIcon
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import {
  createBadge,
  searchBadges,
  updateBadgeStatus,
  addToPrintQueue,
  getPrintQueue,
  markBadgePrinted,
  markBadgeIssued,
  getBadgeStats
} from '../services/badgeService';
import BadgePrintPreview from '../components/BadgePrintPreview';
import BadgePlaceholder from '../components/BadgePlaceholder';

const BadgeManagement = () => {
  const { currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Create Badge State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    eid: '',
    status: 'Pending',
    position: '',
    shift: '1st',
    recruiter: '',
    notes: ''
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Lookup State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Print Queue State
  const [printQueue, setPrintQueue] = useState([]);
  const [badgeStats, setBadgeStats] = useState(null);
  const [selectedBadges, setSelectedBadges] = useState([]);

  // Print Preview State
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [badgeToPrint, setBadgeToPrint] = useState(null);

  // Webcam refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  async function loadPrintQueue() {
    const result = await getPrintQueue();
    if (result.success) {
      setPrintQueue(result.data);
    }
  }

  async function loadStats() {
    const result = await getBadgeStats();
    if (result.success) {
      setBadgeStats(result.data);
    }
  }

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (tabValue === 2) {
        const result = await getPrintQueue();
        if (mounted && result.success) setPrintQueue(result.data);
      }
      const stats = await getBadgeStats();
      if (mounted && stats.success) setBadgeStats(stats.data);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [tabValue]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
      setUseWebcam(true);
    } catch {
      setError('Failed to access webcam. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(blob => {
        setPhotoFile(blob);
        setPhotoPreview(URL.createObjectURL(blob));
        setUseWebcam(false);

        // Stop webcam
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      }, 'image/jpeg');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateBadge = async () => {
    setError('');
    setSuccess('');

    if (!formData.firstName || !formData.lastName || !formData.eid) {
      setError('First name, last name, and Employee ID are required');
      return;
    }

    if (!photoFile) {
      setError('Please capture or upload a photo');
      return;
    }

    setLoading(true);
    const badgeData = {
      ...formData,
      firstName: formData.firstName.toUpperCase(),
      lastName: formData.lastName.toUpperCase()
    };
    const result = await createBadge(badgeData, photoFile, currentUser.uid);
    setLoading(false);

    if (result.success) {
      setSuccess(`Badge created successfully! Badge ID: ${result.badgeId}`);
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        eid: '',
        status: 'Pending',
        position: '',
        shift: '1st',
        notes: ''
      });
      setPhotoPreview(null);
      setPhotoFile(null);
      loadStats();
    } else {
      setError(result.error || 'Failed to create badge');
    }
  };

  const handleSearch = async () => {
    if (!searchTerm) return;

    setLoading(true);
    const result = await searchBadges(searchTerm);
    setLoading(false);

    if (result.success) {
      setSearchResults(result.data);
      if (result.data.length === 0) {
        setError('No badges found');
      }
    } else {
      setError(result.error || 'Search failed');
    }
  };

  const handleViewDetails = (badge) => {
    setSelectedBadge(badge);
    setDetailsDialogOpen(true);
  };

  const handleUpdateStatus = async (badgeId, newStatus) => {
    const result = await updateBadgeStatus(badgeId, newStatus);
    if (result.success) {
      setSuccess(`Badge status updated to ${newStatus}`);
      handleSearch(); // Refresh results
      setDetailsDialogOpen(false);
    } else {
      setError(result.error || 'Failed to update status');
    }
  };

  const handleAddToPrintQueue = (badge) => {
    setBadgeToPrint(badge);
    setPrintPreviewOpen(true);
  };

  const handlePrintSuccess = async (badge) => {
    const result = await addToPrintQueue(badge.id, badge, currentUser.uid);
    if (result.success) {
      setSuccess('Badge printed and added to queue');
      await markBadgePrinted(badge.id, badge.id, currentUser.uid);
      loadPrintQueue();
      loadStats();
    } else {
      setError(result.error || 'Failed to update print queue');
    }
  };

  const handleMarkPrinted = async (queueItem) => {
    const result = await markBadgePrinted(queueItem.id, queueItem.badgeId, currentUser.uid);
    if (result.success) {
      setSuccess('Badge marked as printed');
      loadPrintQueue();
    } else {
      setError(result.error || 'Failed to mark as printed');
    }
  };

  // Bulk badge selection handlers
  const handleToggleBadge = (badgeId) => {
    setSelectedBadges(prev =>
      prev.includes(badgeId)
        ? prev.filter(id => id !== badgeId)
        : [...prev, badgeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedBadges.length === printQueue.length) {
      setSelectedBadges([]);
    } else {
      setSelectedBadges(printQueue.map(item => item.id));
    }
  };

  const handleBulkPrint = async () => {
    if (selectedBadges.length === 0) {
      setError('No badges selected');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    for (const badgeId of selectedBadges) {
      const queueItem = printQueue.find(item => item.id === badgeId);
      if (queueItem) {
        const result = await markBadgePrinted(queueItem.id, queueItem.badgeId, currentUser.uid);
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    setLoading(false);
    setSelectedBadges([]);

    if (failCount === 0) {
      setSuccess(`Successfully printed ${successCount} badge${successCount !== 1 ? 's' : ''}`);
    } else {
      setError(`Printed ${successCount} badge${successCount !== 1 ? 's' : ''}, ${failCount} failed`);
    }

    loadPrintQueue();
    loadStats();
  };

  const handleMarkIssued = async (badgeId) => {
    const result = await markBadgeIssued(badgeId, currentUser.uid);
    if (result.success) {
      setSuccess('Badge marked as issued');
      handleSearch();
      setDetailsDialogOpen(false);
    } else {
      setError(result.error || 'Failed to mark as issued');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'warning',
      'Cleared': 'success',
      'Not Cleared': 'error',
      'Suspended': 'default'
    };
    return colors[status] || 'default';
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>Badge Management</Typography>

      {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats Cards */}
      {badgeStats && (
        <Grid container spacing={2} sx={{ marginBottom: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">Total Badges</Typography>
                <Typography variant="h4">{badgeStats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">Cleared</Typography>
                <Typography variant="h4" color="success.main">{badgeStats.byStatus['Cleared']}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">Printed</Typography>
                <Typography variant="h4">{badgeStats.printed}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="text.secondary">Pending Print</Typography>
                <Typography variant="h4" color="warning.main">{badgeStats.pendingPrint}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Create Badge" icon={<Add />} iconPosition="start" />
          <Tab label="Lookup & Verify" icon={<Search />} iconPosition="start" />
          <Tab label="Print Queue" icon={<Print />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 0: Create Badge */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>Badge Information</Typography>

              <TextField
                label="First Name*"
                fullWidth
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                sx={{ marginBottom: 2 }}
              />

              <TextField
                label="Last Name*"
                fullWidth
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                sx={{ marginBottom: 2 }}
              />

              <TextField
                label="Employee ID*"
                fullWidth
                value={formData.eid}
                onChange={(e) => handleChange('eid', e.target.value)}
                sx={{ marginBottom: 2 }}
                helperText="Badge ID will be: PLX-########-ABC"
              />

              <FormControl fullWidth sx={{ marginBottom: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Cleared">Cleared</MenuItem>
                  <MenuItem value="Not Cleared">Not Cleared</MenuItem>
                  <MenuItem value="Suspended">Suspended</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Position"
                fullWidth
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                sx={{ marginBottom: 2 }}
              />

              <FormControl fullWidth sx={{ marginBottom: 2 }}>
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

              <TextField
                label="Recruiter"
                fullWidth
                value={formData.recruiter}
                onChange={(e) => handleChange('recruiter', e.target.value)}
                placeholder="Enter recruiter name"
                sx={{ marginBottom: 2 }}
              />

              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>Photo</Typography>

              {!photoPreview && !useWebcam && (
                <Box sx={{ textAlign: 'center', marginTop: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<CameraAlt />}
                    onClick={startWebcam}
                    sx={{ marginRight: 2, marginBottom: 2 }}
                  >
                    Use Webcam
                  </Button>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      variant="outlined"
                      startIcon={<Upload />}
                      component="span"
                      sx={{ marginBottom: 2 }}
                    >
                      Upload Photo
                    </Button>
                  </label>
                </Box>
              )}

              {useWebcam && (
                <Box>
                  <video ref={videoRef} autoPlay style={{ width: '100%', marginBottom: 2 }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                  <Box sx={{ textAlign: 'center' }}>
                    <Button variant="contained" onClick={capturePhoto} startIcon={<CameraAlt />}>
                      Capture Photo
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setUseWebcam(false);
                        if (streamRef.current) {
                          streamRef.current.getTracks().forEach(track => track.stop());
                        }
                      }}
                      sx={{ marginLeft: 2 }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}

              {photoPreview && (
                <Box>
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', marginBottom: 2 }} />
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                  >
                    Retake Photo
                  </Button>
                </Box>
              )}

              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleCreateBadge}
                disabled={loading || !photoFile}
                sx={{ marginTop: 3 }}
                startIcon={<BadgeIcon />}
              >
                {loading ? 'Creating...' : 'Create Badge'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Lookup & Verify */}
      {tabValue === 1 && (
        <Paper sx={{ padding: 3 }}>
          <Typography variant="h6" gutterBottom>Lookup Associate</Typography>

          <Box sx={{ display: 'flex', gap: 2, marginBottom: 3 }}>
            <TextField
              label="Search by Name or EID"
              fullWidth
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              startIcon={<Search />}
              disabled={loading}
            >
              Search
            </Button>
          </Box>

          <Grid container spacing={2}>
            {searchResults.map((badge) => (
              <Grid item xs={12} md={4} key={badge.id}>
                <Card>
                  {badge.photoURL ? (
                    <CardMedia
                      component="img"
                      height="200"
                      image={badge.photoURL}
                      alt={`${badge.firstName} ${badge.lastName}`}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <BadgePlaceholder width={200} height={200} />
                    </Box>
                  )}
                  <CardContent>
                    <Typography variant="h6">
                      {badge.firstName} {badge.lastName}
                    </Typography>
                    <Typography color="text.secondary" variant="caption" display="block">
                      Badge ID: {badge.badgeId || 'N/A'}
                    </Typography>
                    <Typography color="text.secondary">EID: {badge.eid}</Typography>
                    <Chip
                      label={badge.status}
                      color={getStatusColor(badge.status)}
                      size="small"
                      sx={{ marginTop: 1 }}
                    />
                    {badge.printedAt && (
                      <Typography variant="caption" display="block" sx={{ marginTop: 1 }}>
                        Printed: {new Date(badge.printedAt).toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => handleViewDetails(badge)}>
                      View Details
                    </Button>
                    {!badge.printedAt && badge.status === 'Cleared' && (
                      <Button
                        size="small"
                        color="primary"
                        startIcon={<Print />}
                        onClick={() => handleAddToPrintQueue(badge)}
                      >
                        Print
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Tab 2: Print Queue */}
      {tabValue === 2 && (
        <Paper sx={{ padding: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Typography variant="h6">Print Queue - Fargo DTC1250e</Typography>
            {printQueue.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {printQueue.length} badge{printQueue.length !== 1 ? 's' : ''} in queue
              </Typography>
            )}
          </Box>

          {/* Bulk Action Toolbar */}
          {selectedBadges.length > 0 && (
            <Toolbar
              sx={{
                backgroundColor: 'primary.light',
                borderRadius: 1,
                marginBottom: 2,
                padding: 2
              }}
            >
              <Typography variant="subtitle1" sx={{ flex: 1 }}>
                {selectedBadges.length} selected
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBulkPrint}
                disabled={loading}
                startIcon={<Print />}
              >
                Print Selected ({selectedBadges.length})
              </Button>
            </Toolbar>
          )}

          {printQueue.length > 0 && (
            <Box sx={{ marginBottom: 2 }}>
              <Button
                size="small"
                onClick={handleSelectAll}
                startIcon={<CheckCircle />}
              >
                {selectedBadges.length === printQueue.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>
          )}

          <List>
            {printQueue.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleMarkPrinted(item)}
                    startIcon={<CheckCircle />}
                  >
                    Mark Printed
                  </Button>
                }
              >
                <Checkbox
                  edge="start"
                  checked={selectedBadges.includes(item.id)}
                  onChange={() => handleToggleBadge(item.id)}
                  sx={{ marginRight: 1 }}
                />
                <ListItemAvatar>
                  <Avatar><Person /></Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={item.firstName && item.lastName ? `${item.firstName} ${item.lastName}` : item.name}
                  secondary={`Badge ID: ${item.badgeId || 'N/A'} | EID: ${item.eid} | Priority: ${item.priority} | Queued: ${new Date(item.queuedAt).toLocaleString()}`}
                />
              </ListItem>
            ))}
            {printQueue.length === 0 && (
              <Typography color="text.secondary" sx={{ padding: 2, textAlign: 'center' }}>
                No badges in print queue
              </Typography>
            )}
          </List>
        </Paper>
      )}

      {/* Badge Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedBadge && (
          <>
            <DialogTitle>Badge Details</DialogTitle>
            <DialogContent>
              <Box sx={{ textAlign: 'center', marginBottom: 2 }}>
                <img
                  src={selectedBadge.photoURL || `${import.meta.env.BASE_URL}placeholder-avatar.png`}
                  alt={`${selectedBadge.firstName} ${selectedBadge.lastName}`}
                  style={{ width: '200px', height: '200px', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="h6">
                {selectedBadge.firstName} {selectedBadge.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 1 }}>
                Badge ID: {selectedBadge.badgeId || 'Not assigned'}
              </Typography>
              <Typography>EID: {selectedBadge.eid}</Typography>
              <Typography>Position: {selectedBadge.position || 'N/A'}</Typography>
              <Typography>Shift: {selectedBadge.shift || 'N/A'}</Typography>
              {selectedBadge.recruiter && (
                <Typography>Recruiter: {selectedBadge.recruiter}</Typography>
              )}
              <Chip
                label={selectedBadge.status}
                color={getStatusColor(selectedBadge.status)}
                sx={{ marginTop: 1, marginBottom: 2 }}
              />
              {selectedBadge.notes && (
                <Typography variant="body2" sx={{ marginTop: 2 }}>
                  Notes: {selectedBadge.notes}
                </Typography>
              )}
              {selectedBadge.printedAt && (
                <Typography variant="caption" display="block">
                  Printed: {new Date(selectedBadge.printedAt).toLocaleString()}
                </Typography>
              )}
              {selectedBadge.issuedAt && (
                <Typography variant="caption" display="block">
                  Issued: {new Date(selectedBadge.issuedAt).toLocaleString()}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={() => {
                  setDetailsDialogOpen(false);
                  handleAddToPrintQueue(selectedBadge);
                }}
              >
                Print Badge
              </Button>
              {selectedBadge.status !== 'Cleared' && (
                <Button
                  color="success"
                  startIcon={<CheckCircle />}
                  onClick={() => handleUpdateStatus(selectedBadge.id, 'Cleared')}
                >
                  Mark Cleared
                </Button>
              )}
              {selectedBadge.status !== 'Not Cleared' && (
                <Button
                  color="error"
                  startIcon={<Cancel />}
                  onClick={() => handleUpdateStatus(selectedBadge.id, 'Not Cleared')}
                >
                  Mark Not Cleared
                </Button>
              )}
              {selectedBadge.printedAt && !selectedBadge.issuedAt && (
                <Button
                  color="primary"
                  onClick={() => handleMarkIssued(selectedBadge.id)}
                >
                  Mark Issued
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Print Preview Dialog */}
      <BadgePrintPreview
        open={printPreviewOpen}
        onClose={() => setPrintPreviewOpen(false)}
        badge={badgeToPrint}
        onPrintSuccess={handlePrintSuccess}
      />
    </Container>
  );
};

export default BadgeManagement;
