import React, { useState } from 'react';
import {
  Box,
  Grid,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Upload as UploadIcon } from '@mui/icons-material';
import dayjs from 'dayjs';
import { submitLaborReport } from '../../services/dataEntryService';

const LaborReportForm = () => {
  const [formData, setFormData] = useState({
    weekEnding: dayjs()
  });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (validTypes.includes(file.type)) {
        setUploadedFile(file);
        setLoading(true);
        setMessage({ type: 'info', text: 'Parsing file...' });

        try {
          // Parse the file
          const XLSX = await import('xlsx');
          const reader = new FileReader();

          reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            // Calculate totals
            const totals = calculateHours(jsonData);
            setParsedData(totals);
            setMessage({
              type: 'success',
              text: `File parsed successfully! ${totals.employeeCount} employees, ${totals.totalHours.toFixed(2)} total hours.`
            });
            setLoading(false);
          };

          reader.readAsArrayBuffer(file);
        } catch (error) {
          console.error('Parse error:', error);
          setMessage({ type: 'error', text: 'Failed to parse file' });
          setLoading(false);
        }
      } else {
        setMessage({ type: 'error', text: 'Please upload a valid Excel file (.xls or .xlsx)' });
        event.target.value = '';
      }
    }
  };

  const calculateHours = (data) => {
    console.log('=== Labor Report Parser Debug ===');
    console.log('Total rows in file:', data.length);

    // Log first 10 rows for debugging
    console.log('\nFirst 10 rows:');
    data.slice(0, 10).forEach((row, i) => {
      console.log(`Row ${i}:`, row);
    });

    let directHours = 0;
    let indirectHours = 0;
    let totalHours = 0;
    let employeeCount = 0;
    const employeeIds = []; // Track all EIDs for applicant status sync

    // Try multiple strategies to find the data start

    // Strategy 1: Look for "regular" in any cell
    let startRow = data.findIndex(row =>
      row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('regular'))
    );

    // Strategy 2: Look for "dept" or "department" (common header)
    if (startRow === -1) {
      startRow = data.findIndex(row =>
        row.some(cell => typeof cell === 'string' && (
          cell.toLowerCase().includes('dept') ||
          cell.toLowerCase().includes('name') && row.some(c => typeof c === 'string' && c.toLowerCase().includes('hours'))
        ))
      );
    }

    // Strategy 3: Look for first row with numbers in multiple columns (likely employee data)
    if (startRow === -1) {
      startRow = data.findIndex((row, idx) => {
        if (idx < 5) return false; // Skip first 5 rows (likely headers/title)
        const numberCount = row.filter(cell => !isNaN(parseFloat(cell)) && cell !== '').length;
        return numberCount >= 3; // At least 3 numeric cells
      });
      if (startRow !== -1) startRow--; // Go back one row to include the header
    }

    console.log('\nData start row:', startRow);

    if (startRow === -1) {
      console.warn('Could not find data start row!');
      return { directHours: 0, indirectHours: 0, totalHours: 0, employeeCount: 0, employeeIds: [] };
    }

    // Process each employee row
    for (let i = startRow + 1; i < data.length; i++) {
      const row = data[i];

      // Stop if row is empty or doesn't have enough data
      if (!row || row.length === 0) break;

      // Skip rows that don't look like employee data (no numbers)
      const hasNumbers = row.some(cell => !isNaN(parseFloat(cell)) && cell !== '');
      if (!hasNumbers) {
        console.log(`Skipping row ${i} (no numbers):`, row);
        continue;
      }

      employeeCount++;
      console.log(`Processing employee row ${i}:`, row);

      // Extract EID - try columns 0-2 (File/EID column varies)
      let eid = null;
      for (let col = 0; col <= 2; col++) {
        const potential = row[col] ? String(row[col]).trim() : null;
        if (potential && !isNaN(potential) && potential.length >= 5 && potential.length <= 8) {
          eid = potential;
          break;
        }
      }

      if (eid) {
        employeeIds.push(eid);
      }

      // Find all numeric columns (likely hours)
      const numericValues = row
        .map((cell, idx) => ({ value: parseFloat(cell), idx }))
        .filter(({ value }) => !isNaN(value) && value > 0);

      console.log(`  Numeric values found:`, numericValues);

      // Sum all hours (conservative approach - sum all numeric columns)
      const employeeTotalHours = numericValues.reduce((sum, { value }) => sum + value, 0);
      totalHours += employeeTotalHours;

      // Assume 80/20 direct/indirect split
      directHours += employeeTotalHours * 0.8;
      indirectHours += employeeTotalHours * 0.2;
    }

    console.log('\n=== Parse Results ===');
    console.log('Employees found:', employeeCount);
    console.log('Total hours:', totalHours);
    console.log('Employee IDs:', employeeIds);

    return {
      directHours: Math.round(directHours * 100) / 100,
      indirectHours: Math.round(indirectHours * 100) / 100,
      totalHours: Math.round(totalHours * 100) / 100,
      employeeCount,
      employeeIds: [...new Set(employeeIds)] // Remove duplicates
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!uploadedFile || !parsedData) {
      setMessage({ type: 'error', text: 'Please upload and parse a file first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await submitLaborReport({
        ...formData,
        ...parsedData,
        fileName: uploadedFile.name
      });

      if (result.success) {
        const statusMessage = result.statusesUpdated > 0
          ? `Labor report submitted successfully! ${result.statusesUpdated} applicant(s) marked as "Started".`
          : 'Labor report submitted successfully!';

        setMessage({
          type: 'success',
          text: statusMessage
        });

        // Reset form
        setFormData({ weekEnding: dayjs() });
        setUploadedFile(null);
        setParsedData(null);
        document.getElementById('labor-file-upload').value = '';
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to submit report' });
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
        Labor Report Upload
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
            onChange={(newValue) => setFormData(prev => ({ ...prev, weekEnding: newValue }))}
            slotProps={{ textField: { fullWidth: true, required: true } }}
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
              Upload Labor Report Excel File
              <input
                id="labor-file-upload"
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
            Upload weekly labor report to auto-calculate hours
          </Typography>
        </Grid>

        {/* Parsed Data Summary */}
        {parsedData && (
          <Grid item xs={12}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Metric</strong></TableCell>
                    <TableCell align="right"><strong>Hours</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Direct Hours</TableCell>
                    <TableCell align="right">{parsedData.directHours.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Indirect Hours</TableCell>
                    <TableCell align="right">{parsedData.indirectHours.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><strong>Total Hours</strong></TableCell>
                    <TableCell align="right"><strong>{parsedData.totalHours.toFixed(2)}</strong></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Employees</TableCell>
                    <TableCell align="right">{parsedData.employeeCount}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        )}

        {/* Submit Button */}
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !parsedData}
            sx={{ minWidth: 200 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Submit Labor Report'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LaborReportForm;
