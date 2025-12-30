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
  MenuItem,
  Grid,
  Chip,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import { Add, Edit, Delete, Search, TrendingUp, Warning } from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useAuth } from '../hooks/useAuth';
import {
  getEarlyLeaves,
  createEarlyLeave,
  updateEarlyLeave,
  deleteEarlyLeave,
  getEarlyLeaveStats
} from '../services/earlyLeaveService';

const SHIFTS = ['1st', '2nd'];
const CORRECTIVE_ACTIONS = ['None', 'Warning', '5 Day Suspension', 'DNR'];
const REASONS = [
  'Personal',
  'Medical',
  'Family Emergency',
  'Transportation',
  'Childcare',
  'No Call No Show',
  'Other'
];

const EarlyLeavesPage = () => {
  const { currentUser } = useAuth();
  const [earlyLeaves, setEarlyLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    associateName: '',
    eid: '',
    line: '',
    timeLeft: '',
    hoursWorked: '',
    reason: '',
    correctiveAction: 'None',
    date: dayjs(),
    shift: '1st',
    days14: 0,
    days30: 0,
    days90: 0
  });

  async function loadData() {
    setLoading(true);
    const result = await getEarlyLeaves();
    const statsResult = await getEarlyLeaveStats();

    if (result.success) {
      setEarlyLeaves(result.data);
    }

    if (statsResult.success) {
      setStats(statsResult.data);
    }

    setLoading(false);
  }

  const applyFilters = React.useCallback(() => {
    let filtered = [...earlyLeaves];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        leave =>
          leave.associateName?.toLowerCase().includes(searchLower) ||
          leave.eid?.includes(searchTerm)
      );
    }

    if (shiftFilter) {
      filtered = filtered.filter(leave => leave.shift === shiftFilter);
    }

    if (actionFilter) {
      filtered = filtered.filter(leave => leave.correctiveAction === actionFilter);
    }

    setFilteredLeaves(filtered);
  }, [earlyLeaves, searchTerm, shiftFilter, actionFilter]);

  useEffect(() => {
    let mounted = true;
    const doLoad = async () => {
      setLoading(true);
      const result = await getEarlyLeaves();
      const statsResult = await getEarlyLeaveStats();

      if (mounted && result.success) {
        setEarlyLeaves(result.data);
      }

      if (mounted && statsResult.success) {
        setStats(statsResult.data);
      }

      if (mounted) setLoading(false);
    };
    doLoad();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => applyFilters(), 0);
    return () => clearTimeout(timer);
  }, [applyFilters]);

  const handleOpenDialog = (leave = null) => {
    if (leave) {
      setEditingLeave(leave);
      setFormData({
        associateName: leave.associateName || '',
        eid: leave.eid || '',
        line: leave.line || '',
        timeLeft: leave.timeLeft || '',
        hoursWorked: leave.hoursWorked || '',
        reason: leave.reason || '',
        correctiveAction: leave.correctiveAction || 'None',
        date: leave.date ? dayjs(leave.date) : dayjs(),
        shift: leave.shift || '1st',
        days14: leave.days14 || 0,
        days30: leave.days30 || 0,
        days90: leave.days90 || 0
      });
    } else {
      setEditingLeave(null);
      setFormData({
        associateName: '',
        eid: '',
        line: '',
        timeLeft: '',
        hoursWorked: '',
        reason: '',
        correctiveAction: 'None',
        date: dayjs(),
        shift: '1st',
        days14: 0,
        days30: 0,
        days90: 0
      });
    }
    setDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingLeave(null);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.associateName || !formData.eid) {
      setError('Associate Name and EID are required');
      return;
    }

    const earlyLeaveData = {
      associateName: formData.associateName.trim().toUpperCase(),
      eid: formData.eid.trim(),
      line: formData.line.trim(),
      timeLeft: formData.timeLeft,
      hoursWorked: parseFloat(formData.hoursWorked) || 0,
      reason: formData.reason,
      correctiveAction: formData.correctiveAction,
      date: formData.date.toDate(),
      shift: formData.shift,
      days14: parseInt(formData.days14) || 0,
      days30: parseInt(formData.days30) || 0,
      days90: parseInt(formData.days90) || 0
    };

    let result;
    if (editingLeave) {
      result = await updateEarlyLeave(editingLeave.id, earlyLeaveData, currentUser.uid);
    } else {
      result = await createEarlyLeave(earlyLeaveData, currentUser.uid);
    }

    if (result.success) {
      setSuccess(editingLeave ? 'Early leave updated successfully' : 'Early leave added successfully');
      loadData();
      handleCloseDialog();
    } else {
      setError(result.error);
    }
  };

  const handleDelete = async (leaveId) => {
    if (!window.confirm('Are you sure you want to delete this early leave record?')) {
      return;
    }

    const result = await deleteEarlyLeave(leaveId);
    if (result.success) {
      setSuccess('Early leave deleted successfully');
      loadData();
    } else {
      setError(result.error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'None':
        return 'default';
      case 'Warning':
        return 'warning';
      case '5 Day Suspension':
        return 'error';
      case 'DNR':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <Typography variant="h4">Early Leaves Tracker</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Early Leave
          </Button>
        </Box>

        {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
        {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>{error}</Alert>}

        {/* Statistics Cards */}
        {stats && (
          <Grid container spacing={3} sx={{ marginBottom: 3 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom fontSize="0.85rem">
                    Total Early Leaves
                  </Typography>
                  <Typography variant="h4">{stats.total}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: '#fff3e0' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom fontSize="0.85rem">
                    Warnings
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.byAction['Warning'] || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: '#ffebee' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom fontSize="0.85rem">
                    Suspensions
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {stats.byAction['5 Day Suspension'] || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ background: '#ffebee' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom fontSize="0.85rem">
                    DNR
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {stats.byAction['DNR'] || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ padding: 2, marginBottom: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search by Name or EID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ marginRight: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Shift</InputLabel>
                <Select
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  label="Shift"
                >
                  <MenuItem value="">All Shifts</MenuItem>
                  {SHIFTS.map(shift => (
                    <MenuItem key={shift} value={shift}>{shift} Shift</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Corrective Action</InputLabel>
                <Select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  label="Corrective Action"
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {CORRECTIVE_ACTIONS.map(action => (
                    <MenuItem key={action} value={action}>{action}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setShiftFilter('');
                  setActionFilter('');
                }}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Date</strong></TableCell>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>EID</strong></TableCell>
                <TableCell><strong>Shift</strong></TableCell>
                <TableCell><strong>Line</strong></TableCell>
                <TableCell><strong>Time Left</strong></TableCell>
                <TableCell><strong>Hours Worked</strong></TableCell>
                <TableCell><strong>Reason</strong></TableCell>
                <TableCell><strong>Corrective Action</strong></TableCell>
                <TableCell><strong>14/30/90 Days</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLeaves.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} align="center">
                    <Typography color="text.secondary" sx={{ padding: 3 }}>
                      No early leaves found. Click "Add Early Leave" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeaves.map((leave) => (
                  <TableRow key={leave.id} hover>
                    <TableCell>{dayjs(leave.date).format('MM/DD/YYYY')}</TableCell>
                    <TableCell>{leave.associateName}</TableCell>
                    <TableCell>{leave.eid}</TableCell>
                    <TableCell>{leave.shift}</TableCell>
                    <TableCell>{leave.line}</TableCell>
                    <TableCell>{leave.timeLeft}</TableCell>
                    <TableCell>{leave.hoursWorked}</TableCell>
                    <TableCell>{leave.reason}</TableCell>
                    <TableCell>
                      <Chip
                        label={leave.correctiveAction}
                        color={getActionColor(leave.correctiveAction)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {leave.days14}/{leave.days30}/{leave.days90}
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleOpenDialog(leave)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(leave.id)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingLeave ? 'Edit Early Leave' : 'Add Early Leave'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ marginTop: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="Associate Name"
                  value={formData.associateName}
                  onChange={(e) => handleChange('associateName', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="EID"
                  value={formData.eid}
                  onChange={(e) => handleChange('eid', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Date"
                  value={formData.date}
                  onChange={(newValue) => handleChange('date', newValue)}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Shift"
                  value={formData.shift}
                  onChange={(e) => handleChange('shift', e.target.value)}
                >
                  {SHIFTS.map(shift => (
                    <MenuItem key={shift} value={shift}>{shift} Shift</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Line"
                  value={formData.line}
                  onChange={(e) => handleChange('line', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Time Left"
                  placeholder="e.g., 2:30 PM"
                  value={formData.timeLeft}
                  onChange={(e) => handleChange('timeLeft', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Hours Worked"
                  type="number"
                  inputProps={{ step: '0.5', min: '0' }}
                  value={formData.hoursWorked}
                  onChange={(e) => handleChange('hoursWorked', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Reason"
                  value={formData.reason}
                  onChange={(e) => handleChange('reason', e.target.value)}
                >
                  {REASONS.map(reason => (
                    <MenuItem key={reason} value={reason}>{reason}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  required
                  label="Corrective Action"
                  value={formData.correctiveAction}
                  onChange={(e) => handleChange('correctiveAction', e.target.value)}
                >
                  {CORRECTIVE_ACTIONS.map(action => (
                    <MenuItem key={action} value={action}>{action}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ marginTop: 1 }}>
                  Occurrences Tracking
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="14 Days"
                  type="number"
                  inputProps={{ min: '0' }}
                  value={formData.days14}
                  onChange={(e) => handleChange('days14', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="30 Days"
                  type="number"
                  inputProps={{ min: '0' }}
                  value={formData.days30}
                  onChange={(e) => handleChange('days30', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="90 Days"
                  type="number"
                  inputProps={{ min: '0' }}
                  value={formData.days90}
                  onChange={(e) => handleChange('days90', e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingLeave ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
};

export default EarlyLeavesPage;
