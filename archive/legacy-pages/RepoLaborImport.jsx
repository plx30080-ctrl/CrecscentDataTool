import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Box, Button, LinearProgress, Alert } from '@mui/material';
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { parseLaborReportFile } from '../utils/laborParser';

const RepoLaborImport = () => {
  const [manifest, setManifest] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadManifest = async () => {
      try {
        const res = await fetch('weekly-labor-reports/manifest.json');
        if (!res.ok) throw new Error('manifest.json not found. Run copy script first.');
        const json = await res.json();
        setManifest(json);
      } catch (e) {
        setMessage({ type: 'error', text: e.message });
      }
    };
    loadManifest();
  }, []);

  const toTimestamp = (date) => {
    if (!date) return null;
    if (date.toDate) return date;
    return Timestamp.fromDate(date instanceof Date ? date : new Date(date));
  };

  const handleImport = async () => {
    if (!manifest || !manifest.files || manifest.files.length === 0) {
      setMessage({ type: 'error', text: 'No files in manifest.' });
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setMessage({ type: 'error', text: 'Not authenticated. Please log in first.' });
      return;
    }
    setImporting(true);
    setProgress(0);
    let processed = 0;
    try {
      for (const name of manifest.files) {
        const res = await fetch(`weekly-labor-reports/${encodeURIComponent(name)}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${name}`);
        }
        const buf = await res.arrayBuffer();
        const parsed = parseLaborReportFile(buf, name);
        if (!parsed || !parsed.weekEnding) {
          continue;
        }
        // Compute and normalize aggregates
        let direct = 0; let indirect = 0; let total = 0;
        Object.values(parsed.dailyBreakdown).forEach((day) => {
          const shift1Direct = day.shift1?.direct || 0;
          const shift1Indirect = day.shift1?.indirect || 0;
          const shift2Direct = day.shift2?.direct || 0;
          const shift2Indirect = day.shift2?.indirect || 0;
          const shift1Total = shift1Direct + shift1Indirect;
          const shift2Total = shift2Direct + shift2Indirect;
          const dayTotal = shift1Total + shift2Total;
          day.shift1 = { direct: shift1Direct, indirect: shift1Indirect, total: shift1Total };
          day.shift2 = { direct: shift2Direct, indirect: shift2Indirect, total: shift2Total };
          day.total = dayTotal;
          direct += shift1Direct + shift2Direct;
          indirect += shift1Indirect + shift2Indirect;
          total += dayTotal;
        });
        const docData = {
          weekEnding: toTimestamp(parsed.weekEnding),
          submittedAt: serverTimestamp(),
          submittedBy: user.email,
          submittedByUid: user.uid,
          fileName: parsed.fileName,
          totalHours: total,
          directHours: direct,
          indirectHours: indirect,
          employeeCount: parsed.employeeCount || (parsed.employeeDetails ? parsed.employeeDetails.length : 0) || 0,
          headcount: parsed.employeeCount || (parsed.employeeDetails ? parsed.employeeDetails.length : 0) || 0,
          dailyBreakdown: parsed.dailyBreakdown,
          // Store employees in subcollection to keep doc size small
        };
        // Commit main doc first
        const mainBatch = writeBatch(db);
        const reportRef = doc(collection(db, 'laborReports'));
        mainBatch.set(reportRef, docData);
        await mainBatch.commit();

        // Write employeeDetails in chunks under subcollection
        const employees = Array.isArray(parsed.employeeDetails) ? parsed.employeeDetails : [];
        const chunkSize = 400; // keep well under 500 ops per batch
        for (let i = 0; i < employees.length; i += chunkSize) {
          const chunk = employees.slice(i, i + chunkSize);
          const empBatch = writeBatch(db);
          chunk.forEach((emp) => {
            const empRef = doc(collection(db, 'laborReports', reportRef.id, 'employees'));
            // Persist minimal but useful fields
            empBatch.set(empRef, {
              eid: emp.eid || null,
              name: emp.name || null,
              deptCode: emp.deptCode || null,
              laborType: emp.laborType || null,
              shift: emp.shift || null,
              daily: emp.daily || null,
              weeklyTotal: emp.weeklyTotal || 0
            });
          });
          await empBatch.commit();
        }

        processed += 1;
        setProgress(Math.round((processed / manifest.files.length) * 100));
      }
      setMessage({ type: 'success', text: `Imported ${processed} reports.` });
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Import Weekly Labor Reports from Repo</Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          This imports Excel files copied into the app's public folder using your current Firebase session.
        </Typography>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button variant="outlined" onClick={handleImport} disabled={importing || !manifest}>Import Reports</Button>
          {importing && (
            <Box sx={{ flex: 1 }}>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" color="text.secondary">{progress}%</Typography>
            </Box>
          )}
        </Box>
        <Typography variant="caption" display="block" sx={{ mt: 2 }}>
          If manifest not found, run: node scripts/copy-weekly-reports-to-public.js
        </Typography>
      </Paper>
    </Container>
  );
};

export default RepoLaborImport;
