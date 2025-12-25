import React from 'react';
import { Typography, Paper, TextField, Button } from '@mui/material';

const RecruiterForm = () => {
  return (
    <Paper sx={{ padding: '2rem' }}>
      <Typography variant="h5" gutterBottom>
        Recruiter Form
      </Typography>
      <form>
        <TextField
          label="Applicants Processed"
          variant="outlined"
          fullWidth
          sx={{ marginBottom: '1rem' }}
        />
        <TextField
          label="Applicants Started"
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

export default RecruiterForm;
