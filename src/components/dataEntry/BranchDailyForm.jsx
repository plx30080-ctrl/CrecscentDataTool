import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { submitBranchDaily } from '../../services/dataEntryService';

const SHIFTS = ['1st', '2nd', '3rd', 'Mid'];

const BranchDailyForm = () => {
  const [formData, setFormData] = useState({
    date: dayjs(),
    shift: '1st',
    interviewsScheduled: '',
    interviewShows: '',
    shiftsProcessed: '',
    confirmations: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await submitBranchDaily(formData);

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Branch daily metrics submitted successfully!'
        });

        // Reset form
        setFormData({
          date: dayjs(),
          shift: '1st',
          interviewsScheduled: '',
          interviewShows: '',
          shiftsProcessed: '',
          confirmations: '',
          notes: ''
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit data' });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setMessage({ type: 'error', text: error.message || 'An error occurred during submission' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Branch Daily Metrics
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Date and Shift */}
        <Grid item xs={12} md={6}>
          <DatePicker
            label="Date"
            value={formData.date}
            onChange={(newValue) => handleChange('date', newValue)}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>Shift</InputLabel>
            <Select
              value={formData.shift}
              label="Shift"
              onChange={(e) => handleChange('shift', e.target.value)}
            >
              {SHIFTS.map((shift) => (
                <MenuItem key={shift} value={shift}>
                  {shift} Shift
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Recruiting Metrics */}
        <Grid item xs={12} md={6}>
          <TextField
            label="Interviews Scheduled"
            type="number"
            fullWidth
            required
            value={formData.interviewsScheduled}
            onChange={(e) => handleChange('interviewsScheduled', e.target.value)}
            placeholder="Number of interviews scheduled"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Interview Shows"
            type="number"
            fullWidth
            required
            value={formData.interviewShows}
            onChange={(e) => handleChange('interviewShows', e.target.value)}
            placeholder="Number who showed up"
            inputProps={{ min: 0 }}
          />
        </Grid>

        {/* Processing Metrics */}
        <Grid item xs={12} md={6}>
          <TextField
            label="Shifts Processed"
            type="number"
            fullWidth
            required
            value={formData.shiftsProcessed}
            onChange={(e) => handleChange('shiftsProcessed', e.target.value)}
            placeholder="Number of shifts processed"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Confirmations"
            type="number"
            fullWidth
            required
            value={formData.confirmations}
            onChange={(e) => handleChange('confirmations', e.target.value)}
            placeholder="Number of confirmations"
            inputProps={{ min: 0 }}
          />
        </Grid>

        {/* Notes */}
        <Grid item xs={12}>
          <TextField
            label="Notes"
            fullWidth
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Add any additional notes..."
          />
        </Grid>

        {/* Submit Button */}
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ minWidth: 200 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Daily Metrics'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BranchDailyForm;
