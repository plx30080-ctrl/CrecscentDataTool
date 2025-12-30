import React, { useState } from 'react';
import { Typography, Container, Button, Paper, Box, Alert, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { CloudUpload, CheckCircle, People, BarChart } from '@mui/icons-material';
import Papa from 'papaparse';
import { useAuth } from '../hooks/useAuth';
import { addShiftData, addHoursData } from '../services/firestoreService';
import ApplicantBulkUpload from '../components/ApplicantBulkUpload';
import logger from '../utils/logger';

const EnhancedUpload = () => {
  const { currentUser } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [data, setData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError('');
    setSuccess('');

    if (!file) {
      setError('No file selected');
      return;
    }

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validData = results.data.filter(row => {
          // Must have a date field
          if (!row.date || row.date.trim() === '') {
            return false;
          }
          // Must have at least shift data or hours data
          return (row.shift && row.numberWorking) || (row.shift1Hours || row.shift2Hours);
        });

        if (validData.length === 0) {
          setError('No valid data found in CSV. Please check the format.');
          return;
        }

        setData(validData);
      },
      error: (error) => {
        setError(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const handleBulkUpload = async () => {
    if (data.length === 0) {
      setError('No data to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    let successCount = 0;
    let failCount = 0;
    const errors = [];

    logger.info(`Starting bulk upload of ${data.length} rows...`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Validate and parse date
        const date = new Date(row.date);
        if (isNaN(date.getTime())) {
          const errorMsg = `Row ${i + 1}: Invalid date "${row.date}"`;
          logger.error(errorMsg);
          errors.push(errorMsg);
          failCount++;
          continue;
        }

        if (row.shift && row.numberWorking) {
          // Parse newStarts safely
          let newStarts = [];
          if (row.newStarts && row.newStarts.trim() !== '' && row.newStarts !== '[]') {
            try {
              newStarts = JSON.parse(row.newStarts);
              if (!Array.isArray(newStarts)) {
                newStarts = [];
              }
            } catch (err) {
              logger.warn(`Row ${i + 1}: Failed to parse newStarts, using empty array:`, row.newStarts, err);
              newStarts = [];
            }
          }

          const result = await addShiftData({
            date,
            shift: row.shift,
            numberRequested: parseInt(row.numberRequested) || 0,
            numberRequired: parseInt(row.numberRequired) || 0,
            numberWorking: parseInt(row.numberWorking) || 0,
            sendHomes: parseInt(row.sendHomes) || 0,
            lineCuts: parseInt(row.lineCuts) || 0,
            newStarts,
            notes: row.notes || ''
          }, currentUser.uid);

          if (!result.success) {
            throw new Error(result.error);
          }
        }

        if (row.shift1Hours || row.shift2Hours) {
          const shift1 = parseFloat(row.shift1Hours) || 0;
          const shift2 = parseFloat(row.shift2Hours) || 0;

          const result = await addHoursData({
            date,
            shift1Hours: shift1,
            shift2Hours: shift2,
            totalHours: shift1 + shift2,
            associateHours: []
          }, currentUser.uid);

          if (!result.success) {
            throw new Error(result.error);
          }
        }

        successCount++;
        if (successCount % 10 === 0) {
          logger.info(`Uploaded ${successCount}/${data.length} rows...`);
        }
      } catch (err) {
        const errorMsg = `Row ${i + 1} (${row.date} ${row.shift}): ${err.message}`;
        logger.error(errorMsg);
        errors.push(errorMsg);
        failCount++;
      }
    }

    setUploading(false);
    logger.info(`Upload complete: ${successCount} succeeded, ${failCount} failed`);

    if (successCount > 0) {
      let message = `✅ Successfully uploaded ${successCount} records!`;
      if (failCount > 0) {
        message += ` ⚠️ ${failCount} records failed. Check the console for details.`;
      }
      setSuccess(message);
      setData([]);

      // Show first few errors if any
      if (errors.length > 0) {
        logger.error('Upload errors:', errors);
      }
    } else {
      setError(`❌ Failed to upload data. ${failCount} records failed. Check the console for details.`);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        date: '2024-01-15',
        shift: '1st',
        numberRequested: '50',
        numberRequired: '45',
        numberWorking: '48',
        sendHomes: '2',
        lineCuts: '0',
        newStarts: '[]',
        shift1Hours: '380',
        shift2Hours: '0',
        notes: 'Normal day'
      },
      {
        date: '2024-01-15',
        shift: '2nd',
        numberRequested: '30',
        numberRequired: '28',
        numberWorking: '29',
        sendHomes: '0',
        lineCuts: '1',
        newStarts: '[{"name":"Jane Smith","eid":"67890"}]',
        shift1Hours: '0',
        shift2Hours: '232',
        notes: 'One new hire started'
      },
      {
        date: '2024-01-16',
        shift: '1st',
        numberRequested: '50',
        numberRequired: '45',
        numberWorking: '47',
        sendHomes: '1',
        lineCuts: '0',
        newStarts: '[]',
        shift1Hours: '376',
        shift2Hours: '0',
        notes: ''
      },
      {
        date: '2024-01-16',
        shift: '2nd',
        numberRequested: '30',
        numberRequired: '28',
        numberWorking: '28',
        sendHomes: '0',
        lineCuts: '0',
        newStarts: '[]',
        shift1Hours: '0',
        shift2Hours: '224',
        notes: ''
      },
      {
        date: '2024-01-17',
        shift: '1st',
        numberRequested: '50',
        numberRequired: '45',
        numberWorking: '50',
        sendHomes: '5',
        lineCuts: '0',
        newStarts: '[{"name":"John Doe","eid":"12345"},{"name":"Mary Johnson","eid":"54321"}]',
        shift1Hours: '400',
        shift2Hours: '0',
        notes: 'Overstaffed - two new hires'
      }
    ];
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'workforce_data_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>Bulk Data Upload</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ marginBottom: 3 }}>
        Upload historical data in bulk using CSV (for shift/hours data) or Excel (for applicants)
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="Shift & Hours Data" icon={<BarChart />} iconPosition="start" />
          <Tab label="Applicant Data" icon={<People />} iconPosition="start" />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <Box>
          {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>{error}</Alert>}

          <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom>1. Download CSV Template</Typography>
        <Typography variant="body2" sx={{ marginBottom: 2 }}>
          Download the CSV template and fill it with your historical data. The template includes examples for both 1st and 2nd shifts.
        </Typography>

        <Alert severity="info" sx={{ marginBottom: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Required Fields:</Typography>
          <Typography variant="body2" component="div">
            • <strong>date</strong> - Format: YYYY-MM-DD (e.g., 2024-01-15)<br/>
            • <strong>shift</strong> - Either "1st" or "2nd"<br/>
            • <strong>numberWorking</strong> - Number of associates who showed up<br/>
          </Typography>

          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ marginTop: 2 }}>Optional Fields:</Typography>
          <Typography variant="body2" component="div">
            • <strong>numberRequested</strong> - How many associates you requested<br/>
            • <strong>numberRequired</strong> - Minimum required for operations<br/>
            • <strong>sendHomes</strong> - Number sent home (overstaffed)<br/>
            • <strong>lineCuts</strong> - Number of line cuts that day<br/>
            • <strong>newStarts</strong> - New hires as JSON: <code>[]</code> or <code>[{"{"}name":"John","eid":"123"{"}"}]</code><br/>
            • <strong>shift1Hours</strong> - Total hours worked by 1st shift (0 for 2nd shift rows)<br/>
            • <strong>shift2Hours</strong> - Total hours worked by 2nd shift (0 for 1st shift rows)<br/>
            • <strong>notes</strong> - Any notes for that day/shift
          </Typography>

          <Typography variant="subtitle2" fontWeight="bold" sx={{ marginTop: 2 }}>
            Important: Each date typically needs TWO rows - one for 1st shift and one for 2nd shift.
          </Typography>
        </Alert>

        <Button variant="outlined" onClick={downloadTemplate} startIcon={<CloudUpload />}>
          Download Template (5 Sample Rows)
        </Button>
      </Paper>

      <Paper sx={{ padding: 3 }}>
        <Typography variant="h6" gutterBottom>2. Upload Your CSV File</Typography>
        <Typography variant="body2" sx={{ marginBottom: 2 }}>
          Select your filled CSV file to preview the data before uploading.
        </Typography>

        <Box sx={{ marginBottom: 3 }}>
          <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} id="csv-upload" />
          <label htmlFor="csv-upload">
            <Button variant="contained" component="span" startIcon={<CloudUpload />}>Select CSV File</Button>
          </label>
        </Box>

        {data.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Preview ({data.length} rows)</Typography>
            <TableContainer sx={{ maxHeight: 400, marginBottom: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(data[0]).map((key) => (
                      <TableCell key={key}><strong>{key}</strong></TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value, i) => (
                        <TableCell key={i}>{value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {data.length > 10 && (
              <Typography variant="caption" color="text.secondary">Showing first 10 of {data.length} rows</Typography>
            )}

            <Button
              variant="contained"
              color="primary"
              onClick={handleBulkUpload}
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircle />}
              sx={{ marginTop: 2 }}
            >
              {uploading ? 'Uploading...' : `Upload ${data.length} Records to Firestore`}
            </Button>
          </Box>
        )}
      </Paper>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <ApplicantBulkUpload />
        </Box>
      )}
    </Container>
  );
};

export default EnhancedUpload;
