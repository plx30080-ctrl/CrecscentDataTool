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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  CloudUpload,
  CheckCircle,
  Warning,
  Info,
  Delete,
  ArrowForward,
  ArrowBack,
  Lightbulb
} from '@mui/icons-material';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { parseISO, isValid, format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import {
  DATA_TAG_LIBRARY,
  COLLECTION_REQUIREMENTS,
  suggestTag,
  getRequiredTags,
  getOptionalTags
} from '../config/dataTagLibrary';
import { flexibleBulkUpload } from '../services/firestoreService';
import logger from '../utils/logger';

const FlexibleUpload = () => {
  const { currentUser } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [fileData, setFileData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [columnMappings, setColumnMappings] = useState({});
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  const steps = ['Upload File', 'Select Collection', 'Map Columns', 'Validate & Import'];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError('');
    setSuccess('');
    setValidationErrors([]);

    if (!file) {
      setError('No file selected');
      return;
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data.length === 0) {
            setError('CSV file is empty');
            return;
          }
          const cols = Object.keys(results.data[0]);
          setColumns(cols);
          setFileData(results.data);
          setActiveStep(1);
          logger.info(`Parsed ${results.data.length} rows from CSV with columns:`, cols);
        },
        error: (error) => {
          setError(`Failed to parse CSV: ${error.message}`);
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (jsonData.length === 0) {
            setError('Excel file is empty');
            return;
          }

          const cols = Object.keys(jsonData[0]);
          setColumns(cols);
          setFileData(jsonData);
          setActiveStep(1);
          logger.info(`Parsed ${jsonData.length} rows from Excel with columns:`, cols);
        } catch (parseError) {
          logger.error('Error parsing Excel:', parseError);
          setError(`Failed to parse Excel file: ${parseError.message}`);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
    }
  };

  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setColumnMappings({});
    setValidationErrors([]);

    // Auto-suggest mappings based on column names
    const suggestions = {};
    columns.forEach(col => {
      const suggested = suggestTag(col, collection);
      if (suggested) {
        suggestions[col] = suggested;
      }
    });
    setColumnMappings(suggestions);

    setActiveStep(2);
    logger.info(`Selected collection: ${collection}, auto-suggested mappings:`, suggestions);
  };

  const handleMappingChange = (column, tag) => {
    setColumnMappings(prev => ({
      ...prev,
      [column]: tag === 'skip' ? null : tag
    }));
  };

  const validateMappings = () => {
    const errors = [];
    const requiredTags = getRequiredTags(selectedCollection);
    const mappedTags = Object.values(columnMappings).filter(tag => tag !== null);

    // Check if all required tags are mapped
    requiredTags.forEach(tag => {
      if (!mappedTags.includes(tag)) {
        const tagInfo = DATA_TAG_LIBRARY[tag];
        errors.push(`Required field "${tagInfo.label}" is not mapped to any column`);
      }
    });

    // Check for duplicate mappings
    const tagCounts = {};
    Object.values(columnMappings).forEach(tag => {
      if (tag) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    });
    Object.entries(tagCounts).forEach(([tag, count]) => {
      if (count > 1) {
        const tagInfo = DATA_TAG_LIBRARY[tag];
        errors.push(`Field "${tagInfo.label}" is mapped to multiple columns (only one allowed)`);
      }
    });

    // Validate data types for mapped fields
    const sampleRow = fileData[0];
    Object.entries(columnMappings).forEach(([column, tag]) => {
      if (tag) {
        const value = sampleRow[column];
        const tagInfo = DATA_TAG_LIBRARY[tag];

        if (tagInfo.type === 'date' && value) {
          const parsed = parseExcelDate(value);
          if (!parsed) {
            errors.push(`Column "${column}" mapped to "${tagInfo.label}" contains invalid date: "${value}"`);
          }
        } else if (tagInfo.type === 'number' && value) {
          const num = parseFloat(value);
          if (isNaN(num)) {
            errors.push(`Column "${column}" mapped to "${tagInfo.label}" contains non-numeric value: "${value}"`);
          }
        } else if (tagInfo.type === 'email' && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push(`Column "${column}" mapped to "${tagInfo.label}" contains invalid email: "${value}"`);
          }
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const parseExcelDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return isValid(value) ? value : null;
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return isValid(date) ? date : null;
    }
    if (typeof value === 'string') {
      const date = parseISO(value);
      if (isValid(date)) return date;
      const parsed = new Date(value);
      return isValid(parsed) ? parsed : null;
    }
    return null;
  };

  const transformData = () => {
    return fileData.map(row => {
      const transformed = {};
      Object.entries(columnMappings).forEach(([column, tag]) => {
        if (tag) {
          let value = row[column];
          const tagInfo = DATA_TAG_LIBRARY[tag];

          // Transform based on type
          if (tagInfo.type === 'date') {
            value = parseExcelDate(value);
          } else if (tagInfo.type === 'number') {
            value = parseFloat(value) || 0;
          } else if (tagInfo.type === 'phone') {
            value = value ? value.toString().replace(/\D/g, '') : '';
          } else if (tagInfo.type === 'boolean') {
            const str = value.toString().toLowerCase();
            value = str === 'true' || str === 'yes' || str === '1';
          } else if (tagInfo.type === 'complex' && tag === 'newStarts') {
            // Try to parse JSON, otherwise use empty array
            try {
              value = value ? JSON.parse(value) : [];
            } catch {
              value = [];
            }
          } else {
            value = value ? value.toString().trim() : '';
          }

          transformed[tag] = value;
        }
      });

      // Apply computed fields if any
      const collectionInfo = COLLECTION_REQUIREMENTS[selectedCollection];
      if (collectionInfo.computed) {
        Object.entries(collectionInfo.computed).forEach(([field, computeFn]) => {
          transformed[field] = computeFn(transformed);
        });
      }

      return transformed;
    });
  };

  const handleImport = async () => {
    if (!validateMappings()) {
      setActiveStep(3);
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const transformedData = transformData();
      const result = await flexibleBulkUpload(
        COLLECTION_REQUIREMENTS[selectedCollection].firestoreCollection,
        transformedData,
        currentUser.uid
      );

      if (result.success) {
        setSuccess(`Successfully imported ${result.count} records into ${COLLECTION_REQUIREMENTS[selectedCollection].label}!`);
        // Reset form
        setFileData([]);
        setColumns([]);
        setSelectedCollection('');
        setColumnMappings({});
        setActiveStep(0);
        logger.info(`Import complete: ${result.count} records`);
      } else {
        setError(`Failed to import data: ${result.error}`);
      }
    } catch (err) {
      logger.error('Import error:', err);
      setError(`Import failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 2) {
      if (validateMappings()) {
        setActiveStep(3);
      }
    } else {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
    setValidationErrors([]);
  };

  const getMappedCount = () => {
    return Object.values(columnMappings).filter(tag => tag !== null).length;
  };

  const getRequiredMappedCount = () => {
    const requiredTags = getRequiredTags(selectedCollection);
    const mappedTags = Object.values(columnMappings).filter(tag => tag !== null);
    return requiredTags.filter(tag => mappedTags.includes(tag)).length;
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Flexible Data Upload</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ marginBottom: 3 }}>
        Upload any spreadsheet format and map columns to your data fields
      </Typography>

      {success && <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Stepper activeStep={activeStep} sx={{ marginBottom: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* STEP 0: Upload File */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>Step 1: Upload Your File</Typography>
            <Typography variant="body2" sx={{ marginBottom: 2 }}>
              Select a CSV or Excel file (.csv, .xlsx, .xls) containing your data. Maximum file size: 10MB.
            </Typography>

            <Alert severity="info" sx={{ marginBottom: 2 }} icon={<Info />}>
              <Typography variant="subtitle2" fontWeight="bold">What makes this flexible?</Typography>
              <Typography variant="body2">
                • Upload ANY spreadsheet format - columns can have any names<br/>
                • No need to match specific templates<br/>
                • Smart auto-mapping suggests field matches<br/>
                • Works with all 8 data collections in the system
              </Typography>
            </Alert>

            <Box>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                id="flexible-upload"
              />
              <label htmlFor="flexible-upload">
                <Button variant="contained" component="span" startIcon={<CloudUpload />} size="large">
                  Select File
                </Button>
              </label>
            </Box>
          </Box>
        )}

        {/* STEP 1: Select Collection */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>Step 2: Select Data Type</Typography>
            <Typography variant="body2" sx={{ marginBottom: 3 }}>
              Choose which type of data you're importing. ({fileData.length} rows detected)
            </Typography>

            <Grid container spacing={2}>
              {Object.entries(COLLECTION_REQUIREMENTS).map(([key, info]) => (
                <Grid item xs={12} sm={6} md={4} key={key}>
                  <Card
                    variant="outlined"
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main', boxShadow: 2 }
                    }}
                    onClick={() => handleCollectionSelect(key)}
                  >
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>
                        {info.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {info.description}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ marginTop: 1 }}>
                        Required: {info.requiredTags.length} fields
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ marginTop: 3 }}>
              <Button onClick={handleBack} startIcon={<ArrowBack />}>
                Back
              </Button>
            </Box>
          </Box>
        )}

        {/* STEP 2: Map Columns */}
        {activeStep === 2 && selectedCollection && (
          <Box>
            <Typography variant="h6" gutterBottom>Step 3: Map Columns to Fields</Typography>
            <Typography variant="body2" sx={{ marginBottom: 2 }}>
              Match each column in your file to a data field. Required fields are marked with *.
            </Typography>

            <Alert severity="info" sx={{ marginBottom: 2 }} icon={<Lightbulb />}>
              Auto-suggested mappings are shown. Review and adjust as needed.
              {getMappedCount()} of {columns.length} columns mapped.
              {getRequiredMappedCount()} of {getRequiredTags(selectedCollection).length} required fields mapped.
            </Alert>

            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell width="25%"><strong>Your Column</strong></TableCell>
                    <TableCell width="30%"><strong>Sample Data</strong></TableCell>
                    <TableCell width="35%"><strong>Map To Field</strong></TableCell>
                    <TableCell width="10%"><strong>Action</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {columns.map((column, index) => {
                    const sampleValues = fileData.slice(0, 3).map(row => row[column]).filter(v => v);
                    const mappedTag = columnMappings[column];
                    const tagInfo = mappedTag ? DATA_TAG_LIBRARY[mappedTag] : null;
                    const isRequired = getRequiredTags(selectedCollection).includes(mappedTag);

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {column}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {sampleValues.slice(0, 2).join(', ')}
                            {sampleValues.length > 2 && '...'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={columnMappings[column] || 'skip'}
                              onChange={(e) => handleMappingChange(column, e.target.value)}
                            >
                              <MenuItem value="skip">
                                <em>Skip this column</em>
                              </MenuItem>
                              <MenuItem disabled>
                                <strong>— Required Fields —</strong>
                              </MenuItem>
                              {getRequiredTags(selectedCollection).map(tag => {
                                const info = DATA_TAG_LIBRARY[tag];
                                return (
                                  <MenuItem key={tag} value={tag}>
                                    {info.label} * <em style={{ fontSize: '0.85em' }}>({info.type})</em>
                                  </MenuItem>
                                );
                              })}
                              <MenuItem disabled>
                                <strong>— Optional Fields —</strong>
                              </MenuItem>
                              {getOptionalTags(selectedCollection).map(tag => {
                                const info = DATA_TAG_LIBRARY[tag];
                                return (
                                  <MenuItem key={tag} value={tag}>
                                    {info.label} <em style={{ fontSize: '0.85em' }}>({info.type})</em>
                                  </MenuItem>
                                );
                              })}
                            </Select>
                          </FormControl>
                          {tagInfo && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ marginTop: 0.5 }}>
                              {tagInfo.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {isRequired && (
                            <Chip label="Required" size="small" color="error" />
                          )}
                          {mappedTag && !isRequired && (
                            <Tooltip title="Clear mapping">
                              <IconButton size="small" onClick={() => handleMappingChange(column, 'skip')}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', gap: 2, marginTop: 3 }}>
              <Button onClick={handleBack} startIcon={<ArrowBack />}>
                Back
              </Button>
              <Button onClick={handleNext} variant="contained" endIcon={<ArrowForward />}>
                Next: Validate
              </Button>
            </Box>
          </Box>
        )}

        {/* STEP 3: Validate & Import */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>Step 4: Validate & Import</Typography>

            {validationErrors.length > 0 ? (
              <Alert severity="error" sx={{ marginBottom: 2 }} icon={<Warning />}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {validationErrors.length} Validation Error(s) Found
                </Typography>
                <Box sx={{ marginTop: 1, maxHeight: 200, overflowY: 'auto' }}>
                  {validationErrors.map((err, idx) => (
                    <Typography key={idx} variant="body2" sx={{ marginBottom: 0.5 }}>
                      • {err}
                    </Typography>
                  ))}
                </Box>
                <Typography variant="body2" sx={{ marginTop: 1 }}>
                  Please go back and fix these issues before importing.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="success" sx={{ marginBottom: 2 }} icon={<CheckCircle />}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Validation Passed!
                </Typography>
                <Typography variant="body2">
                  Ready to import {fileData.length} records into {COLLECTION_REQUIREMENTS[selectedCollection].label}.
                </Typography>
              </Alert>
            )}

            <Paper variant="outlined" sx={{ padding: 2, marginBottom: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Import Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Collection:</Typography>
                  <Typography variant="body1">{COLLECTION_REQUIREMENTS[selectedCollection].label}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">Records:</Typography>
                  <Typography variant="body1">{fileData.length}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Field Mappings:</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {Object.entries(columnMappings)
                      .filter(([_, tag]) => tag !== null)
                      .map(([column, tag]) => {
                        const tagInfo = DATA_TAG_LIBRARY[tag];
                        const isRequired = getRequiredTags(selectedCollection).includes(tag);
                        return (
                          <Chip
                            key={column}
                            label={`${column} → ${tagInfo.label}`}
                            size="small"
                            color={isRequired ? 'primary' : 'default'}
                          />
                        );
                      })}
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={handleBack} startIcon={<ArrowBack />}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                variant="contained"
                color="primary"
                disabled={uploading || validationErrors.length > 0}
                startIcon={uploading ? <CircularProgress size={20} /> : <CheckCircle />}
                size="large"
              >
                {uploading ? 'Importing...' : `Import ${fileData.length} Records`}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default FlexibleUpload;
