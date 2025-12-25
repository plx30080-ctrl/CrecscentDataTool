import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useAuth } from '../contexts/AuthProvider';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    role: 'On-Site Manager'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password || !formData.displayName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await signup(
      formData.email,
      formData.password,
      formData.displayName,
      formData.role
    );
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Failed to create account');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ marginTop: 8 }}>
        <Paper sx={{ padding: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Sign Up
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
            Create your Mid-States Workforce Management account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ marginTop: 2, marginBottom: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ marginTop: 3 }}>
            <TextField
              label="Full Name"
              name="displayName"
              fullWidth
              required
              value={formData.displayName}
              onChange={handleChange}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              fullWidth
              required
              value={formData.email}
              onChange={handleChange}
              sx={{ marginBottom: 2 }}
            />
            <FormControl fullWidth sx={{ marginBottom: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Role"
              >
                <MenuItem value="On-Site Manager">On-Site Manager</MenuItem>
                <MenuItem value="Recruiter">Recruiter</MenuItem>
                <MenuItem value="Market Manager">Market Manager</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Password"
              name="password"
              type="password"
              fullWidth
              required
              value={formData.password}
              onChange={handleChange}
              sx={{ marginBottom: 2 }}
              helperText="Must be at least 6 characters"
            />
            <TextField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              fullWidth
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              sx={{ marginBottom: 3 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </Button>
          </Box>

          <Box sx={{ marginTop: 3, textAlign: 'center' }}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login">
                Login
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Signup;
