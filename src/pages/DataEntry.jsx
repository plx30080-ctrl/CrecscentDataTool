import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Divider
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import OnPremiseForm from '../components/dataEntry/OnPremiseForm';
import LaborReportForm from '../components/dataEntry/LaborReportForm';
import BranchDailyForm from '../components/dataEntry/BranchDailyForm';
import BranchWeeklyForm from '../components/dataEntry/BranchWeeklyForm';

const DATA_TYPES = [
  { value: 'onPremise', label: 'On Premise Data' },
  { value: 'laborReport', label: 'Labor Report' },
  { value: 'branchDaily', label: 'Branch Daily Metrics' },
  { value: 'branchWeekly', label: 'Branch Weekly Metrics' }
];

const DataEntry = () => {
  const [selectedType, setSelectedType] = useState('');

  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  const renderForm = () => {
    switch (selectedType) {
      case 'onPremise':
        return <OnPremiseForm />;
      case 'laborReport':
        return <LaborReportForm />;
      case 'branchDaily':
        return <BranchDailyForm />;
      case 'branchWeekly':
        return <BranchWeeklyForm />;
      default:
        return (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
            <Typography variant="h6">
              Please select a data type to begin
            </Typography>
          </Box>
        );
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Data Entry
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select the type of data you want to submit
          </Typography>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="data-type-label">Data Type</InputLabel>
            <Select
              labelId="data-type-label"
              id="data-type-select"
              value={selectedType}
              label="Data Type"
              onChange={handleTypeChange}
            >
              {DATA_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider sx={{ mb: 3 }} />

          {renderForm()}
        </Paper>
      </Container>
    </LocalizationProvider>
  );
};

export default DataEntry;
