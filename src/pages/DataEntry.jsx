import React, { useState } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Typography, Container, FormControl, InputLabel, Select, MenuItem, TextField, Button, Paper, Box, RadioGroup, FormControlLabel, Radio } from '@mui/material';

const OnSiteManagerForm = () => {
  const [shift, setShift] = useState('1st');
  return (
    <Box>
      <FormControl component="fieldset" sx={{ marginBottom: '1rem' }}>
        <RadioGroup row value={shift} onChange={(e) => setShift(e.target.value)}>
          <FormControlLabel value="1st" control={<Radio />} label="1st Shift" />
          <FormControlLabel value="2nd" control={<Radio />} label="2nd Shift" />
        </RadioGroup>
      </FormControl>
      <TextField label="Number Requested" fullWidth sx={{ marginBottom: '1rem' }} />
      <TextField label="Number Required" fullWidth sx={{ marginBottom: '1rem' }} />
      <TextField label="Number Working" fullWidth sx={{ marginBottom: '1rem' }} />
      <TextField label="New Starts (Name and EID)" fullWidth multiline rows={3} sx={{ marginBottom: '1rem' }} />
      <TextField label="Send Homes" fullWidth sx={{ marginBottom: '1rem' }} />
    </Box>
  );
};

const RecruiterForm = () => (
  <Box>
    <TextField label="Name" fullWidth sx={{ marginBottom: '1rem' }} />
    <TextField label="Interviews Scheduled" fullWidth sx={{ marginBottom: '1rem' }} />
    <TextField label="Interview Shows" fullWidth sx={{ marginBottom: '1rem' }} />
    <TextField label="Applicants Processed" fullWidth sx={{ marginBottom: '1rem' }} />
    <TextField label="Daily Notes" fullWidth multiline rows={5} sx={{ marginBottom: '1rem' }} />
  </Box>
);

const MarketManagerForm = () => (
  <Box>
    <TextField label="Hours Worked 1st Shift" fullWidth sx={{ marginBottom: '1rem' }} />
    <TextField label="Hours Worked 2nd Shift" fullWidth sx={{ marginBottom: '1rem' }} />
    <TextField label="Early Leaves" fullWidth sx={{ marginBottom: '1rem' }} />
    <TextField label="DNRs" fullWidth sx={{ marginBottom: '1rem' }} />
  </Box>
);

const DataEntry = () => {
  const [role, setRole] = useState('');
  const [date, setDate] = useState(null);

  const renderForm = () => {
    switch (role) {
      case 'On-Site Manager':
        return <OnSiteManagerForm />;
      case 'Recruiter':
        return <RecruiterForm />;
      case 'Market Manager':
        return <MarketManagerForm />;
      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container>
        <Typography variant="h4" gutterBottom>
          Data Entry
        </Typography>
        <Paper sx={{ padding: '2rem' }}>
          <FormControl fullWidth sx={{ marginBottom: '2rem' }}>
            <InputLabel>Select Date</InputLabel>
            <DatePicker
              value={date}
              onChange={(newValue) => {
                setDate(newValue);
              }}
              renderInput={(params) => <TextField {...params} />}
            />
          </FormControl>
          <FormControl fullWidth sx={{ marginBottom: '2rem' }}>
            <InputLabel>Select Role</InputLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <MenuItem value="On-Site Manager">On-Site Manager</MenuItem>
              <MenuItem value="Recruiter">Recruiter</MenuItem>
              <MenuItem value="Market Manager">Market Manager</MenuItem>
            </Select>
          </FormControl>

          {renderForm()}

          {role && (
            <Button variant="contained" color="primary" sx={{ marginTop: '2rem' }}>
              Submit
            </Button>
          )}
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default DataEntry;
