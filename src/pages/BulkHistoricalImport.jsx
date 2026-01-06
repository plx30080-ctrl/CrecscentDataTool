import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Upload,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  ExpandMore,
  CloudUpload,
  Visibility,
  Delete,
  Refresh
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { bulkUploadApplicants } from '../services/firestoreService';
import { bulkUploadEarlyLeaves, bulkUploadDNR } from '../services/earlyLeaveService';
import {
  bulkImportApplicants,
  bulkImportAssignments,
  bulkImportLaborReports,
  bulkImportBadges
} from '../services/bulkImportService';
import dayjs from 'dayjs';
import { parseLaborReportFile } from '../utils/laborParser';

const DATA_TYPES = {
  APPLICANTS: {
    label: 'Applicant Pipeline',
    description: 'Applicant data with status, dates, and information',
    expectedColumns: ['name', 'eid', 'status', 'processDate'],
    collection: 'applicants'
  },
  ASSIGNMENTS: {
    label: 'Assignment Starts',
    description: 'Historical assignment start data',
    expectedColumns: ['eid', 'name', 'startDate', 'position', 'shift'],
    collection: 'associates'
  },
  LABOR_REPORTS: {
    label: 'Labor Reports',
    description: 'Weekly labor reports with daily breakdown and totals',
    expectedColumns: ['weekEnding', 'totalHours', 'employeeCount', 'dailyBreakdown'],
    collection: 'laborReports'
  },
  EARLY_LEAVES: {
    label: 'Early Leaves',
    description: 'Early leave records with reasons and actions',
    expectedColumns: ['date', 'eid', 'associateName', 'timeLeft', 'reason'],
    collection: 'earlyLeaves'
  },
  DNR: {
    label: 'DNR List',
    description: 'Do Not Return list',
    expectedColumns: ['eid', 'name', 'reason', 'dateAdded'],
    collection: 'dnrDatabase'
  },
  BADGES: {
    label: 'Badge System Export',
    description: 'Badge data with photos (requires photo folder)',
    expectedColumns: ['eid', 'name', 'position', 'shift'],
    collection: 'badges',
    requiresPhotos: true
  }
};

const STEPS = ['Upload Files', 'Review Data', 'Validate', 'Import'];

const BulkHistoricalImport = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [parsedData, setParsedData] = useState({});
  const [validationResults, setValidationResults] = useState({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [message, setMessage] = useState(null);
  const [photoFolder, setPhotoFolder] = useState(null);

  // Step 1: File Upload
  const handleFileUpload = (dataType, event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFiles(prev => ({ ...prev, [dataType]: file }));
    parseFile(dataType, file);
  };

  const handlePhotoFolderUpload = (event) => {
    const files = Array.from(event.target.files);
    setPhotoFolder(files);
    setMessage({ type: 'info', text: `Loaded ${files.length} photo files` });
  };

  const parseFile = async (dataType, file) => {
    try {
      const text = await file.text();
      let data;

      if (file.name.endsWith('.csv')) {
        const results = Papa.parse(text, { header: true });
        data = results.data.filter(row => Object.values(row).some(v => v)); // Remove empty rows
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        if (dataType === 'LABOR_REPORTS') {
          const parsed = parseLaborReportFile(arrayBuffer, file.name);
          data = parsed ? [parsed] : [];
        } else {
          const workbook = XLSX.read(arrayBuffer);
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(firstSheet);
        }
      } else {
        throw new Error('Unsupported file format. Use CSV or Excel files.');
      }

      setParsedData(prev => ({ ...prev, [dataType]: data }));
      setMessage({ type: 'success', text: `Parsed ${data.length} rows from ${file.name}` });
    } catch (error) {
      setMessage({ type: 'error', text: `Error parsing file: ${error.message}` });
    }
  };

  // Step 2: Validate Data
  const validateData = () => {
    const results = {};

    Object.keys(parsedData).forEach(dataType => {
      const data = parsedData[dataType];
      const config = DATA_TYPES[dataType];
      const errors = [];
      const warnings = [];

      if (!data || data.length === 0) {
        errors.push('No data found');
        results[dataType] = { errors, warnings, valid: false };
        return;
      }

      // Check for required columns
      const firstRow = data[0];
      const columns = Object.keys(firstRow);
      const missingColumns = config.expectedColumns.filter(col => 
        !columns.some(c => c.toLowerCase().includes(col.toLowerCase()))
      );

      if (missingColumns.length > 0) {
        errors.push(`Missing columns: ${missingColumns.join(', ')}`);
      }

      // Data-specific validation
      switch (dataType) {
        case 'APPLICANTS':
          data.forEach((row, index) => {
            if (!row.name && !row.firstName && !row.lastName) {
              errors.push(`Row ${index + 1}: Missing name`);
            }
            if (!row.eid && !row.crmNumber) {
              warnings.push(`Row ${index + 1}: Missing EID`);
            }
          });
          break;

        case 'EARLY_LEAVES':
          data.forEach((row, index) => {
            if (!row.eid) {
              errors.push(`Row ${index + 1}: Missing EID`);
            }
            if (!row.date) {
              errors.push(`Row ${index + 1}: Missing date`);
            }
          });
          break;

        case 'LABOR_REPORTS':
          data.forEach((row, index) => {
            if (!row.weekEnding) {
              errors.push(`Row ${index + 1}: Missing week ending`);
            }
            if (!row.dailyBreakdown) {
              errors.push(`Row ${index + 1}: Missing daily breakdown`);
            }
            if (!row.totalHours) {
              warnings.push(`Row ${index + 1}: Missing totalHours (will compute from dailyBreakdown if present)`);
            }
            if (!row.employeeCount && (!row.employeeDetails || row.employeeDetails.length === 0)) {
              warnings.push(`Row ${index + 1}: Missing employee count; set from employeeDetails length if available`);
            }
          });
          break;

        case 'DNR':
          data.forEach((row, index) => {
            if (!row.eid && !row.name) {
              errors.push(`Row ${index + 1}: Missing EID or name`);
            }
          });
          break;

        case 'BADGES':
          if (!photoFolder || photoFolder.length === 0) {
            warnings.push('No photo folder uploaded. Badges will be created without photos.');
          }
          break;
      }

      results[dataType] = {
        errors,
        warnings,
        valid: errors.length === 0,
        rowCount: data.length
      };
    });

    setValidationResults(results);
    return Object.values(results).every(r => r.valid);
  };

  // Step 3: Import Data
  const handleImport = async () => {
    setImporting(true);
    setImportProgress(0);
    const totalTypes = Object.keys(parsedData).length;
    let completed = 0;

    try {
      for (const [dataType, data] of Object.entries(parsedData)) {
        setMessage({ 
          type: 'info', 
          text: `Importing ${DATA_TYPES[dataType].label}...` 
        });

        switch (dataType) {
          case 'APPLICANTS':
            await bulkImportApplicants(data);
            break;

          case 'EARLY_LEAVES':
            await bulkUploadEarlyLeaves(data);
            break;

          case 'DNR':
            await bulkUploadDNR(data);
            break;

          case 'LABOR_REPORTS':
            await bulkImportLaborReports(data);
            break;

          case 'ASSIGNMENTS':
            await bulkImportAssignments(data);
            break;

          case 'BADGES':
            await bulkImportBadges(data, photoFolder);
            break;
        }

        completed++;
        setImportProgress((completed / totalTypes) * 100);
      }

      setMessage({ 
        type: 'success', 
        text: 'All data imported successfully!' 
      });
      setActiveStep(3);
    } catch (error) {
      console.error('Import error:', error);
      setMessage({ 
        type: 'error', 
        text: `Import failed: ${error.message}` 
      });
    } finally {
      setImporting(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 1) {
      // Run validation but still advance so users can view detailed results
      const isValid = validateData();
      if (!isValid) {
        setMessage({ 
          type: 'error', 
          text: 'Please review validation results before importing' 
        });
      }
      setActiveStep(2);
      return;
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setUploadedFiles({});
    setParsedData({});
    setValidationResults({});
    setPhotoFolder(null);
    setMessage(null);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Bulk Historical Data Import
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Import multiple years of historical data with validation and preview
        </Typography>

        <Stepper activeStep={activeStep} sx={{ my: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {message && (
          <Alert 
            severity={message.type} 
            sx={{ mb: 3 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* Step 1: Upload Files */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 1: Upload Your Data Files
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Upload CSV or Excel files for each data category. You can upload multiple categories at once.
            </Typography>

            <Grid container spacing={3}>
              {Object.entries(DATA_TYPES).map(([key, config]) => (
                <Grid item xs={12} md={6} key={key}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {config.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {config.description}
                      </Typography>
                      <Typography variant="caption" display="block" gutterBottom>
                        Expected columns: {config.expectedColumns.join(', ')}
                      </Typography>

                      <Button
                        variant={uploadedFiles[key] ? 'outlined' : 'contained'}
                        component="label"
                        startIcon={uploadedFiles[key] ? <CheckCircle /> : <Upload />}
                        fullWidth
                        sx={{ mt: 2 }}
                      >
                        {uploadedFiles[key] ? uploadedFiles[key].name : 'Choose File'}
                        <input
                          type="file"
                          hidden
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => handleFileUpload(key, e)}
                        />
                      </Button>

                      {parsedData[key] && (
                        <Chip 
                          label={`${parsedData[key].length} rows`}
                          color="success"
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      )}

                      {config.requiresPhotos && (
                        <Box sx={{ mt: 2 }}>
                          <Button
                            variant="outlined"
                            component="label"
                            startIcon={<CloudUpload />}
                            fullWidth
                            size="small"
                          >
                            Upload Photo Folder
                            <input
                              type="file"
                              hidden
                              multiple
                              webkitdirectory=""
                              directory=""
                              onChange={handlePhotoFolderUpload}
                            />
                          </Button>
                          {photoFolder && (
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {photoFolder.length} photos loaded
                            </Typography>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 2: Review Data */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 2: Review Uploaded Data
            </Typography>
            
            {Object.entries(parsedData).map(([dataType, data]) => (
              <Accordion key={dataType} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography variant="h6">
                      {DATA_TYPES[dataType].label}
                    </Typography>
                    <Chip label={`${data.length} rows`} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {Object.keys(data[0] || {}).slice(0, 8).map(column => (
                            <TableCell key={column}>
                              <strong>{column}</strong>
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).slice(0, 8).map((value, i) => (
                              <TableCell key={i}>
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {data.length > 10 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Showing first 10 of {data.length} rows
                    </Typography>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        )}

        {/* Step 3: Validation Results */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 3: Validation Results
            </Typography>

            {Object.entries(validationResults).map(([dataType, result]) => (
              <Card key={dataType} sx={{ mb: 2 }} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    {result.valid ? (
                      <CheckCircle color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                    <Typography variant="h6">
                      {DATA_TYPES[dataType].label}
                    </Typography>
                    <Chip 
                      label={result.valid ? 'Valid' : 'Has Errors'}
                      color={result.valid ? 'success' : 'error'}
                      size="small"
                    />
                    <Chip label={`${result.rowCount} rows`} size="small" />
                  </Box>

                  {result.errors.length > 0 && (
                    <Alert severity="error" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Errors:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {result.errors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  {result.warnings.length > 0 && (
                    <Alert severity="warning">
                      <Typography variant="subtitle2" gutterBottom>
                        Warnings:
                      </Typography>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {result.warnings.map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}

                  {result.valid && result.errors.length === 0 && result.warnings.length === 0 && (
                    <Alert severity="success">
                      All validation checks passed. Ready to import!
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        )}

        {/* Step 4: Import Progress */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Step 4: Import Complete!
            </Typography>

            {importing && (
              <Box sx={{ mb: 3 }}>
                <LinearProgress variant="determinate" value={importProgress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {Math.round(importProgress)}% complete
                </Typography>
              </Box>
            )}

            {!importing && (
              <Alert severity="success" sx={{ mb: 3 }}>
                All historical data has been successfully imported!
              </Alert>
            )}

            <Grid container spacing={2}>
              {Object.entries(parsedData).map(([dataType, data]) => (
                <Grid item xs={12} sm={6} md={4} key={dataType}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary">
                        {data.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {DATA_TYPES[dataType].label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleReset}
              sx={{ mt: 3 }}
            >
              Import More Data
            </Button>
          </Box>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            disabled={activeStep === 0 || importing}
            onClick={handleBack}
          >
            Back
          </Button>
          <Box>
            {activeStep < 2 && (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={Object.keys(parsedData).length === 0}
              >
                Next
              </Button>
            )}
            {activeStep === 2 && (
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={!Object.values(validationResults).every(r => r.valid) || importing}
                startIcon={importing ? <LinearProgress /> : <CloudUpload />}
              >
                {importing ? 'Importing...' : 'Import All Data'}
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default BulkHistoricalImport;
