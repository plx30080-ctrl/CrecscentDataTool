import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { Print as PrintIcon } from '@mui/icons-material';
import BadgePreview from './BadgePreview';
import { getDefaultTemplate } from '../services/badgeService';
import { sendToPrinter } from '../services/printService';

const BadgePrintPreview = ({ open, onClose, badge, onPrintSuccess }) => {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplate();
    }
  }, [open]);

  const loadTemplate = async () => {
    setLoading(true);
    const result = await getDefaultTemplate();
    if (result.success) {
      setTemplate(result.data);
    }
    setLoading(false);
  };

  const handlePrint = async () => {
    setError('');
    setPrinting(true);

    try {
      const result = await sendToPrinter(badge, template);

      if (result.success) {
        if (onPrintSuccess) {
          onPrintSuccess(badge);
        }
        onClose();
      } else {
        setError(result.error || 'Failed to send badge to printer');
      }
    } catch (err) {
      setError('An error occurred while printing');
      console.error('Print error:', err);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Print Preview</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Preview of badge to be printed
            </Typography>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                padding: 2,
                backgroundColor: '#f5f5f5',
                borderRadius: 1
              }}
            >
              <BadgePreview badge={badge} template={template} scale={1.5} />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" display="block">
                <strong>Name:</strong> {badge?.firstName} {badge?.lastName}
              </Typography>
              <Typography variant="caption" display="block">
                <strong>EID:</strong> {badge?.eid}
              </Typography>
              <Typography variant="caption" display="block">
                <strong>Badge ID:</strong> {badge?.badgeId || 'N/A'}
              </Typography>
              <Typography variant="caption" display="block">
                <strong>Position:</strong> {badge?.position || 'N/A'}
              </Typography>
              <Typography variant="caption" display="block">
                <strong>Shift:</strong> {badge?.shift || 'N/A'}
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={printing}>
          Cancel
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          startIcon={printing ? <CircularProgress size={20} /> : <PrintIcon />}
          disabled={loading || printing}
        >
          {printing ? 'Printing...' : 'Print Badge'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BadgePrintPreview;
