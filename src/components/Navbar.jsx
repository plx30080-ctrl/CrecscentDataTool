
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <AppBar position="static" sx={{ background: 'transparent', boxShadow: 'none' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: '#fff', fontFamily: "'Montserrat'", fontWeight: 700 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            MyApp
          </Link>
        </Typography>
        <Box>
          <Button color="inherit" component={Link} to="/" sx={{ color: '#fff', fontWeight: 500 }}>
            Home
          </Button>
          <Button color="inherit" component={Link} to="/about" sx={{ color: '#fff', fontWeight: 500 }}>
            About
          </Button>
          <Button color="inherit" component={Link} to="/login" sx={{ color: '#fff', fontWeight: 500 }}>
            Login
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
