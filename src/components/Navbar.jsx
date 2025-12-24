
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

function Navbar({ user }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <AppBar position="static" sx={{ background: 'transparent', boxShadow: 'none', padding: '10px 0' }}>
      <Toolbar>
        <Typography variant="h5" component="div" sx={{ flexGrow: 1, color: '#fff', fontFamily: "'Montserrat'", fontWeight: 700 }}>
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            Dreamscape
          </Link>
        </Typography>
        <Box>
          <Button color="inherit" component={Link} to="/" sx={{ color: '#fff', fontWeight: 500, marginRight: 2, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
            Home
          </Button>
          <Button color="inherit" component={Link} to="/about" sx={{ color: '#fff', fontWeight: 500, marginRight: 2, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
            About
          </Button>
          {user ? (
            <>
              <Button color="inherit" component={Link} to="/profile" sx={{ color: '#fff', fontWeight: 500, marginRight: 2, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
                Profile
              </Button>
              <Button color="inherit" onClick={handleLogout} sx={{ color: '#fff', fontWeight: 500, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login" sx={{ color: '#fff', fontWeight: 500, marginRight: 2, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
                Login
              </Button>
              <Button 
                variant="contained" 
                component={Link} 
                to="/register" 
                sx={{
                  fontWeight: 500,
                  background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                  border: 0,
                  borderRadius: 3,
                  boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
                  color: 'white',
                  padding: '8px 20px',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)',
                  }
                }}
              >
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
