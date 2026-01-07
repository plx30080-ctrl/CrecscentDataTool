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
// V3 Note: Some dashboards temporarily disabled pending refactor to V3 APIs
// import EnhancedDashboard from './EnhancedDashboard';
// import LaborReportDashboard from './LaborReportDashboard';
import RecruiterDashboard from './RecruiterDashboard';
import FirstShiftDashboard from './FirstShiftDashboard';
import SecondShiftDashboard from './SecondShiftDashboard';
import YOYComparison from './YOYComparison';
import NewStartsAnalytics from './NewStartsAnalytics';

const DASHBOARD_TYPES = [
  // { value: 'overview', label: 'Overview', component: EnhancedDashboard }, // Uses getShiftData, getBranchDailyData
  // { value: 'labor-reports', label: 'Labor Reports', component: LaborReportDashboard }, // Uses getLaborReports
  { value: 'recruiter-efficiency', label: 'Recruiter Efficiency', component: RecruiterDashboard },
  { value: 'first-shift', label: '1st Shift Metrics', component: FirstShiftDashboard },
  { value: 'second-shift', label: '2nd Shift Metrics', component: SecondShiftDashboard },
  { value: 'yoy-comparison', label: 'Year-Over-Year Comparison', component: YOYComparison },
  { value: 'new-starts', label: 'New Starts Analytics', component: NewStartsAnalytics }
];

const UnifiedDashboard = () => {
  const [selectedDashboard, setSelectedDashboard] = useState('first-shift');

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

      {DashboardComponent && <DashboardComponent />}
    </Container>
  );
};

export default UnifiedDashboard;
