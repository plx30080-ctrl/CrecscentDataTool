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
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  AdminPanelSettings,
  People,
  Assessment,
  Edit,
  Refresh
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthProvider';
import {
  getAllUsers,
  updateUserRole,
  getAuditLogs
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
      loadAuditLogs();
    }
  }, [isAuthorized]);

  const loadUsers = async () => {
    const result = await getAllUsers();
    if (result.success) {
      setUsers(result.data);
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

      {/* Tab 1: Audit Logs */}
      {tabValue === 1 && (
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
