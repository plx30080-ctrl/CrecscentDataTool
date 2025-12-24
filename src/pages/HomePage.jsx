
import React from 'react';
import { Typography, Container, Paper, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container component="main" maxWidth="md">
        <Paper
          elevation={3}
          sx={{
            padding: 6,
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderRadius: '15px',
            boxShadow: '0 8px 32px 0 rgba( 31, 38, 135, 0.37 )',
          }}
        >
          <Typography
            component="h1"
            variant="h2"
            sx={{
              fontFamily: `"'Montserrat'", sans-serif`,
              fontWeight: 700,
              color: '#333',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            Welcome to Our Awesome App!
          </Typography>
          <Typography variant="h5" sx={{ mt: 2, color: '#555', fontFamily: `"'Roboto'", sans-serif` }}>
            The best place to manage your digital life.
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button
              component={Link}
              to="/login"
              variant="contained"
              size="large"
              sx={{
                marginRight: 2,
                background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)',
                },
              }}
            >
              Get Started
            </Button>
            <Button
              component={Link}
              to="/about"
              variant="outlined"
              size="large"
              sx={{ color: '#FF8E53', borderColor: '#FF8E53' }}
            >
              Learn More
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default HomePage;
