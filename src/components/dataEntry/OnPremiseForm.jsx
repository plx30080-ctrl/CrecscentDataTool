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
import logger from '../../utils/logger';
import { Upload as UploadIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { submitOnPremiseData } from '../../services/dataEntryService';

const SHIFTS = ['1st', '2nd'];

const OnPremiseForm = () => {
  const [formData, setFormData] = useState({
    date: dayjs(),
    shift: '1st',
    requested: '',
    required: '',
    working: '',
    newStarts: '',
    sendHomes: '',
    lineCuts: '',
    notes: ''
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      if (validTypes.includes(file.type)) {
        setUploadedFile(file);
        setMessage({ type: 'success', text: `File "${file.name}" ready for upload` });
      } else {
        setMessage({ type: 'error', text: 'Please upload a valid Excel file (.xls or .xlsx)' });
        event.target.value = '';
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await submitOnPremiseData(formData, uploadedFile);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `On Premise data submitted successfully! ${result.employeesProcessed ? `${result.employeesProcessed} employees processed from file.` : ''}`
        });

        // Reset form
        setFormData({
          date: dayjs(),
          shift: '1st',
          requested: '',
          required: '',
          working: '',
          newStarts: '',
          sendHomes: '',
          lineCuts: '',
          notes: ''
        });
        setUploadedFile(null);
        document.getElementById('file-upload').value = '';
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
        On Premise Data Entry
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

        {/* Headcount Numbers */}
        <Grid item xs={12} md={4}>
          <TextField
            label="Requested"
            type="number"
            fullWidth
            value={formData.requested}
            onChange={(e) => handleChange('requested', e.target.value)}
            placeholder="Number requested"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Required"
            type="number"
            fullWidth
            value={formData.required}
            onChange={(e) => handleChange('required', e.target.value)}
            placeholder="Number required"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Working"
            type="number"
            fullWidth
            value={formData.working}
            onChange={(e) => handleChange('working', e.target.value)}
            placeholder="Number working"
          />
        </Grid>

        {/* Activity Numbers */}
        <Grid item xs={12} md={4}>
          <TextField
            label="New Starts"
            type="number"
            fullWidth
            value={formData.newStarts}
            onChange={(e) => handleChange('newStarts', e.target.value)}
            placeholder="Number of new starts"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Send Homes"
            type="number"
            fullWidth
            value={formData.sendHomes}
            onChange={(e) => handleChange('sendHomes', e.target.value)}
            placeholder="Number sent home"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Line Cuts"
            type="number"
            fullWidth
            value={formData.lineCuts}
            onChange={(e) => handleChange('lineCuts', e.target.value)}
            placeholder="Number of line cuts"
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

        {/* File Upload */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
            >
              Upload Excel File (Optional)
              <input
                id="file-upload"
                type="file"
                hidden
                accept=".xls,.xlsx"
                onChange={handleFileUpload}
              />
            </Button>
            {uploadedFile && (
              <Typography variant="body2" color="text.secondary">
                {uploadedFile.name}
              </Typography>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Upload employee roster file to auto-populate employee data
          </Typography>
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
            {loading ? <CircularProgress size={24} /> : 'Submit On Premise Data'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OnPremiseForm;
