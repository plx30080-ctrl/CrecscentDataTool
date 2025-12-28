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
    // Skip header rows and process employee data
    let directHours = 0;
    let indirectHours = 0;
    let totalHours = 0;
    let employeeCount = 0;
    const employeeIds = []; // Track all EIDs for applicant status sync

    // Find the data rows (skip headers)
    const startRow = data.findIndex(row =>
      row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('regular'))
    );

    if (startRow === -1) {
      return { directHours: 0, indirectHours: 0, totalHours: 0, employeeCount: 0, employeeIds: [] };
    }

    // Process each employee row
    for (let i = startRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || !row[0]) break; // End of data

      employeeCount++;

      // Extract EID (typically in column 0 or 1 - "File" column)
      const eid = row[1] ? String(row[1]).trim() : null;
      if (eid && eid !== '' && !isNaN(eid)) {
        employeeIds.push(eid);
      }

      // Sum regular hours (columns might vary, this is a general approach)
      // Adjust column indexes based on actual file structure
      const regularHours = parseFloat(row[2]) || 0;
      const overtimeHours = parseFloat(row[3]) || 0;
      const doubleTimeHours = parseFloat(row[4]) || 0;

      const employeeTotalHours = regularHours + overtimeHours + doubleTimeHours;
      totalHours += employeeTotalHours;

      // For now, assume 80/20 split between direct/indirect
      // This should be refined based on actual data structure
      directHours += employeeTotalHours * 0.8;
      indirectHours += employeeTotalHours * 0.2;
    }

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
