import React, { useState } from 'react';
import {
  Container,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import LaborReportDashboard from './LaborReportDashboard';
import RecruiterDashboard from './RecruiterDashboard';

const DASHBOARD_TYPES = [
  { value: 'overview', label: 'Overview', component: null },
  { value: 'labor-reports', label: 'Labor Reports', component: LaborReportDashboard },
  { value: 'recruiter-efficiency', label: 'Recruiter Efficiency', component: RecruiterDashboard }
];

const UnifiedDashboard = () => {
  const [selectedDashboard, setSelectedDashboard] = useState('overview');

  const handleDashboardChange = (event) => {
    setSelectedDashboard(event.target.value);
  };

  const currentDashboard = DASHBOARD_TYPES.find(d => d.value === selectedDashboard);
  const DashboardComponent = currentDashboard?.component;

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DashboardIcon sx={{ fontSize: 40, marginRight: 2, color: 'primary.main' }} />
          <Typography variant="h4">Analytics Dashboard</Typography>
        </Box>

        <FormControl sx={{ minWidth: 250 }}>
          <InputLabel>Dashboard Type</InputLabel>
          <Select
            value={selectedDashboard}
            label="Dashboard Type"
            onChange={handleDashboardChange}
          >
            {DASHBOARD_TYPES.map((dashboard) => (
              <MenuItem key={dashboard.value} value={dashboard.value}>
                {dashboard.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedDashboard === 'overview' ? (
        <Box sx={{ textAlign: 'center', paddingY: 8 }}>
          <Typography variant="h5" gutterBottom>
            Welcome to Analytics Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select a dashboard type from the dropdown above to view detailed analytics.
          </Typography>
        </Box>
      ) : (
        DashboardComponent && <DashboardComponent />
      )}
    </Container>
  );
};

export default UnifiedDashboard;
