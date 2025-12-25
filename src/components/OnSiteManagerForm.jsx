import React from 'react';
import { Typography, Paper, TextField, Button } from '@mui/material';

const OnSiteManagerForm = () => {
  return (
    <Paper sx={{ padding: '2rem' }}>
      <Typography variant="h5" gutterBottom>
        On-Site Manager Form
      </Typography>
      <form>
        <TextField
          label="Per-Shift Attendance"
          variant="outlined"
          fullWidth
          sx={{ marginBottom: '1rem' }}
        />
        <TextField
          label="Client Requests"
          variant="outlined"
          fullWidth
          sx={{ marginBottom: '1rem' }}
        />
        <TextField
          label="New Starts"
          variant="outlined"
          fullWidth
          sx={{ marginBottom: '1rem' }}
        />
        <Button variant="contained" color="primary">
          Submit
        </Button>
      </form>
    </Paper>
  );
};

export default OnSiteManagerForm;
