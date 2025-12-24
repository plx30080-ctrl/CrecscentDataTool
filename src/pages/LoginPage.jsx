
import React from 'react';
import { Button, TextField, Typography, Container, Paper, Box } from '@mui/material';
import { Link } from 'react-router-dom';

function LoginPage() {
  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{
        marginTop: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        boxShadow: '0 8px 32px 0 rgba( 31, 38, 135, 0.37 )'
      }}>
        <Typography component="h1" variant="h5" sx={{
          fontFamily: "'Roboto', sans-serif",
          fontWeight: 700,
          color: '#333'
        }}>
          Welcome Back!
        </Typography>
        <Box component="form" sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            variant="outlined"
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            variant="outlined"
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              padding: '10px',
              fontFamily: "'Roboto', sans-serif",
              fontWeight: 500,
              background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
              border: 0,
              borderRadius: 3,
              boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)',
              }
            }}
          >
            Sign In
          </Button>
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#FF8E53', textDecoration: 'none', fontWeight: 'bold' }}>
              Sign Up
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default LoginPage;
