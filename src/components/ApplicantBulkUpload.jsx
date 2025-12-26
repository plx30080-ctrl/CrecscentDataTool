import React, { useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { CloudUpload, CheckCircle, Warning, Info } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { parseISO, isValid, format } from 'date-fns';
import { useAuth } from '../contexts/AuthProvider';
import { bulkUploadApplicants, checkDuplicateApplicants } from '../services/firestoreService';

const ApplicantBulkUpload = () => {
  const { currentUser } = useAuth();
  const [data, setData] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [replaceAll, setReplaceAll] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [statusBreakdown, setStatusBreakdown] = useState({});

  // Valid status values (case-insensitive matching)
  const VALID_STATUSES = [
    'Started',
    'CB Updated',
    'Rejected',
    'BG Pending',
    'Adjudication Pending',
    'I-9 Pending',
    'Declined',
    'No Contact'
  ];

  const VALID_SHIFTS = ['1st', '2nd', 'Mid'];

  // Column mapping to handle line breaks and variations
  const normalizeColumnName = (col) => {
    const normalized = col.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    const mapping = {
      'Status': 'status',
      'Name': 'name',
      'Phone Number': 'phoneNumber',
      'Email': 'email',
      'CRM Number': 'crmNumber',
      'Process Date': 'processDate',
      'I-9 Cleared': 'i9Cleared',
      'Background Status (Valid, Pending or Flagged)': 'backgroundStatus',
      'Background Status': 'backgroundStatus',
      'Shift': 'shift',
      'Notes': 'notes',
      'Fill': 'fill'
    };

    return mapping[normalized] || normalized.toLowerCase().replace(/\s+/g, '');
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === '') return true; // Optional field
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const normalizePhone = (phone) => {
    if (!phone) return '';
    // Remove all non-numeric characters
    return phone.toString().replace(/\D/g, '');
  };

  const parseExcelDate = (value) => {
    if (!value) return null;

    // If it's already a Date object
    if (value instanceof Date) {
      return isValid(value) ? value : null;
    }

    // If it's an Excel serial number
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return isValid(date) ? date : null;
    }

    // If it's a string, try parsing
    if (typeof value === 'string') {
      const date = parseISO(value);
      if (isValid(date)) return date;

      // Try other formats
      const parsed = new Date(value);
      return isValid(parsed) ? parsed : null;
    }

    return null;
  };

  const validateRow = (row, index) => {
    const errors = [];

    // Required fields
    if (!row.name || row.name.trim() === '') {
      errors.push(`Row ${index + 2}: Missing required field 'name'`);
    }

    if (!row.status || row.status.trim() === '') {
      errors.push(`Row ${index + 2}: Missing required field 'status'`);
    } else {
      // Validate status value
      const normalizedStatus = VALID_STATUSES.find(
        s => s.toLowerCase() === row.status.toLowerCase()
      );
      if (!normalizedStatus) {
        errors.push(`Row ${index + 2}: Invalid status '${row.status}'. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }
    }

    if (!row.crmNumber) {
      errors.push(`Row ${index + 2}: Missing required field 'crmNumber'`);
    }

    if (!row.processDate) {
      errors.push(`Row ${index + 2}: Missing required field 'processDate'`);
    } else {
      const parsed = parseExcelDate(row.processDate);
      if (!parsed) {
        errors.push(`Row ${index + 2}: Invalid date '${row.processDate}'`);
      }
    }

    // Optional field validations
    if (row.email && !validateEmail(row.email)) {
      errors.push(`Row ${index + 2}: Invalid email '${row.email}'`);
    }

    if (row.shift && !VALID_SHIFTS.includes(row.shift)) {
      errors.push(`Row ${index + 2}: Invalid shift '${row.shift}'. Must be one of: ${VALID_SHIFTS.join(', ')}`);
    }

    return errors;
  };

  const processApplicantData = (row) => {
    // Normalize status to match valid values
    const normalizedStatus = VALID_STATUSES.find(
      s => s.toLowerCase() === (row.status || '').toLowerCase()
    ) || row.status;

    return {
      status: normalizedStatus,
      name: row.name?.trim() || '',
      phoneNumber: normalizePhone(row.phoneNumber),
      email: row.email?.trim() || '',
      crmNumber: row.crmNumber?.toString() || '',
      processDate: parseExcelDate(row.processDate),
      i9Cleared: row.i9Cleared === 'Yes' ? 'Yes' : '',
      backgroundStatus: row.backgroundStatus?.trim() || '',
      shift: row.shift || '',
      notes: row.notes?.trim() || '',
      fill: row.fill?.trim() || ''
    };
  };

  const calculateStatusBreakdown = (applicants) => {
    const breakdown = {};
    applicants.forEach(app => {
      breakdown[app.status] = (breakdown[app.status] || 0) + 1;
    });
    return breakdown;
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setError('');
    setSuccess('');
    setValidationErrors([]);
    setDuplicates([]);

    if (!file) {
      setError('No file selected');
      return;
    }

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });

          // Get first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (jsonData.length === 0) {
            setError('Excel file is empty');
            return;
          }

          // Normalize column names
          const normalizedData = jsonData.map(row => {
            const newRow = {};
            Object.keys(row).forEach(key => {
              const normalizedKey = normalizeColumnName(key);
              newRow[normalizedKey] = row[key];
            });
            return newRow;
          });

          // Validate all rows
          const allErrors = [];
          normalizedData.forEach((row, index) => {
            const rowErrors = validateRow(row, index);
            allErrors.push(...rowErrors);
          });

          if (allErrors.length > 0) {
            setValidationErrors(allErrors);
            setShowErrorDialog(true);
            return;
          }

          // Process applicant data
          const processedApplicants = normalizedData.map(row => processApplicantData(row));

          // Check for duplicates
          const crmNumbers = processedApplicants
            .map(a => a.crmNumber)
            .filter(crm => crm); // Filter out empty CRM numbers

          if (crmNumbers.length > 0) {
            const duplicateCheck = await checkDuplicateApplicants(crmNumbers);
            if (duplicateCheck.success && duplicateCheck.duplicates.length > 0) {
              setDuplicates(duplicateCheck.duplicates);
            }
          }

          // Calculate status breakdown
          const breakdown = calculateStatusBreakdown(processedApplicants);
          setStatusBreakdown(breakdown);

          setData(processedApplicants);
          console.log(`Parsed ${processedApplicants.length} applicants from Excel`);
        } catch (parseError) {
          console.error('Error parsing Excel:', parseError);
          setError(`Failed to parse Excel file: ${parseError.message}`);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file');
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Error handling file:', err);
      setError(`Error processing file: ${err.message}`);
    }
  };

  const handleBulkUpload = async () => {
    if (data.length === 0) {
      setError('No data to upload');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    console.log(`Starting bulk upload of ${data.length} applicants...`);
    console.log(`Operation: ${replaceAll ? 'Replace All' : 'Append'}`);

    try {
      const result = await bulkUploadApplicants(data, currentUser.uid, replaceAll);

      if (result.success) {
        const message = `✅ Successfully uploaded ${result.count} applicants!`;
        setSuccess(message);
        setData([]);
        setStatusBreakdown({});
        setDuplicates([]);
        console.log('Upload complete:', result);
      } else {
        setError(`❌ Failed to upload applicants: ${result.error}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`❌ Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadErrorReport = () => {
    const errorText = validationErrors.join('\n');
    const blob = new Blob([errorText], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'validation_errors.txt';
    link.click();
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Applicant Bulk Upload</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ marginBottom: 3 }}>
        Upload Excel files containing applicant data from your recruiting system
      </Typography>

      {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {duplicates.length > 0 && (
        <Alert severity="warning" sx={{ marginBottom: 2 }} icon={<Warning />}>
          <Typography variant="subtitle2" fontWeight="bold">
            {duplicates.length} Duplicate CRM Number(s) Found
          </Typography>
          <Typography variant="body2" sx={{ marginTop: 1 }}>
            The following applicants already exist in the database:
          </Typography>
          <Box sx={{ marginTop: 1, maxHeight: 150, overflowY: 'auto' }}>
            {duplicates.slice(0, 10).map((dup, idx) => (
              <Typography key={idx} variant="caption" display="block">
                • CRM {dup.crmNumber} - {dup.name} ({dup.status})
              </Typography>
            ))}
            {duplicates.length > 10 && (
              <Typography variant="caption" color="text.secondary">
                ...and {duplicates.length - 10} more
              </Typography>
            )}
          </Box>
          <Typography variant="body2" sx={{ marginTop: 1 }}>
            {replaceAll ? 'These will be replaced with new data.' : 'Importing will create duplicate entries.'}
          </Typography>
        </Alert>
      )}

      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Typography variant="h6" gutterBottom>1. Upload Excel File</Typography>
        <Typography variant="body2" sx={{ marginBottom: 2 }}>
          Select an Excel file (.xlsx or .xls) containing applicant data. Maximum file size: 10MB.
        </Typography>

        <Alert severity="info" sx={{ marginBottom: 2 }} icon={<Info />}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Required Columns:</Typography>
          <Typography variant="body2" component="div">
            • <strong>Name</strong> - Full name<br/>
            • <strong>Status</strong> - One of: {VALID_STATUSES.join(', ')}<br/>
            • <strong>CRM Number</strong> - ProLogistix CRM ID<br/>
            • <strong>Process Date</strong> - Date entered into system
          </Typography>

          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ marginTop: 2 }}>Optional Columns:</Typography>
          <Typography variant="body2" component="div">
            • Phone Number, Email, I-9 Cleared, Background Status, Shift, Notes, Fill
          </Typography>
        </Alert>

        <Box sx={{ marginBottom: 2 }}>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="excel-upload"
          />
          <label htmlFor="excel-upload">
            <Button variant="contained" component="span" startIcon={<CloudUpload />}>
              Select Excel File
            </Button>
          </label>
        </Box>

        {data.length > 0 && (
          <Box sx={{ marginTop: 3 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Import Options</FormLabel>
              <RadioGroup
                value={replaceAll ? 'replace' : 'append'}
                onChange={(e) => setReplaceAll(e.target.value === 'replace')}
              >
                <FormControlLabel
                  value="append"
                  control={<Radio />}
                  label="Append New Records (keep existing data)"
                />
                <FormControlLabel
                  value="replace"
                  control={<Radio />}
                  label="Replace All Data (delete existing applicants)"
                />
              </RadioGroup>
            </FormControl>
          </Box>
        )}
      </Paper>

      {data.length > 0 && (
        <>
          <Paper sx={{ padding: 3, marginBottom: 3 }}>
            <Typography variant="h6" gutterBottom>2. Preview & Status Breakdown</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Records: {data.length}
            </Typography>

            <Grid container spacing={2} sx={{ marginTop: 2, marginBottom: 3 }}>
              {Object.keys(statusBreakdown).map((status) => (
                <Grid item xs={6} sm={4} md={3} key={status}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        {status}
                      </Typography>
                      <Typography variant="h4">
                        {statusBreakdown[status]}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle1" gutterBottom sx={{ marginTop: 3 }}>
              Sample Records (first 20 rows)
            </Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Status</strong></TableCell>
                    <TableCell><strong>CRM#</strong></TableCell>
                    <TableCell><strong>Process Date</strong></TableCell>
                    <TableCell><strong>Phone</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Shift</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.slice(0, 20).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Chip label={row.status} size="small" color="primary" />
                      </TableCell>
                      <TableCell>{row.crmNumber}</TableCell>
                      <TableCell>
                        {row.processDate ? format(row.processDate, 'yyyy-MM-dd') : 'N/A'}
                      </TableCell>
                      <TableCell>{row.phoneNumber}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.shift}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {data.length > 20 && (
              <Typography variant="caption" color="text.secondary" sx={{ marginTop: 1, display: 'block' }}>
                Showing first 20 of {data.length} rows
              </Typography>
            )}
          </Paper>

          <Paper sx={{ padding: 3 }}>
            <Typography variant="h6" gutterBottom>3. Confirm Import</Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleBulkUpload}
              disabled={uploading}
              startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircle />}
              size="large"
            >
              {uploading
                ? 'Uploading...'
                : `Import ${data.length} Applicants (${replaceAll ? 'Replace All' : 'Append'})`
              }
            </Button>
          </Paper>
        </>
      )}

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onClose={() => setShowErrorDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Validation Errors</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ marginBottom: 2 }}>
            Found {validationErrors.length} validation error(s). Please fix these errors and try again.
          </Alert>
          <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {validationErrors.map((err, idx) => (
              <Typography key={idx} variant="body2" sx={{ marginBottom: 0.5 }}>
                • {err}
              </Typography>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={downloadErrorReport}>Download Error Report</Button>
          <Button onClick={() => setShowErrorDialog(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicantBulkUpload;
