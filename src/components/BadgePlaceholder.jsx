import React from 'react';
import { Box, Typography } from '@mui/material';
import { CameraAlt } from '@mui/icons-material';

const BadgePlaceholder = ({
  width = 200,
  height = 200,
  showAddPhotoOverlay = false,
  onClick
}) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        width: width,
        height: height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden'
      }}
    >
      <img
        src="/CrecscentDataTool/images/default-avatar.png"
        alt="Default Avatar"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />

      {showAddPhotoOverlay && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5
          }}
        >
          <CameraAlt fontSize="small" />
          <Typography variant="caption">Add Photo</Typography>
        </Box>
      )}
    </Box>
  );
};

export default BadgePlaceholder;
