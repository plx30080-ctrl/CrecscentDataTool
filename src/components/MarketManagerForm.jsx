import React from 'react';
import { Typography, Paper, TextField, Button } from '@mui/material';

const MarketManagerForm = () => {
  return (
    <Paper sx={{ padding: '2rem' }}>
      <Typography variant="h5" gutterBottom>
        Market Manager Form
      </Typography>
      <form>
        <TextField
          label="Forecasted Headcount"
          variant="outlined"
          fullWidth
          sx={{ marginBottom: '1rem' }}
        />
        <TextField
          label="Actual Headcount"
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

export default MarketManagerForm;
