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
  Link
} from '@mui/material';
import { useAuth } from '../contexts/AuthProvider';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Failed to log in');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ marginTop: 8 }}>
        <Paper sx={{ padding: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            Login
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
            Mid-States Workforce Management
          </Typography>

          {error && (
            <Alert severity="error" sx={{ marginTop: 2, marginBottom: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ marginTop: 3 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ marginBottom: 2 }}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ marginBottom: 3 }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </Box>

          <Box sx={{ marginTop: 3, textAlign: 'center' }}>
            <Typography variant="body2">
              Don&apos;t have an account?{' '}
              <Link component={RouterLink} to="/signup">
                Sign up
              </Link>
            </Typography>
            <Typography variant="body2" sx={{ marginTop: 1 }}>
              <Link component={RouterLink} to="/forgot-password">
                Forgot password?
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
