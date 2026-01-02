import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, CardActions, Button, Paper, Box, Chip } from '@mui/material';
import { Dashboard, Assessment, People, CloudUpload, AddCircle, TrendingUp, Badge } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getOnPremiseData, getApplicantPipeline, getApplicants } from '../services/firestoreService';
import dayjs from 'dayjs';

const EnhancedHome = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [todayStats, setTodayStats] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [currentPool, setCurrentPool] = useState(null);

  useEffect(() => {
    let mounted = true;
    const doLoad = async () => {
      const today = new Date();
      const result = await getOnPremiseData(today, today);
      const pipelineResult = await getApplicantPipeline();
      const applicantsResult = await getApplicants();

      if (mounted && result.success) {
        const todayData = result.data;
        const totalWorking = todayData.reduce((sum, s) => sum + (s.working || 0), 0);
        setTodayStats({ shiftsRecorded: todayData.length, totalWorking });
      }

      if (mounted && pipelineResult.success) {
        setPipeline(pipelineResult.data);
      }

      if (mounted && applicantsResult.success) {
        const twoWeeksAgo = dayjs().subtract(14, 'day').toDate();
        // Count applicants processed in last 2 weeks and not yet started/hired/declined/rejected
        const excluded = new Set(['Started', 'Hired', 'Declined', 'Rejected']);
        const poolCount = applicantsResult.data.reduce((sum, a) => {
          const processed = a.processedDate;
          if (processed && !excluded.has(a.status) && processed >= twoWeeksAgo) return sum + 1;
          return sum;
        }, 0);
        setCurrentPool(poolCount);
      }
    };
    doLoad();
    return () => {
      mounted = false;
    };
  }, []);

  const quickActions = [
    {
      title: 'Enter Data',
      description: `Submit today's ${userProfile?.role === 'On-Site Manager' ? 'shift' : userProfile?.role === 'Recruiter' ? 'recruiting' : 'hours'} data`,
      icon: <AddCircle fontSize="large" color="primary" />,
      path: '/data-entry',
      color: '#1976d2'
    },
    {
      title: 'View Dashboard',
      description: 'Analyze trends and performance metrics',
      icon: <Dashboard fontSize="large" color="success" />,
      path: '/analytics',
      color: '#2e7d32'
    },
    {
      title: 'Badge Management',
      description: 'Create badges, verify status, and print',
      icon: <Badge fontSize="large" sx={{ color: '#f50057' }} />,
      path: '/badges',
      color: '#f50057'
    },
    {
      title: 'Performance Scorecard',
      description: 'Review key performance indicators',
      icon: <Assessment fontSize="large" color="secondary" />,
      path: '/scorecard',
      color: '#9c27b0'
    },
    {
      title: 'Manage Applicants',
      description: 'Track recruiting pipeline',
      icon: <People fontSize="large" color="info" />,
      path: '/applicants',
      color: '#0288d1'
    },
    {
      title: 'Upload Data',
      description: 'Bulk import historical records',
      icon: <CloudUpload fontSize="large" color="warning" />,
      path: '/upload',
      color: '#ed6c02'
    }
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ marginBottom: 4 }}>
        <Typography variant="h3" gutterBottom>
          Welcome back, {userProfile?.displayName || 'User'}!
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {dayjs().format('dddd, MMMM D, YYYY')}
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ marginBottom: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Today's Attendance</Typography>
              <Typography variant="h3" sx={{ marginTop: 2 }}>
                {todayStats ? todayStats.totalWorking : '-'}
              </Typography>
              <Typography variant="body2" sx={{ marginTop: 1 }}>
                {todayStats?.shiftsRecorded || 0} shifts recorded
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Active Pipeline</Typography>
              <Typography variant="h3" sx={{ marginTop: 2 }}>
                {pipeline ? pipeline?.byStatus?.['CB Updated'] ?? 0 : '-'}
              </Typography>
              <Typography variant="body2" sx={{ marginTop: 1 }}>
                CB Updated
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Typography variant="h6">Current Pool</Typography>
              <Typography variant="h3" sx={{ marginTop: 2 }}>
                {typeof currentPool === 'number' ? currentPool : '-'}
              </Typography>
              <Typography variant="body2" sx={{ marginTop: 1 }}>
                Processed in last 2 weeks, not started
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ffd59a 0%, #ffb74d 100%)', color: 'black' }}>
            <CardContent>
              <Typography variant="h6">Conversion Rate</Typography>
              <Typography variant="h3" sx={{ marginTop: 2 }}>
                {pipeline ? pipeline.conversionRate : '-'}%
              </Typography>
              <Typography variant="body2" sx={{ marginTop: 1 }}>
                Applicant to Start
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Typography variant="h5" gutterBottom sx={{ marginBottom: 3 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={3}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                  {action.icon}
                  <Typography variant="h6" sx={{ marginLeft: 2 }}>
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="large"
                  fullWidth
                  variant="contained"
                  onClick={() => navigate(action.path)}
                  sx={{ background: action.color }}
                >
                  Go
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Role-specific Tips */}
      <Paper sx={{ padding: 3, marginTop: 4, background: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          Tips for {userProfile?.role}
        </Typography>
        {userProfile?.role === 'On-Site Manager' && (
          <Typography variant="body1">
            Remember to record shift data daily, including new starts and send homes. This data drives our forecasting and helps us stay properly staffed.
          </Typography>
        )}
        {userProfile?.role === 'Recruiter' && (
          <Typography variant="body1">
            Keep your daily recruiting metrics up to date. Track interview shows and applicants processed to help us optimize our hiring funnel.
          </Typography>
        )}
        {userProfile?.role === 'Market Manager' && (
          <Typography variant="body1">
            Review the dashboard regularly for trends. Use the scorecard to identify areas for improvement and celebrate wins with your team.
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default EnhancedHome;
