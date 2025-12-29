import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Menu,
  MenuItem,
  IconButton,
  Chip
} from '@mui/material';
import { AccountCircle } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthProvider';

const Layout = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Crescent Management Platform
          </Typography>
          <Button color="inherit" component={Link} to="/">Home</Button>
          <Button color="inherit" component={Link} to="/data-entry">Data Entry</Button>
          <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
          <Button color="inherit" component={Link} to="/labor-reports">Labor Reports</Button>
          <Button color="inherit" component={Link} to="/applicants">Applicants</Button>
          <Button color="inherit" component={Link} to="/badges">Badges</Button>
          <Button color="inherit" component={Link} to="/early-leaves">Early Leaves</Button>
          <Button color="inherit" component={Link} to="/dnr">DNR</Button>
          {userProfile && (userProfile.role === 'Market Manager' || userProfile.role === 'admin') && (
            <Button color="inherit" component={Link} to="/admin">Admin</Button>
          )}
          <Button color="inherit" component={Link} to="/upload">Upload</Button>

          {currentUser && (
            <Box sx={{ marginLeft: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              {userProfile && (
                <Chip
                  label={userProfile.role}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              )}
              <IconButton
                size="large"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  {userProfile?.displayName || currentUser.email}
                </MenuItem>
                <MenuItem component={Link} to="/profile" onClick={handleClose}>
                  Profile
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <Outlet />
      </Container>
    </>
  );
};

export default Layout;
