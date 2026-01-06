import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { collection, doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';

const AdminBulkUpload = () => {
  const { currentUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const normalizeColumnName = (col) => {
    return col
      .replace(/\r/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  };

  const parseExcelDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + value * 86400000);
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const toString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const processApplicants = async (file) => {
    setProgress('Processing Applicants...');
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          const normalizedData = rawData.map(row => {
            const normalized = {};
            Object.keys(row).forEach(key => {
              normalized[normalizeColumnName(key)] = row[key];
            });
            return normalized;
          });

          let batch = writeBatch(db);
          let count = 0;
          let skipped = 0;
          let batchCount = 0;

          for (const row of normalizedData) {
            let name = toString(row.name);
            if (!name && (row.firstname || row.lastname)) {
              name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
            }

            const eid = toString(row.eid || row.crmnumber || row.employeeid || row.id);
            const crmNumber = toString(row.crmnumber || row.crm);
            const status = toString(row.status);

            if (!eid || !status) {
              skipped++;
              continue;
            }

            const applicantData = {
              status,
              name,
              phoneNumber: toString(row.phonenumber || row.phone),
              email: toString(row.email),
              eid,
              crmNumber: crmNumber || eid,
              processDate: parseExcelDate(row.processdate),
              tentativeStartDate: parseExcelDate(row.tentativestartdate || row.tentativestart),
              i9Cleared: toString(row.i9cleared) === 'Yes' ? 'Yes' : '',
              backgroundStatus: toString(row.backgroundstatus),
              shift: toString(row.shift),
              notes: toString(row.notes),
              fill: toString(row.fill),
              recruiter: toString(row.recruiter),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            const docRef = doc(collection(db, 'applicants'));
            batch.set(docRef, applicantData);
            batchCount++;
            count++;

            if (batchCount >= 500) {
              await batch.commit();
              setProgress(`Applicants: ${count} uploaded...`);
              batch = writeBatch(db);
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }

          resolve({ collection: 'Applicants', success: count, skipped });
        } catch (error) {
          console.error('Error processing applicants:', error);
          resolve({ collection: 'Applicants', success: 0, skipped: 0, error: error.message });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const processAssignmentStarts = async (file) => {
    setProgress('Processing Assignment Starts...');
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          const normalizedData = rawData.map(row => {
            const normalized = {};
            Object.keys(row).forEach(key => {
              normalized[normalizeColumnName(key)] = row[key];
            });
            return normalized;
          });

          let batch = writeBatch(db);
          let count = 0;
          let skipped = 0;
          let batchCount = 0;

          for (const row of normalizedData) {
            const eid = toString(row.eid || row.employeeid || row.id || row.crmnumber);
            let name = toString(row.name || row.associatename);

            if (!name && (row.firstname || row.lastname)) {
              name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
            }

            const startDate = parseExcelDate(row.startdate || row.assignmentstart || row.hiredate);

            if (!eid || !name) {
              skipped++;
              continue;
            }

            const associateData = {
              eid,
              name,
              hireDate: startDate,
              shift: toString(row.shift),
              position: toString(row.position),
              status: 'Active',
              phoneNumber: toString(row.phonenumber || row.phone),
              email: toString(row.email),
              notes: toString(row.notes),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            const docRef = doc(db, 'associates', eid);
            batch.set(docRef, associateData, { merge: true });
            batchCount++;
            count++;

            if (batchCount >= 500) {
              await batch.commit();
              setProgress(`Assignment Starts: ${count} uploaded...`);
              batch = writeBatch(db);
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }

          resolve({ collection: 'Assignment Starts', success: count, skipped });
        } catch (error) {
          console.error('Error processing assignment starts:', error);
          resolve({ collection: 'Assignment Starts', success: 0, skipped: 0, error: error.message });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const processEarlyLeaves = async (file) => {
    setProgress('Processing Early Leaves...');
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          const normalizedData = rawData.map(row => {
            const normalized = {};
            Object.keys(row).forEach(key => {
              normalized[normalizeColumnName(key)] = row[key];
            });
            return normalized;
          });

          let batch = writeBatch(db);
          let count = 0;
          let skipped = 0;
          let batchCount = 0;

          for (const row of normalizedData) {
            let name = toString(row.associatename || row.name);

            if (!name && (row.firstname || row.lastname)) {
              name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
            }

            if (!name) {
              skipped++;
              continue;
            }

            const earlyLeaveData = {
              associateName: name,
              eid: toString(row.eid || row.employeeid || row.id),
              date: parseExcelDate(row.date),
              shift: toString(row.shift),
              timeLeft: toString(row.timeleft),
              reason: toString(row.reason),
              approved: toString(row.approved) === 'Yes',
              notes: toString(row.notes),
              createdAt: serverTimestamp()
            };

            const docRef = doc(collection(db, 'earlyLeaves'));
            batch.set(docRef, earlyLeaveData);
            batchCount++;
            count++;

            if (batchCount >= 500) {
              await batch.commit();
              setProgress(`Early Leaves: ${count} uploaded...`);
              batch = writeBatch(db);
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }

          resolve({ collection: 'Early Leaves', success: count, skipped });
        } catch (error) {
          console.error('Error processing early leaves:', error);
          resolve({ collection: 'Early Leaves', success: 0, skipped: 0, error: error.message });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const processDNR = async (file) => {
    setProgress('Processing DNR List...');
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          const normalizedData = rawData.map(row => {
            const normalized = {};
            Object.keys(row).forEach(key => {
              normalized[normalizeColumnName(key)] = row[key];
            });
            return normalized;
          });

          let batch = writeBatch(db);
          let count = 0;
          let skipped = 0;
          let batchCount = 0;

          for (const row of normalizedData) {
            let name = toString(row.name);

            if (!name && (row.firstname || row.lastname)) {
              name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
            }

            if (!name) {
              skipped++;
              continue;
            }

            const dnrData = {
              name,
              firstName: toString(row.firstname),
              lastName: toString(row.lastname),
              eid: toString(row.eid || row.employeeid || row.id),
              reason: toString(row.reason || row.notes),
              dateAdded: parseExcelDate(row.dateadded || row.date),
              notes: toString(row.notes),
              createdAt: serverTimestamp()
            };

            const docRef = doc(collection(db, 'dnr'));
            batch.set(docRef, dnrData);
            batchCount++;
            count++;

            if (batchCount >= 500) {
              await batch.commit();
              setProgress(`DNR: ${count} uploaded...`);
              batch = writeBatch(db);
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }

          resolve({ collection: 'DNR', success: count, skipped });
        } catch (error) {
          console.error('Error processing DNR:', error);
          resolve({ collection: 'DNR', success: 0, skipped: 0, error: error.message });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const processBadges = async (file) => {
    setProgress('Processing Badge Export...');
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let rawData;
          
          if (file.name.endsWith('.csv')) {
            // Parse CSV
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            rawData = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              return row;
            });
          } else {
            // Parse Excel
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          }

          const normalizedData = rawData.map(row => {
            const normalized = {};
            Object.keys(row).forEach(key => {
              normalized[normalizeColumnName(key)] = row[key];
            });
            return normalized;
          });

          let batch = writeBatch(db);
          let count = 0;
          let skipped = 0;
          let batchCount = 0;

          for (const row of normalizedData) {
            const eid = toString(row.eid || row.employeeid || row.id || row.crmnumber);
            let name = toString(row.name || row.associatename);

            if (!name && (row.firstname || row.lastname)) {
              name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
            }

            if (!eid || !name) {
              skipped++;
              continue;
            }

            const badgeData = {
              eid,
              name,
              position: toString(row.position),
              status: toString(row.status),
              hireDate: parseExcelDate(row.hiredate),
              shift: toString(row.shift),
              email: toString(row.email),
              phoneNumber: toString(row.phonenumber || row.phone),
              notes: toString(row.notes),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            const docRef = doc(db, 'badges', eid);
            batch.set(docRef, badgeData, { merge: true });
            batchCount++;
            count++;

            if (batchCount >= 500) {
              await batch.commit();
              setProgress(`Badges: ${count} uploaded...`);
              batch = writeBatch(db);
              batchCount = 0;
            }
          }

          if (batchCount > 0) {
            await batch.commit();
          }

          resolve({ collection: 'Badges', success: count, skipped });
        } catch (error) {
          console.error('Error processing badges:', error);
          resolve({ collection: 'Badges', success: 0, skipped: 0, error: error.message });
        }
      };
      
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleBulkUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError('');
    setResults(null);

    try {
      const uploadResults = [];

      // Process each file
      for (const file of Array.from(files)) {
        const fileName = file.name.toUpperCase();
        
        if (fileName.includes('APPLICANT')) {
          const result = await processApplicants(file);
          uploadResults.push(result);
        } else if (fileName.includes('ASSIGNMENT')) {
          const result = await processAssignmentStarts(file);
          uploadResults.push(result);
        } else if (fileName.includes('EARLY')) {
          const result = await processEarlyLeaves(file);
          uploadResults.push(result);
        } else if (fileName.includes('DNR')) {
          const result = await processDNR(file);
          uploadResults.push(result);
        } else if (fileName.includes('BADGE') || fileName.includes('RECORDS')) {
          const result = await processBadges(file);
          uploadResults.push(result);
        }
      }

      setResults(uploadResults);
      setProgress('Complete!');
    } catch (error) {
      console.error('Bulk upload error:', error);
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please log in to access admin bulk upload</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Admin Bulk Upload
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Select all 5 data files at once: Applicant Pipeline, Assignment Starts, Early Leaves, DNR, and Badge Export
        </Alert>

        <input
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          id="bulk-upload-files"
          multiple
          type="file"
          onChange={handleBulkUpload}
          disabled={uploading}
        />
        <label htmlFor="bulk-upload-files">
          <Button
            variant="contained"
            component="span"
            startIcon={<CloudUpload />}
            size="large"
            disabled={uploading}
          >
            Select Files to Upload
          </Button>
        </label>

        {uploading && (
          <Box sx={{ mt: 3 }}>
            <LinearProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {progress}
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {results && (
          <TableContainer sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Collection</TableCell>
                  <TableCell align="right">Uploaded</TableCell>
                  <TableCell align="right">Skipped</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.collection}</TableCell>
                    <TableCell align="right">{result.success}</TableCell>
                    <TableCell align="right">{result.skipped}</TableCell>
                    <TableCell>
                      {result.error ? (
                        <Chip label="Error" color="error" size="small" />
                      ) : (
                        <Chip label="Success" color="success" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AdminBulkUpload;
