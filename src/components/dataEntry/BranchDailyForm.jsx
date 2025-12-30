import React, { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import logger from '../../utils/logger';
import { submitBranchDaily } from '../../services/dataEntryService';

const BranchDailyForm = () => {
  const [formData, setFormData] = useState({
    date: dayjs(),
    interviewsScheduled: '',
    interviewShows: '',
    shift1Processed: '',
    shift2Processed: '',
    shift2Confirmations: '',
    nextDayConfirmations: '',
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
          interviewsScheduled: '',
          interviewShows: '',
          shift1Processed: '',
          shift2Processed: '',
          shift2Confirmations: '',
          nextDayConfirmations: '',
          notes: ''
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit data' });
      }
    } catch (error) {
      logger.error('Submit error:', error);
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
        {/* Date */}
        <Grid item xs={12}>
          <DatePicker
            label="Date"
            value={formData.date}
            onChange={(newValue) => handleChange('date', newValue)}
            slotProps={{ textField: { fullWidth: true, required: true } }}
          />
        </Grid>

        {/* Recruiting Metrics */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Interview Metrics
          </Typography>
        </Grid>
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

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
        </Grid>

        {/* Processing Metrics - Both Shifts */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Processing Metrics
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="1st Shift Processed"
            type="number"
            fullWidth
            required
            value={formData.shift1Processed}
            onChange={(e) => handleChange('shift1Processed', e.target.value)}
            placeholder="Number processed in 1st shift"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="2nd Shift Processed"
            type="number"
            fullWidth
            required
            value={formData.shift2Processed}
            onChange={(e) => handleChange('shift2Processed', e.target.value)}
            placeholder="Number processed in 2nd shift"
            inputProps={{ min: 0 }}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
        </Grid>

        {/* Confirmations */}
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Confirmations
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="2nd Shift Confirmations"
            type="number"
            fullWidth
            required
            value={formData.shift2Confirmations}
            onChange={(e) => handleChange('shift2Confirmations', e.target.value)}
            placeholder="Confirmations for 2nd shift"
            inputProps={{ min: 0 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            label="Next Day Confirmations"
            type="number"
            fullWidth
            required
            value={formData.nextDayConfirmations}
            onChange={(e) => handleChange('nextDayConfirmations', e.target.value)}
            placeholder="Confirmations for next day"
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
