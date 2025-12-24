
import React from 'react';
import { Typography, Container, Paper, Box, Avatar } from '@mui/material';

function AboutPage() {
  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{
        marginTop: 8,
        padding: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        borderRadius: '15px',
        boxShadow: '0 8px 32px 0 rgba( 31, 38, 135, 0.37 )',
        textAlign: 'center'
      }}>
        <Avatar sx={{
          margin: 'auto',
          bgcolor: '#FF8E53',
          width: 56,
          height: 56
        }}>
          A
        </Avatar>
        <Typography component="h1" variant="h4" sx={{
          fontFamily: "'Roboto', sans-serif",
          fontWeight: 700,
          color: '#333',
          mt: 2
        }}>
          About Us
        </Typography>
        <Typography variant="h6" sx={{ mt: 2, color: '#555' }}>
          We are a team of passionate developers dedicated to creating amazing web experiences.
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, color: '#777', textAlign: 'left' }}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </Typography>
      </Paper>
    </Container>
  );
}

export default AboutPage;
