import React, { useState } from 'react';
import { Typography, Container, Button, Paper, Box } from '@mui/material';
import Papa from 'papaparse';

const Upload = () => {
  const [data, setData] = useState([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setData(results.data);
        console.log(results.data);
      },
    });
  };

  const downloadTemplate = () => {
    const template = [
      { date: '', forecasted_headcount: '', actual_headcount: '', applicants_processed: '', applicants_started: '', per_shift_attendance: '', client_requests: '', new_starts: '' },
    ];
    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Upload Historical Data
      </Typography>
      <Paper sx={{ padding: '2rem' }}>
        <Typography variant="h6" gutterBottom>
          Download Template
        </Typography>
        <Typography variant="body1" sx={{ marginBottom: '1rem' }}>
          Download the CSV template to ensure your data is in the correct format for uploading.
        </Typography>
        <Button variant="contained" onClick={downloadTemplate} sx={{ marginBottom: '2rem' }}>
          Download Template
        </Button>

        <Typography variant="h6" gutterBottom>
          Upload File
        </Typography>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          style={{ marginBottom: '2rem' }}
        />

        {data.length > 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Uploaded Data
            </Typography>
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Upload;
