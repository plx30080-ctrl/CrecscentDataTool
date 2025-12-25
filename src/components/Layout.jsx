import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Container } from '@mui/material';

const Layout = () => {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Workforce Management
          </Typography>
          <Button color="inherit" component={Link} to="/">Home</Button>
          <Button color="inherit" component={Link} to="/data-entry">Data Entry</Button>
          <Button color="inherit" component={Link} to="/dashboard">Dashboard</Button>
          <Button color="inherit" component={Link} to="/upload">Upload</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ marginTop: '2rem' }}>
        <Outlet />
      </Container>
    </>
  );
};

export default Layout;
