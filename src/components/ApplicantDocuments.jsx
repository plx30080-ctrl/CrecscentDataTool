import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Upload,
  Delete,
  Download,
  PictureAsPdf,
  Description,
  TableChart,
  Image,
  TextSnippet,
  InsertDriveFile
} from '@mui/icons-material';
import dayjs from 'dayjs';
import {
  uploadApplicantDocument,
  getApplicantDocuments,
  deleteApplicantDocument,
  formatFileSize
} from '../services/documentService';

const ApplicantDocuments = ({ applicantId, applicantName }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [applicantId]);

  const loadDocuments = async () => {
    setLoading(true);
    const result = await getApplicantDocuments(applicantId);
    if (result.success) {
      setDocuments(result.data);
    } else {
      setError(result.error || 'Failed to load documents');
    }
    setLoading(false);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      setError('Please select a file and document type');
      return;
    }

    setUploading(true);
    setError('');

    const result = await uploadApplicantDocument(
      applicantId,
      selectedFile,
      documentType,
      notes
    );

    setUploading(false);

    if (result.success) {
      setSuccess('Document uploaded successfully');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentType('');
      setNotes('');
      loadDocuments();
    } else {
      setError(result.error || 'Failed to upload document');
    }
  };

  const handleDelete = async (document) => {
    if (!window.confirm(`Are you sure you want to delete ${document.fileName}?`)) {
      return;
    }

    const result = await deleteApplicantDocument(document.id, document.storagePath);

    if (result.success) {
      setSuccess('Document deleted successfully');
      loadDocuments();
    } else {
      setError(result.error || 'Failed to delete document');
    }
  };

  const handleDownload = (document) => {
    window.open(document.downloadURL, '_blank');
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <InsertDriveFile />;
    if (mimeType.includes('pdf')) return <PictureAsPdf color="error" />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <Description color="primary" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <TableChart color="success" />;
    if (mimeType.includes('image')) return <Image color="secondary" />;
    if (mimeType.includes('text')) return <TextSnippet />;
    return <InsertDriveFile />;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ marginBottom: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <Typography variant="h6">
          Documents for {applicantName}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Upload />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Document
        </Button>
      </Box>

      {documents.length === 0 ? (
        <Paper sx={{ padding: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No documents uploaded yet
          </Typography>
        </Paper>
      ) : (
        <List>
          {documents.map((doc) => (
            <Paper key={doc.id} sx={{ marginBottom: 1 }}>
              <ListItem>
                <ListItemIcon>
                  {getFileIcon(doc.mimeType)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {doc.fileName}
                      <Chip label={doc.documentType} size="small" />
                    </Box>
                  }
                  secondary={
                    <>
                      {formatFileSize(doc.fileSize)} • Uploaded by {doc.uploadedBy} on {dayjs(doc.uploadedAt).format('MMM D, YYYY h:mm A')}
                      {doc.notes && (
                        <>
                          <br />
                          <em>{doc.notes}</em>
                        </>
                      )}
                    </>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleDownload(doc)}
                    sx={{ marginRight: 1 }}
                  >
                    <Download />
                  </IconButton>
                  <IconButton
                    edge="end"
                    onClick={() => handleDelete(doc)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          ))}
        </List>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Document Type</InputLabel>
              <Select
                value={documentType}
                label="Document Type"
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <MenuItem value="I-9">I-9</MenuItem>
                <MenuItem value="W-4">W-4</MenuItem>
                <MenuItem value="Background Check">Background Check</MenuItem>
                <MenuItem value="Drug Test">Drug Test</MenuItem>
                <MenuItem value="Offer Letter">Offer Letter</MenuItem>
                <MenuItem value="Resume">Resume</MenuItem>
                <MenuItem value="ID Copy">ID Copy</MenuItem>
                <MenuItem value="Direct Deposit Form">Direct Deposit Form</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="outlined"
              component="label"
              startIcon={<Upload />}
            >
              Select File
              <input
                type="file"
                hidden
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              />
            </Button>

            {selectedFile && (
              <Alert severity="info">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </Alert>
            )}

            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this document..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || !documentType || uploading}
          >
            {uploading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApplicantDocuments;
