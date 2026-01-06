import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  LinearProgress,
  Box,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

const BulkUploadAdmin = () => {
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

  const processFile = async (file, collectionName, processor) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const XLSX = await import('xlsx');
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
          
          const result = await processor(normalizedData, collectionName);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const processApplicants = async (data, collectionName) => {
    let batch = writeBatch(db);
    let count = 0;
    let skipped = 0;
    let batchCount = 0;

    for (const row of data) {
      let name = toString(row.name);
      if (!name && (row.firstname || row.lastname)) {
        name = `${toString(row.firstname)} ${toString(row.lastname)}`.trim();
      }

      const eid = toString(row.eid || row.crmnumber || row.employeeid || row.id);
      const crmNumber = toString(row.crmnumber || row.crm);

      if (!eid) {
        skipped++;
        continue;
      }

      const status = toString(row.status);
      if (!status) {
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

      const docRef = doc(collection(db, collectionName));
      batch.set(docRef, applicantData);
      batchCount++;
      count++;

      if (batchCount >= 500) {
        await batch.commit();
        setProgress(`Uploaded ${count} applicants...`);
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return { success: count, skipped };
  };

  const handleBulkUpload = async () => {
    setUploading(true);
    setError('');
    setResults(null);
    
    try {
      setProgress('Fetching applicant file...');
      const applicantsResponse = await fetch('/Sample Uploads/Bulk Upload Files/APPLICANT PIPELINE.xlsx');
      const applicantsBlob = await applicantsResponse.blob();
      const applicantsFile = new File([applicantsBlob], 'APPLICANT PIPELINE.xlsx');
      
      setProgress('Processing applicants...');
      const applicantsResult = await processFile(applicantsFile, 'applicants', processApplicants);
      
      setResults({
        applicants: applicantsResult
      });
      
      setProgress('Complete!');
    } catch (err) {
      setError(err.message);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Bulk Upload Admin
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" paragraph>
          This page will upload all sample data files directly to Firestore.
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUpload />}
          onClick={handleBulkUpload}
          disabled={uploading}
        >
          Start Bulk Upload
        </Button>
      </Paper>

      {uploading && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            {progress}
          </Typography>
          <LinearProgress />
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {results && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Upload Results
          </Typography>
          <Grid container spacing={2}>
            {results.applicants && (
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">Applicants</Typography>
                    <Typography color="success.main">
                      {results.applicants.success} uploaded
                    </Typography>
                    <Typography color="warning.main">
                      {results.applicants.skipped} skipped
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default BulkUploadAdmin;
