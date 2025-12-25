import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Typography,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Paper,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthProvider';
import {
  addShiftData,
  addHoursData,
  addRecruiterData,
  addEarlyLeave
} from '../services/firestoreService';

const EnhancedDataEntry = () => {
  const { currentUser, userProfile } = useAuth();
  const [date, setDate] = useState(dayjs());
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // On-Site Manager Form State
  const [shiftFormData, setShiftFormData] = useState({
    shift: '1st',
    numberRequested: '',
    numberRequired: '',
    numberWorking: '',
    sendHomes: '',
    lineCuts: '',
    notes: ''
  });
  const [newStarts, setNewStarts] = useState([]);
  const [newStartName, setNewStartName] = useState('');
  const [newStartEID, setNewStartEID] = useState('');

  // Recruiter Form State
  const [recruiterFormData, setRecruiterFormData] = useState({
    recruiterName: '',
    interviewsScheduled: '',
    interviewShows: '',
    applicantsProcessed: '',
    dailyNotes: ''
  });

  // Market Manager Form State
  const [hoursFormData, setHoursFormData] = useState({
    shift1Hours: '',
    shift2Hours: ''
  });
  const [earlyLeaveFormData, setEarlyLeaveFormData] = useState({
    associateId: '',
    associateName: '',
    shift: '1st',
    leaveTime: '',
    scheduledEndTime: '',
    reason: '',
    correctiveAction: 'None',
    notes: ''
  });
  const [showEarlyLeaveForm, setShowEarlyLeaveForm] = useState(false);

  const handleAddNewStart = () => {
    if (newStartName && newStartEID) {
      setNewStarts([...newStarts, { name: newStartName, eid: newStartEID }]);
      setNewStartName('');
      setNewStartEID('');
    }
  };

  const handleRemoveNewStart = (index) => {
    setNewStarts(newStarts.filter((_, i) => i !== index));
  };

  const handleShiftSubmit = async () => {
    setError('');
    setSuccess('');

    if (!shiftFormData.numberRequested || !shiftFormData.numberWorking) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    const result = await addShiftData(
      {
        date: date.toDate(),
        shift: shiftFormData.shift,
        numberRequested: parseInt(shiftFormData.numberRequested),
        numberRequired: parseInt(shiftFormData.numberRequired || 0),
        numberWorking: parseInt(shiftFormData.numberWorking),
        sendHomes: parseInt(shiftFormData.sendHomes || 0),
        lineCuts: parseInt(shiftFormData.lineCuts || 0),
        newStarts: newStarts,
        notes: shiftFormData.notes
      },
      currentUser.uid
    );
    setLoading(false);

    if (result.success) {
      setSuccess('Shift data saved successfully!');
      // Reset form
      setShiftFormData({
        shift: '1st',
        numberRequested: '',
        numberRequired: '',
        numberWorking: '',
        sendHomes: '',
        lineCuts: '',
        notes: ''
      });
      setNewStarts([]);
    } else {
      setError(result.error || 'Failed to save shift data');
    }
  };

  const handleRecruiterSubmit = async () => {
    setError('');
    setSuccess('');

    if (!recruiterFormData.recruiterName) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    const result = await addRecruiterData(
      {
        date: date.toDate(),
        recruiterName: recruiterFormData.recruiterName,
        interviewsScheduled: parseInt(recruiterFormData.interviewsScheduled || 0),
        interviewShows: parseInt(recruiterFormData.interviewShows || 0),
        applicantsProcessed: parseInt(recruiterFormData.applicantsProcessed || 0),
        dailyNotes: recruiterFormData.dailyNotes
      },
      currentUser.uid
    );
    setLoading(false);

    if (result.success) {
      setSuccess('Recruiter data saved successfully!');
      setRecruiterFormData({
        recruiterName: '',
        interviewsScheduled: '',
        interviewShows: '',
        applicantsProcessed: '',
        dailyNotes: ''
      });
    } else {
      setError(result.error || 'Failed to save recruiter data');
    }
  };

  const handleHoursSubmit = async () => {
    setError('');
    setSuccess('');

    if (!hoursFormData.shift1Hours && !hoursFormData.shift2Hours) {
      setError('Please enter hours for at least one shift');
      return;
    }

    const shift1 = parseFloat(hoursFormData.shift1Hours || 0);
    const shift2 = parseFloat(hoursFormData.shift2Hours || 0);

    setLoading(true);
    const result = await addHoursData(
      {
        date: date.toDate(),
        shift1Hours: shift1,
        shift2Hours: shift2,
        totalHours: shift1 + shift2,
        associateHours: [] // Can be expanded later
      },
      currentUser.uid
    );
    setLoading(false);

    if (result.success) {
      setSuccess('Hours data saved successfully!');
      setHoursFormData({
        shift1Hours: '',
        shift2Hours: ''
      });
    } else {
      setError(result.error || 'Failed to save hours data');
    }
  };

  const handleEarlyLeaveSubmit = async () => {
    setError('');
    setSuccess('');

    if (!earlyLeaveFormData.associateName || !earlyLeaveFormData.reason) {
      setError('Please fill in associate name and reason');
      return;
    }

    setLoading(true);
    const result = await addEarlyLeave(
      {
        date: date.toDate(),
        associateId: earlyLeaveFormData.associateId,
        associateName: earlyLeaveFormData.associateName,
        shift: earlyLeaveFormData.shift,
        leaveTime: earlyLeaveFormData.leaveTime,
        scheduledEndTime: earlyLeaveFormData.scheduledEndTime,
        reason: earlyLeaveFormData.reason,
        correctiveAction: earlyLeaveFormData.correctiveAction,
        actionDate: date.toDate(),
        notes: earlyLeaveFormData.notes
      },
      currentUser.uid
    );
    setLoading(false);

    if (result.success) {
      setSuccess('Early leave recorded successfully!');
      setEarlyLeaveFormData({
        associateId: '',
        associateName: '',
        shift: '1st',
        leaveTime: '',
        scheduledEndTime: '',
        reason: '',
        correctiveAction: 'None',
        notes: ''
      });
      setShowEarlyLeaveForm(false);
    } else {
      setError(result.error || 'Failed to record early leave');
    }
  };

  const renderOnSiteManagerForm = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Shift Data Entry</Typography>

      <FormControl component="fieldset" sx={{ marginBottom: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Shift</Typography>
        <RadioGroup
          row
          value={shiftFormData.shift}
          onChange={(e) => setShiftFormData({ ...shiftFormData, shift: e.target.value })}
        >
          <FormControlLabel value="1st" control={<Radio />} label="1st Shift" />
          <FormControlLabel value="2nd" control={<Radio />} label="2nd Shift" />
        </RadioGroup>
      </FormControl>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Number Requested*"
            type="number"
            fullWidth
            value={shiftFormData.numberRequested}
            onChange={(e) => setShiftFormData({ ...shiftFormData, numberRequested: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Number Required"
            type="number"
            fullWidth
            value={shiftFormData.numberRequired}
            onChange={(e) => setShiftFormData({ ...shiftFormData, numberRequired: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Number Working*"
            type="number"
            fullWidth
            value={shiftFormData.numberWorking}
            onChange={(e) => setShiftFormData({ ...shiftFormData, numberWorking: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Send Homes"
            type="number"
            fullWidth
            value={shiftFormData.sendHomes}
            onChange={(e) => setShiftFormData({ ...shiftFormData, sendHomes: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Line Cuts"
            type="number"
            fullWidth
            value={shiftFormData.lineCuts}
            onChange={(e) => setShiftFormData({ ...shiftFormData, lineCuts: e.target.value })}
          />
        </Grid>
      </Grid>

      <Divider sx={{ marginY: 3 }} />

      <Typography variant="subtitle1" gutterBottom>New Starts</Typography>
      <Grid container spacing={2} sx={{ marginBottom: 2 }}>
        <Grid item xs={12} md={5}>
          <TextField
            label="Name"
            fullWidth
            value={newStartName}
            onChange={(e) => setNewStartName(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={5}>
          <TextField
            label="Employee ID"
            fullWidth
            value={newStartEID}
            onChange={(e) => setNewStartEID(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddNewStart}
            fullWidth
            sx={{ height: '56px' }}
          >
            Add
          </Button>
        </Grid>
      </Grid>

      {newStarts.length > 0 && (
        <List>
          {newStarts.map((start, index) => (
            <ListItem
              key={index}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleRemoveNewStart(index)}>
                  <Delete />
                </IconButton>
              }
            >
              <ListItemText primary={start.name} secondary={`EID: ${start.eid}`} />
            </ListItem>
          ))}
        </List>
      )}

      <TextField
        label="Notes"
        fullWidth
        multiline
        rows={3}
        value={shiftFormData.notes}
        onChange={(e) => setShiftFormData({ ...shiftFormData, notes: e.target.value })}
        sx={{ marginTop: 2 }}
      />

      <Button
        variant="contained"
        onClick={handleShiftSubmit}
        disabled={loading}
        sx={{ marginTop: 2 }}
        fullWidth
      >
        {loading ? 'Saving...' : 'Submit Shift Data'}
      </Button>
    </Box>
  );

  const renderRecruiterForm = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Recruiter Daily Report</Typography>

      <TextField
        label="Your Name*"
        fullWidth
        value={recruiterFormData.recruiterName}
        onChange={(e) => setRecruiterFormData({ ...recruiterFormData, recruiterName: e.target.value })}
        sx={{ marginBottom: 2 }}
      />
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <TextField
            label="Interviews Scheduled"
            type="number"
            fullWidth
            value={recruiterFormData.interviewsScheduled}
            onChange={(e) => setRecruiterFormData({ ...recruiterFormData, interviewsScheduled: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Interview Shows"
            type="number"
            fullWidth
            value={recruiterFormData.interviewShows}
            onChange={(e) => setRecruiterFormData({ ...recruiterFormData, interviewShows: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Applicants Processed"
            type="number"
            fullWidth
            value={recruiterFormData.applicantsProcessed}
            onChange={(e) => setRecruiterFormData({ ...recruiterFormData, applicantsProcessed: e.target.value })}
          />
        </Grid>
      </Grid>

      <TextField
        label="Daily Notes"
        fullWidth
        multiline
        rows={5}
        value={recruiterFormData.dailyNotes}
        onChange={(e) => setRecruiterFormData({ ...recruiterFormData, dailyNotes: e.target.value })}
        sx={{ marginTop: 2 }}
      />

      <Button
        variant="contained"
        onClick={handleRecruiterSubmit}
        disabled={loading}
        sx={{ marginTop: 2 }}
        fullWidth
      >
        {loading ? 'Saving...' : 'Submit Recruiter Report'}
      </Button>
    </Box>
  );

  const renderMarketManagerForm = () => (
    <Box>
      <Typography variant="h6" gutterBottom>Hours & Early Leaves</Typography>

      <Typography variant="subtitle1" sx={{ marginTop: 2, marginBottom: 2 }}>
        Hours Worked
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            label="1st Shift Hours"
            type="number"
            fullWidth
            value={hoursFormData.shift1Hours}
            onChange={(e) => setHoursFormData({ ...hoursFormData, shift1Hours: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="2nd Shift Hours"
            type="number"
            fullWidth
            value={hoursFormData.shift2Hours}
            onChange={(e) => setHoursFormData({ ...hoursFormData, shift2Hours: e.target.value })}
          />
        </Grid>
      </Grid>

      <Button
        variant="contained"
        onClick={handleHoursSubmit}
        disabled={loading}
        sx={{ marginTop: 2 }}
        fullWidth
      >
        {loading ? 'Saving...' : 'Submit Hours Data'}
      </Button>

      <Divider sx={{ marginY: 4 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Typography variant="subtitle1">Early Leaves</Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => setShowEarlyLeaveForm(!showEarlyLeaveForm)}
        >
          {showEarlyLeaveForm ? 'Hide Form' : 'Record Early Leave'}
        </Button>
      </Box>

      {showEarlyLeaveForm && (
        <Paper variant="outlined" sx={{ padding: 2, marginTop: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Associate Name*"
                fullWidth
                value={earlyLeaveFormData.associateName}
                onChange={(e) => setEarlyLeaveFormData({ ...earlyLeaveFormData, associateName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Employee ID"
                fullWidth
                value={earlyLeaveFormData.associateId}
                onChange={(e) => setEarlyLeaveFormData({ ...earlyLeaveFormData, associateId: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Shift</InputLabel>
                <Select
                  value={earlyLeaveFormData.shift}
                  label="Shift"
                  onChange={(e) => setEarlyLeaveFormData({ ...earlyLeaveFormData, shift: e.target.value })}
                >
                  <MenuItem value="1st">1st Shift</MenuItem>
                  <MenuItem value="2nd">2nd Shift</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Leave Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={earlyLeaveFormData.leaveTime}
                onChange={(e) => setEarlyLeaveFormData({ ...earlyLeaveFormData, leaveTime: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                label="Scheduled End Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={earlyLeaveFormData.scheduledEndTime}
                onChange={(e) => setEarlyLeaveFormData({ ...earlyLeaveFormData, scheduledEndTime: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Reason*"
                fullWidth
                value={earlyLeaveFormData.reason}
                onChange={(e) => setEarlyLeaveFormData({ ...earlyLeaveFormData, reason: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Corrective Action</InputLabel>
                <Select
                  value={earlyLeaveFormData.correctiveAction}
                  label="Corrective Action"
                  onChange={(e) => setEarlyLeaveFormData({ ...earlyLeaveFormData, correctiveAction: e.target.value })}
                >
                  <MenuItem value="None">None</MenuItem>
                  <MenuItem value="Verbal Warning">Verbal Warning</MenuItem>
                  <MenuItem value="Written Warning">Written Warning</MenuItem>
                  <MenuItem value="Final Warning">Final Warning</MenuItem>
                  <MenuItem value="Termination">Termination</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                fullWidth
                multiline
                rows={2}
                value={earlyLeaveFormData.notes}
                onChange={(e) => setEarlyLeaveFormData({ ...earlyLeaveFormData, notes: e.target.value })}
              />
            </Grid>
          </Grid>

          <Button
            variant="contained"
            onClick={handleEarlyLeaveSubmit}
            disabled={loading}
            sx={{ marginTop: 2 }}
            fullWidth
          >
            {loading ? 'Saving...' : 'Submit Early Leave Record'}
          </Button>
        </Paper>
      )}
    </Box>
  );

  const renderForm = () => {
    if (!userProfile) return null;

    switch (userProfile.role) {
      case 'On-Site Manager':
        return renderOnSiteManagerForm();
      case 'Recruiter':
        return renderRecruiterForm();
      case 'Market Manager':
        return renderMarketManagerForm();
      default:
        return (
          <Alert severity="info">
            Your role does not have a specific data entry form. Please contact your administrator.
          </Alert>
        );
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="md">
        <Typography variant="h4" gutterBottom>
          Data Entry
        </Typography>

        {userProfile && (
          <Alert severity="info" sx={{ marginBottom: 3 }}>
            Logged in as: <strong>{userProfile.displayName}</strong> ({userProfile.role})
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ marginBottom: 3 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ marginBottom: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Paper sx={{ padding: 3 }}>
          <DatePicker
            label="Select Date"
            value={date}
            onChange={setDate}
            slotProps={{ textField: { fullWidth: true, sx: { marginBottom: 3 } } }}
          />

          {renderForm()}
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default EnhancedDataEntry;
