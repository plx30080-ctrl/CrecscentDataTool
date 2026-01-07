import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Button,
  TextField
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  Search,
  FilterList,
  Download
} from '@mui/icons-material';
import { 
  getCollectionData, 
  getCollectionStats,
  validateCollectionData 
} from '../services/dataViewService';
import dayjs from 'dayjs';

const COLLECTIONS = [
  { value: 'users', label: 'Users', description: 'User profiles and roles' },
  { value: 'onPremiseData', label: 'On Premise Data', description: 'Daily headcount by shift' },
  { value: 'hoursData', label: 'Hours Data', description: 'Hours by shift with direct/indirect' },
  { value: 'branchMetrics', label: 'Branch Metrics', description: 'Recruiter/branch daily metrics' },
  { value: 'earlyLeaves', label: 'Early Leaves', description: 'Early leave incidents' },
  { value: 'associates', label: 'Associates', description: 'Single source of truth for people' },
  { value: 'badges', label: 'Badges', description: 'Badge details and print counts' }
];

const DataView = () => {
  const [selectedCollection, setSelectedCollection] = useState('');
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selectedCollection) {
      loadCollectionData();
    }
  }, [selectedCollection]);

  const loadCollectionData = async () => {
    if (!selectedCollection) return;

    setLoading(true);
    setError('');

    try {
      // Load collection data
      const dataResult = await getCollectionData(selectedCollection);
      if (dataResult.success) {
        setData(dataResult.data);
      } else {
        if (dataResult.permissionDenied) {
          setError(`Permission denied: You don't have access to read the "${selectedCollection}" collection. Check Firestore security rules.`);
        } else {
          setError(dataResult.error);
        }
        setData([]);
      }

      // Load collection stats
      const statsResult = await getCollectionStats(selectedCollection);
      if (statsResult.success) {
        setStats(statsResult.stats);
      }

      // Validate data
      if (dataResult.success) {
        const validationResult = await validateCollectionData(selectedCollection, dataResult.data);
        if (validationResult.success) {
          setValidation(validationResult.validation);
        }
      }
    } catch (err) {
      setError('Failed to load collection data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date || (value?.toDate && typeof value.toDate === 'function')) {
      try {
        const date = value.toDate ? value.toDate() : value;
        return dayjs(date).format('MMM D, YYYY h:mm A');
      } catch (e) {
        return String(value);
      }
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getColumns = () => {
    if (data.length === 0) return [];
    const firstItem = data[0];
    return Object.keys(firstItem).filter(key => key !== 'id');
  };

  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const exportData = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCollection}_${dayjs().format('YYYY-MM-DD')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Data View & Validation
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom sx={{ marginBottom: 3 }}>
        View and validate data across all Firestore collections
      </Typography>

      {/* Collection Selector */}
      <Paper sx={{ padding: 2, marginBottom: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Collection</InputLabel>
              <Select
                value={selectedCollection}
                label="Select Collection"
                onChange={(e) => {
                  setSelectedCollection(e.target.value);
                  setPage(0);
                  setSearchTerm('');
                }}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {COLLECTIONS.map((collection) => (
                  <MenuItem key={collection.value} value={collection.value}>
                    <Box>
                      <Typography variant="body1">{collection.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {collection.description}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ marginRight: 1, color: 'text.secondary' }} />
              }}
              disabled={!selectedCollection || loading}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Refresh Data">
                <IconButton
                  onClick={loadCollectionData}
                  disabled={!selectedCollection || loading}
                  color="primary"
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Export Data">
                <IconButton
                  onClick={exportData}
                  disabled={!selectedCollection || data.length === 0}
                  color="primary"
                >
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', padding: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && selectedCollection && (
        <>
          {/* Stats Cards */}
          {stats && (
            <Grid container spacing={2} sx={{ marginBottom: 3 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Total Records
                    </Typography>
                    <Typography variant="h4">{stats.totalRecords}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Last Updated
                    </Typography>
                    <Typography variant="h6">
                      {stats.lastUpdated ? dayjs(stats.lastUpdated).format('MMM D, YYYY') : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Data Status
                    </Typography>
                    {validation?.isValid ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Valid"
                        color="success"
                      />
                    ) : validation?.issues?.length > 0 ? (
                      <Chip
                        icon={<Warning />}
                        label={`${validation.issues.length} Warnings`}
                        color="warning"
                      />
                    ) : (
                      <Chip label="Unknown" />
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" gutterBottom>
                      Storage Size
                    </Typography>
                    <Typography variant="h6">
                      {stats.sizeEstimate ? `~${stats.sizeEstimate}` : 'N/A'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

      {/* Validation Results */}
          {validation && validation.issues && validation.issues.length > 0 && (
            <Alert 
              severity="warning" 
              sx={{ marginBottom: 2 }}
              icon={<Warning />}
            >
              <Typography variant="subtitle2" gutterBottom>
                Data Validation Warnings ({validation.issues.length}):
              </Typography>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {validation.issues.map((issue, index) => (
                  <li key={index}>
                    <Typography variant="body2">{issue}</Typography>
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Data Table */}
          {data.length > 0 ? (
            <Paper>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'primary.light' }}>
                        ID
                      </TableCell>
                      {getColumns().map((column) => (
                        <TableCell 
                          key={column}
                          sx={{ fontWeight: 'bold', backgroundColor: 'primary.light' }}
                        >
                          {column}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedData.map((row, index) => (
                      <TableRow 
                        key={row.id || index}
                        hover
                        sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                      >
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <Tooltip title={row.id}>
                            <Typography variant="body2" noWrap>
                              {row.id}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        {getColumns().map((column) => (
                          <TableCell key={column} sx={{ maxWidth: 250 }}>
                            {typeof row[column] === 'object' && row[column] !== null ? (
                              <Tooltip title={JSON.stringify(row[column], null, 2)}>
                                <Chip 
                                  label="Object" 
                                  size="small" 
                                  variant="outlined"
                                  icon={<Info />}
                                />
                              </Tooltip>
                            ) : (
                              <Typography variant="body2" noWrap>
                                {formatValue(row[column])}
                              </Typography>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50, 100]}
                component="div"
                count={filteredData.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          ) : (
            !loading && (
              <Paper sx={{ padding: 4, textAlign: 'center' }}>
                <Info sx={{ fontSize: 60, color: 'text.secondary', marginBottom: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No data found in this collection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This collection may be empty or data may not have been uploaded yet.
                </Typography>
              </Paper>
            )
          )}
        </>
      )}

      {!selectedCollection && !loading && (
        <Paper sx={{ padding: 6, textAlign: 'center' }}>
          <FilterList sx={{ fontSize: 80, color: 'text.secondary', marginBottom: 2 }} />
          <Typography variant="h5" gutterBottom color="text.secondary">
            Select a Collection
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Choose a collection from the dropdown above to view and validate its data
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default DataView;
