import React, { useState } from 'react';
import { Typography, Container, Button, Paper, Box, Alert, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { CloudUpload, CheckCircle } from '@mui/icons-material';
import Papa from 'papaparse';
import { useAuth } from '../contexts/AuthProvider';
import { addShiftData, addHoursData } from '../services/firestoreService';

const EnhancedUpload = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError('');
    setSuccess('');

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setData(results.data.filter(row => row.date));
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
    let successCount = 0;
    let failCount = 0;

    for (const row of data) {
      try {
        if (row.shift && row.numberWorking) {
          await addShiftData({
            date: new Date(row.date),
            shift: row.shift,
            numberRequested: parseInt(row.numberRequested) || 0,
            numberRequired: parseInt(row.numberRequired) || 0,
            numberWorking: parseInt(row.numberWorking) || 0,
            sendHomes: parseInt(row.sendHomes) || 0,
            lineCuts: parseInt(row.lineCuts) || 0,
            newStarts: row.newStarts ? JSON.parse(row.newStarts) : [],
            notes: row.notes || ''
          }, currentUser.uid);
        }

        if (row.shift1Hours || row.shift2Hours) {
          const shift1 = parseFloat(row.shift1Hours) || 0;
          const shift2 = parseFloat(row.shift2Hours) || 0;
          await addHoursData({
            date: new Date(row.date),
            shift1Hours: shift1,
            shift2Hours: shift2,
            totalHours: shift1 + shift2,
            associateHours: []
          }, currentUser.uid);
        }

        successCount++;
      } catch (err) {
        console.error('Error uploading row:', err);
        failCount++;
      }
    }

    setUploading(false);
    if (successCount > 0) {
      setSuccess(`Successfully uploaded ${successCount} records!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      setData([]);
    } else {
      setError(`Failed to upload data. ${failCount} records failed.`);
    }
  };

  const downloadTemplate = () => {
    const template = [{
      date: '2024-01-15',
      shift: '1st',
      numberRequested: '50',
      numberRequired: '45',
      numberWorking: '48',
      sendHomes: '2',
      lineCuts: '1',
      newStarts: '[{"name":"John Doe","eid":"12345"}]',
      shift1Hours: '380',
      shift2Hours: '0',
      notes: 'Sample data'
    }];
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

      {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom>1. Download CSV Template</Typography>
        <Typography variant="body2" sx={{ marginBottom: 2 }}>
          Download the CSV template and fill it with your historical data.
        </Typography>
        <Button variant="outlined" onClick={downloadTemplate} startIcon={<CloudUpload />}>
          Download Template
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
    </Container>
  );
};

export default EnhancedUpload;
