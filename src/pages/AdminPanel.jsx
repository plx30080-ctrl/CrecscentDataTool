import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  Grid,
  Card,
  CardContent,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  Badge as BadgeIcon,
  Assessment,
  Edit,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthProvider';
import {
  getAllUsers,
  updateUserRole,
  saveBadgeTemplate,
  getActiveBadgeTemplate,
  getAuditLogs,
  getUserActivitySummary
} from '../services/adminService';
import dayjs from 'dayjs';

const AdminPanel = () => {
  const { currentUser, userProfile } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // User Management State
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState('');

  // Badge Template State
  const [template, setTemplate] = useState({
    companyLogo: true,
    showPhoto: true,
    showBadgeId: true,
    showName: true,
    showPosition: true,
    showShift: true,
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    fontSize: 12,
    photoSize: 'medium',
    layout: 'standard'
  });
  const [activeTemplate, setActiveTemplate] = useState(null);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState([]);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if user is authorized (Market Manager or Admin only)
  const isAuthorized = userProfile && (userProfile.role === 'Market Manager' || userProfile.role === 'admin');

  useEffect(() => {
    if (isAuthorized) {
      loadUsers();
      loadActiveTemplate();
      loadAuditLogs();
    }
  }, [isAuthorized]);

  const loadUsers = async () => {
    const result = await getAllUsers();
    if (result.success) {
      setUsers(result.data);
    }
  };

  const loadActiveTemplate = async () => {
    const result = await getActiveBadgeTemplate();
    if (result.success && result.data) {
      setActiveTemplate(result.data);
      setTemplate(result.data);
    }
  };

  const loadAuditLogs = async () => {
    const filters = {};
    if (filterUserId) filters.userId = filterUserId;
    if (filterAction) filters.action = filterAction;

    const result = await getAuditLogs(filters);
    if (result.success) {
      setAuditLogs(result.data);
    }
  };

  const handleOpenRoleDialog = (user) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setRoleDialogOpen(true);
  };

  const handleCloseRoleDialog = () => {
    setRoleDialogOpen(false);
    setSelectedUser(null);
    setNewRole('');
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    setLoading(true);
    const result = await updateUserRole(selectedUser.id, newRole, currentUser.uid);
    setLoading(false);

    if (result.success) {
      setSuccess(`Role updated to ${newRole} for ${selectedUser.email}`);
      handleCloseRoleDialog();
      loadUsers();
      loadAuditLogs(); // Refresh audit logs
    } else {
      setError(result.error || 'Failed to update role');
    }
  };

  const handleSaveTemplate = async () => {
    setLoading(true);
    const result = await saveBadgeTemplate(template, currentUser.uid);
    setLoading(false);

    if (result.success) {
      setSuccess('Badge template saved successfully!');
      loadActiveTemplate();
      loadAuditLogs(); // Refresh audit logs
    } else {
      setError(result.error || 'Failed to save template');
    }
  };

  const handleTemplateChange = (field, value) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'error',
      'Market Manager': 'primary',
      'On-Site Manager': 'success',
      'Recruiter': 'warning',
      'default': 'default'
    };
    return colors[role] || colors['default'];
  };

  const getActionColor = (action) => {
    if (action.startsWith('UPDATE') || action.startsWith('EDIT')) return 'warning';
    if (action.startsWith('CREATE') || action.startsWith('ADD')) return 'success';
    if (action.startsWith('DELETE')) return 'error';
    return 'default';
  };

  if (!isAuthorized) {
    return (
      <Container maxWidth="md" sx={{ marginTop: 4 }}>
        <Alert severity="error">
          Access Denied: Only Market Managers and Admins can access the Admin Panel.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
        <AdminPanelSettings sx={{ fontSize: 40, marginRight: 2, color: 'primary.main' }} />
        <Typography variant="h4">Admin Panel</Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ marginBottom: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ marginBottom: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="User Management" icon={<People />} iconPosition="start" />
          <Tab label="Badge Template" icon={<BadgeIcon />} iconPosition="start" />
          <Tab label="Audit Logs" icon={<Assessment />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab 0: User Management */}
      {tabValue === 0 && (
        <Paper sx={{ padding: 3 }}>
          <Typography variant="h6" gutterBottom>
            User Role Management
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ marginBottom: 2 }}>
            Manage user roles and permissions for the Crescent Management Platform
          </Typography>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Email</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.displayName || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? dayjs(user.createdAt).format('MMM D, YYYY') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleOpenRoleDialog(user)}
                        disabled={user.id === currentUser.uid}
                      >
                        Change Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary" sx={{ padding: 2 }}>
                        No users found
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Tab 1: Badge Template Designer */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ padding: 3 }}>
              <Typography variant="h6" gutterBottom>
                Badge Template Settings
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ marginBottom: 3 }}>
                Customize the badge layout for printing with Fargo DTC1250e
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={template.companyLogo}
                    onChange={(e) => handleTemplateChange('companyLogo', e.target.checked)}
                  />
                }
                label="Show Company Logo"
                sx={{ marginBottom: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={template.showPhoto}
                    onChange={(e) => handleTemplateChange('showPhoto', e.target.checked)}
                  />
                }
                label="Show Associate Photo"
                sx={{ marginBottom: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={template.showBadgeId}
                    onChange={(e) => handleTemplateChange('showBadgeId', e.target.checked)}
                  />
                }
                label="Show Badge ID"
                sx={{ marginBottom: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={template.showName}
                    onChange={(e) => handleTemplateChange('showName', e.target.checked)}
                  />
                }
                label="Show Name"
                sx={{ marginBottom: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={template.showPosition}
                    onChange={(e) => handleTemplateChange('showPosition', e.target.checked)}
                  />
                }
                label="Show Position"
                sx={{ marginBottom: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={template.showShift}
                    onChange={(e) => handleTemplateChange('showShift', e.target.checked)}
                  />
                }
                label="Show Shift"
                sx={{ marginBottom: 3, display: 'block' }}
              />

              <TextField
                label="Background Color"
                type="color"
                fullWidth
                value={template.backgroundColor}
                onChange={(e) => handleTemplateChange('backgroundColor', e.target.value)}
                sx={{ marginBottom: 2 }}
              />

              <TextField
                label="Text Color"
                type="color"
                fullWidth
                value={template.textColor}
                onChange={(e) => handleTemplateChange('textColor', e.target.value)}
                sx={{ marginBottom: 2 }}
              />

              <Typography gutterBottom>Font Size: {template.fontSize}pt</Typography>
              <Slider
                value={template.fontSize}
                onChange={(e, newValue) => handleTemplateChange('fontSize', newValue)}
                min={8}
                max={20}
                step={1}
                marks
                valueLabelDisplay="auto"
                sx={{ marginBottom: 3 }}
              />

              <FormControl fullWidth sx={{ marginBottom: 2 }}>
                <InputLabel>Photo Size</InputLabel>
                <Select
                  value={template.photoSize}
                  label="Photo Size"
                  onChange={(e) => handleTemplateChange('photoSize', e.target.value)}
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ marginBottom: 3 }}>
                <InputLabel>Layout</InputLabel>
                <Select
                  value={template.layout}
                  label="Layout"
                  onChange={(e) => handleTemplateChange('layout', e.target.value)}
                >
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="compact">Compact</MenuItem>
                  <MenuItem value="detailed">Detailed</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                onClick={handleSaveTemplate}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Template'}
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ padding: 3, backgroundColor: template.backgroundColor }}>
              <Typography variant="h6" gutterBottom>
                Badge Preview
              </Typography>
              <Box
                sx={{
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  padding: 3,
                  textAlign: 'center',
                  backgroundColor: '#fff'
                }}
              >
                {template.companyLogo && (
                  <Typography variant="h6" sx={{ marginBottom: 2, fontWeight: 'bold' }}>
                    CRESCENT MANAGEMENT
                  </Typography>
                )}

                {template.showPhoto && (
                  <Box
                    sx={{
                      width: template.photoSize === 'small' ? 80 : template.photoSize === 'large' ? 160 : 120,
                      height: template.photoSize === 'small' ? 80 : template.photoSize === 'large' ? 160 : 120,
                      backgroundColor: '#e0e0e0',
                      margin: '0 auto 16px',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="caption">Photo</Typography>
                  </Box>
                )}

                {template.showBadgeId && (
                  <Typography
                    variant="body2"
                    sx={{ color: template.textColor, fontSize: template.fontSize - 2, marginBottom: 1 }}
                  >
                    PLX-00012345-DOE
                  </Typography>
                )}

                {template.showName && (
                  <Typography
                    variant="h6"
                    sx={{ color: template.textColor, fontSize: template.fontSize + 4, fontWeight: 'bold', marginBottom: 1 }}
                  >
                    JOHN DOE
                  </Typography>
                )}

                {template.showPosition && (
                  <Typography
                    variant="body1"
                    sx={{ color: template.textColor, fontSize: template.fontSize, marginBottom: 1 }}
                  >
                    Production Associate
                  </Typography>
                )}

                {template.showShift && (
                  <Typography
                    variant="body2"
                    sx={{ color: template.textColor, fontSize: template.fontSize - 2 }}
                  >
                    1st Shift
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Audit Logs */}
      {tabValue === 2 && (
        <Paper sx={{ padding: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
            <Typography variant="h6">Audit Logs</Typography>
            <Button
              startIcon={<Refresh />}
              onClick={loadAuditLogs}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ marginBottom: 2 }}>
            Track all user actions and system events
          </Typography>

          <Grid container spacing={2} sx={{ marginBottom: 3 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by User</InputLabel>
                <Select
                  value={filterUserId}
                  label="Filter by User"
                  onChange={(e) => {
                    setFilterUserId(e.target.value);
                    setTimeout(loadAuditLogs, 100);
                  }}
                >
                  <MenuItem value="">All Users</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Action</InputLabel>
                <Select
                  value={filterAction}
                  label="Filter by Action"
                  onChange={(e) => {
                    setFilterAction(e.target.value);
                    setTimeout(loadAuditLogs, 100);
                  }}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="UPDATE_USER_ROLE">Update User Role</MenuItem>
                  <MenuItem value="CREATE_BADGE_TEMPLATE">Create Badge Template</MenuItem>
                  <MenuItem value="CREATE_BADGE">Create Badge</MenuItem>
                  <MenuItem value="UPDATE_BADGE">Update Badge</MenuItem>
                  <MenuItem value="ADD_APPLICANT">Add Applicant</MenuItem>
                  <MenuItem value="UPDATE_APPLICANT">Update Applicant</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <List>
            {auditLogs.map((log) => (
              <ListItem
                key={log.id}
                sx={{
                  borderLeft: 4,
                  borderColor: getActionColor(log.action) + '.main',
                  marginBottom: 1,
                  backgroundColor: '#f9f9f9'
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={log.action}
                        size="small"
                        color={getActionColor(log.action)}
                      />
                      <Typography variant="body2">
                        {log.performedBy
                          ? (users.find(u => u.id === log.performedBy)?.email ||
                             users.find(u => u.uid === log.performedBy)?.email ||
                             log.performedBy)
                          : 'System'}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" display="block">
                        {log.timestamp ? dayjs(log.timestamp).format('MMM D, YYYY h:mm A') : 'N/A'}
                      </Typography>
                      {log.details && (
                        <Typography variant="caption" color="text.secondary">
                          {JSON.stringify(log.details)}
                        </Typography>
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
            {auditLogs.length === 0 && (
              <Typography color="text.secondary" align="center" sx={{ padding: 4 }}>
                No audit logs found
              </Typography>
            )}
          </List>
        </Paper>
      )}

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onClose={handleCloseRoleDialog}>
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <>
              <Typography gutterBottom>
                User: {selectedUser.email}
              </Typography>
              <FormControl fullWidth sx={{ marginTop: 2 }}>
                <InputLabel>New Role</InputLabel>
                <Select
                  value={newRole}
                  label="New Role"
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <MenuItem value="On-Site Manager">On-Site Manager</MenuItem>
                  <MenuItem value="Recruiter">Recruiter</MenuItem>
                  <MenuItem value="Market Manager">Market Manager</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRoleDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpdateRole}
            disabled={loading || !newRole}
          >
            {loading ? 'Updating...' : 'Update Role'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;
