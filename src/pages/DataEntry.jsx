import React, { useState } from 'react';
import { Typography, Container, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import MarketManagerForm from '../components/MarketManagerForm';
import RecruiterForm from '../components/RecruiterForm';
import OnSiteManagerForm from '../components/OnSiteManagerForm';

const DataEntry = () => {
  const [role, setRole] = useState('');

  const handleRoleChange = (event) => {
    setRole(event.target.value);
  };

  const renderForm = () => {
    switch (role) {
      case 'Market Manager':
        return <MarketManagerForm />;
      case 'Recruiter':
        return <RecruiterForm />;
      case 'On-Site Manager':
        return <OnSiteManagerForm />;
      default:
        return null;
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Data Entry
      </Typography>
      <FormControl fullWidth sx={{ marginBottom: '2rem' }}>
        <InputLabel id="role-select-label">Select Your Role</InputLabel>
        <Select
          labelId="role-select-label"
          id="role-select"
          value={role}
          label="Select Your Role"
          onChange={handleRoleChange}
        >
          <MenuItem value="Market Manager">Market Manager</MenuItem>
          <MenuItem value="Recruiter">Recruiter</MenuItem>
          <MenuItem value="On-Site Manager">On-Site Manager</MenuItem>
        </Select>
      </FormControl>
      {renderForm()}
    </Container>
  );
};

export default DataEntry;
