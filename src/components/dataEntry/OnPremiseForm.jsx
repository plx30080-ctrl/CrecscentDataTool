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
  MenuItem,
  Chip,
  InputAdornment
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon, Warning, Search as SearchIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import logger from '../../utils/logger';
import { Upload as UploadIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { submitOnPremiseData } from '../../services/dataEntryService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

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

  const [newStartEIDs, setNewStartEIDs] = useState([]);
  const [eidValidation, setEidValidation] = useState([]); // Array of { eid, status, message, applicantData }
  const [validatingEID, setValidatingEID] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'newStarts') {
      const count = parseInt(value) || 0;
      setNewStartEIDs(prev => {
        const newArr = [...prev];
        if (count > prev.length) {
          // Add empty strings
          for (let i = prev.length; i < count; i++) newArr.push('');
        } else {
          // Trim array
          newArr.length = count;
        }
        return newArr;
      });
      setEidValidation(prev => {
        const newArr = [...prev];
        if (count > prev.length) {
          for (let i = prev.length; i < count; i++) newArr.push(null);
        } else {
          newArr.length = count;
        }
        return newArr;
      });
    }
  };

  const validateAndSetEID = async (index, value) => {
    // Update the EID value
    setNewStartEIDs(prev => {
      const newArr = [...prev];
      newArr[index] = value;
      return newArr;
    });

    // Clear validation for empty value
    if (!value || !value.trim()) {
      setEidValidation(prev => {
        const newArr = [...prev];
        newArr[index] = null;
        return newArr;
      });
      return;
    }

    // Start validation
    setValidatingEID(index);

    try {
      // Search for applicant by EID
      const eidQuery = query(
        collection(db, 'applicants'),
        where('eid', '==', value.trim())
      );
      const eidSnapshot = await getDocs(eidQuery);

      // Also check crmNumber as fallback
      let applicantData = null;
      if (!eidSnapshot.empty) {
        applicantData = { id: eidSnapshot.docs[0].id, ...eidSnapshot.docs[0].data() };
      } else {
        const crmQuery = query(
          collection(db, 'applicants'),
          where('crmNumber', '==', value.trim())
        );
        const crmSnapshot = await getDocs(crmQuery);
        if (!crmSnapshot.empty) {
          applicantData = { id: crmSnapshot.docs[0].id, ...crmSnapshot.docs[0].data() };
        }
      }

      if (!applicantData) {
        // EID not found
        setEidValidation(prev => {
          const newArr = [...prev];
          newArr[index] = {
            eid: value.trim(),
            status: 'error',
            message: 'EID not found in applicant system',
            applicantData: null
          };
          return newArr;
        });
      } else {
        // EID found - check status
        const finalizedStatuses = ['CB Updated', 'Finalized'];
        const name = applicantData.firstName && applicantData.lastName
          ? `${applicantData.firstName} ${applicantData.lastName}`
          : applicantData.name || 'N/A';

        if (finalizedStatuses.includes(applicantData.status)) {
          setEidValidation(prev => {
            const newArr = [...prev];
            newArr[index] = {
              eid: value.trim(),
              status: 'success',
              message: `${name} - Status: ${applicantData.status}`,
              applicantData
            };
            return newArr;
          });
        } else {
          setEidValidation(prev => {
            const newArr = [...prev];
            newArr[index] = {
              eid: value.trim(),
              status: 'warning',
              message: `${name} - Status: ${applicantData.status} (Not finalized)`,
              applicantData
            };
            return newArr;
          });
        }
      }
    } catch (error) {
      logger.error('Error validating EID:', error);
      setEidValidation(prev => {
        const newArr = [...prev];
        newArr[index] = {
          eid: value.trim(),
          status: 'error',
          message: 'Error validating EID',
          applicantData: null
        };
        return newArr;
      });
    } finally {
      setValidatingEID(null);
    }
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
      // Validate all EIDs before submission
      const hasErrors = eidValidation.some(v => v && v.status === 'error');
      if (hasErrors) {
        setMessage({ type: 'error', text: 'Please fix all EID errors before submitting' });
        setLoading(false);
        return;
      }

      const result = await submitOnPremiseData({ ...formData, newStartEIDs, eidValidation }, uploadedFile);

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
        setNewStartEIDs([]);
        setEidValidation([]);
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

        {/* New Start EIDs */}
        {newStartEIDs.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Enter New Start EIDs (to update applicant status):
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              System will validate each EID and display the applicant's current status
            </Typography>
            <Grid container spacing={2}>
              {newStartEIDs.map((eid, index) => {
                const validation = eidValidation[index];
                const isValidating = validatingEID === index;
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <TextField
                      label={`New Start #${index + 1} EID`}
                      fullWidth
                      size="small"
                      value={eid}
                      onChange={(e) => validateAndSetEID(index, e.target.value)}
                      placeholder="Enter EID"
                      error={validation?.status === 'error'}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            {isValidating ? (
                              <CircularProgress size={20} />
                            ) : validation?.status === 'success' ? (
                              <CheckCircle color="success" />
                            ) : validation?.status === 'warning' ? (
                              <Warning color="warning" />
                            ) : validation?.status === 'error' ? (
                              <ErrorIcon color="error" />
                            ) : null}
                          </InputAdornment>
                        )
                      }}
                    />
                    {validation && validation.message && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 0.5,
                          color: validation.status === 'success' ? 'success.main' :
                                 validation.status === 'warning' ? 'warning.main' : 'error.main'
                        }}
                      >
                        {validation.message}
                      </Typography>
                    )}
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        )}

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
