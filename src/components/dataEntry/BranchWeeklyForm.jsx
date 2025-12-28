import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { submitBranchWeekly } from '../../services/dataEntryService';

const BranchWeeklyForm = () => {
  const [formData, setFormData] = useState({
    weekEnding: dayjs(),
    totalApplicants: '',
    totalProcessed: '',
    totalHeadcount: '',
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
      const result = await submitBranchWeekly(formData);

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'Branch weekly metrics submitted successfully!'
        });

        // Reset form
        setFormData({
          weekEnding: dayjs(),
          totalApplicants: '',
          totalProcessed: '',
          totalHeadcount: '',
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
        Branch Weekly Metrics
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Week Ending Date */}
        <Grid item xs={12} md={6}>
          <DatePicker
            label="Week Ending"
            value={formData.weekEnding}
            onChange={(newValue) => handleChange('weekEnding', newValue)}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />
        </Grid>

        {/* Weekly Metrics */}
        <Grid item xs={12} md={4}>
          <TextField
            label="Total Applicants"
            type="number"
            fullWidth
            required
            value={formData.totalApplicants}
            onChange={(e) => handleChange('totalApplicants', e.target.value)}
            placeholder="Total applicants this week"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Total Processed"
            type="number"
            fullWidth
            required
            value={formData.totalProcessed}
            onChange={(e) => handleChange('totalProcessed', e.target.value)}
            placeholder="Total processed this week"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Total Headcount"
            type="number"
            fullWidth
            required
            value={formData.totalHeadcount}
            onChange={(e) => handleChange('totalHeadcount', e.target.value)}
            placeholder="Total headcount"
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
            placeholder="Add any additional notes about the week..."
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
            {loading ? <CircularProgress size={24} /> : 'Submit Weekly Metrics'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default BranchWeeklyForm;
