import React from 'react';
import { Typography, Container } from '@mui/material';

const Home = () => {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Welcome to the Workforce Management App
      </Typography>
      <Typography variant="body1">
        Use the navigation bar to access the different tools and features.
      </Typography>
    </Container>
  );
};

export default Home;
