import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Search } from '@mui/icons-material';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';

const DataDebug = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const checkData = async () => {
    setLoading(true);
    try {
      // Get first 10 and last 10 records from shiftData
      const shiftDataRef = collection(db, 'shiftData');

      // Get first 10 (oldest)
      const firstQuery = query(shiftDataRef, orderBy('date', 'asc'), limit(10));
      const firstSnapshot = await getDocs(firstQuery);

      // Get last 10 (newest)
      const lastQuery = query(shiftDataRef, orderBy('date', 'desc'), limit(10));
      const lastSnapshot = await getDocs(lastQuery);

      // Get total count
      const allSnapshot = await getDocs(shiftDataRef);
      const totalCount = allSnapshot.size;

      const firstRecords = firstSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));

      const lastRecords = lastSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
      }));

      // Find min and max dates
      let minDate = null;
      let maxDate = null;

      allSnapshot.docs.forEach(doc => {
        const date = doc.data().date?.toDate();
        if (date) {
          if (!minDate || date < minDate) minDate = date;
          if (!maxDate || date > maxDate) maxDate = date;
        }
      });

      setResult({
        totalCount,
        minDate,
        maxDate,
        firstRecords,
        lastRecords
      });

    } catch (error) {
      console.error('Error checking data:', error);
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" gutterBottom>Data Debugging Tool</Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ marginBottom: 3 }}>
        Check what data is actually stored in Firestore and find the correct date range.
      </Typography>

      <Paper sx={{ padding: 3, marginBottom: 3 }}>
        <Button
          variant="contained"
          onClick={checkData}
          startIcon={loading ? <CircularProgress size={20} /> : <Search />}
          disabled={loading}
        >
          {loading ? 'Checking Firestore...' : 'Check Firestore Data'}
        </Button>
      </Paper>

      {result?.error && (
        <Alert severity="error" sx={{ marginBottom: 3 }}>
          Error: {result.error}
        </Alert>
      )}

      {result && !result.error && (
        <>
          <Paper sx={{ padding: 3, marginBottom: 3 }}>
            <Typography variant="h6" gutterBottom>Summary</Typography>
            <Box sx={{ marginTop: 2 }}>
              <Typography variant="body1">
                <strong>Total Records:</strong> {result.totalCount}
              </Typography>
              {result.minDate && (
                <Typography variant="body1" sx={{ marginTop: 1 }}>
                  <strong>Earliest Date:</strong> {dayjs(result.minDate).format('YYYY-MM-DD (MMM D, YYYY)')}
                </Typography>
              )}
              {result.maxDate && (
                <Typography variant="body1" sx={{ marginTop: 1 }}>
                  <strong>Latest Date:</strong> {dayjs(result.maxDate).format('YYYY-MM-DD (MMM D, YYYY)')}
                </Typography>
              )}
            </Box>

            {result.minDate && result.maxDate && (
              <Alert severity="success" sx={{ marginTop: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  ✅ Data Found!
                </Typography>
                <Typography variant="body2" sx={{ marginTop: 1 }}>
                  To view this data on the Dashboard:
                </Typography>
                <Typography variant="body2" sx={{ marginTop: 1 }}>
                  1. Go to the <strong>Dashboard</strong> page
                </Typography>
                <Typography variant="body2">
                  2. Set <strong>Start Date</strong> to: <strong>{dayjs(result.minDate).format('YYYY-MM-DD')}</strong>
                </Typography>
                <Typography variant="body2">
                  3. Set <strong>End Date</strong> to: <strong>{dayjs(result.maxDate).format('YYYY-MM-DD')}</strong>
                </Typography>
              </Alert>
            )}

            {result.totalCount === 0 && (
              <Alert severity="warning" sx={{ marginTop: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  No Data Found
                </Typography>
                <Typography variant="body2" sx={{ marginTop: 1 }}>
                  The shiftData collection is empty. This means:
                </Typography>
                <Typography variant="body2" component="div" sx={{ marginTop: 1 }}>
                  • The CSV upload may have failed<br/>
                  • Or there was a Firestore permission error during upload<br/>
                  • Or the CSV file was empty/invalid
                </Typography>
                <Typography variant="body2" sx={{ marginTop: 2 }}>
                  Try uploading your CSV again and check the browser console for errors.
                </Typography>
              </Alert>
            )}
          </Paper>

          {result.firstRecords.length > 0 && (
            <Paper sx={{ padding: 3, marginBottom: 3 }}>
              <Typography variant="h6" gutterBottom>First 10 Records (Oldest)</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Shift</TableCell>
                      <TableCell>Requested</TableCell>
                      <TableCell>Working</TableCell>
                      <TableCell>Send Homes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.firstRecords.map((record, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{record.date ? dayjs(record.date).format('YYYY-MM-DD') : 'N/A'}</TableCell>
                        <TableCell>{record.shift}</TableCell>
                        <TableCell>{record.numberRequested}</TableCell>
                        <TableCell>{record.numberWorking}</TableCell>
                        <TableCell>{record.sendHomes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {result.lastRecords.length > 0 && (
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>Last 10 Records (Newest)</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Shift</TableCell>
                      <TableCell>Requested</TableCell>
                      <TableCell>Working</TableCell>
                      <TableCell>Send Homes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.lastRecords.map((record, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{record.date ? dayjs(record.date).format('YYYY-MM-DD') : 'N/A'}</TableCell>
                        <TableCell>{record.shift}</TableCell>
                        <TableCell>{record.numberRequested}</TableCell>
                        <TableCell>{record.numberWorking}</TableCell>
                        <TableCell>{record.sendHomes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}
    </Container>
  );
};

export default DataDebug;
