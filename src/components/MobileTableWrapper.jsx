import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';

/**
 * Wrapper component that converts tables to mobile-friendly cards
 * Usage: Wrap table rows with this component and provide renderMobileCard prop
 */
const MobileTableWrapper = ({ children, data, renderMobileCard }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) {
    return children;
  }

  return (
    <Box>
      {data.map((item, index) => (
        <Card key={item.id || index} sx={{ marginBottom: 2 }}>
          <CardContent>
            {renderMobileCard(item)}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default MobileTableWrapper;
