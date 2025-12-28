import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import BarcodeGenerator from './BarcodeGenerator';
import BadgePlaceholder from './BadgePlaceholder';
import { DEFAULT_BADGE_TEMPLATE } from '../config/badgeTemplate';

const BadgePreview = ({
  badge,
  template = null,
  scale = 1,
  showGrid = false
}) => {
  const currentTemplate = template || DEFAULT_BADGE_TEMPLATE;
  const { cardSize, elements } = currentTemplate;

  return (
    <Paper
      elevation={3}
      sx={{
        width: cardSize.width,
        height: cardSize.height,
        position: 'relative',
        backgroundColor: '#ffffff',
        overflow: 'hidden',
        border: '1px solid #ccc',
        backgroundImage: showGrid ? 'linear-gradient(#eee 1px, transparent 1px), linear-gradient(90deg, #eee 1px, transparent 1px)' : 'none',
        backgroundSize: showGrid ? '20px 20px' : 'auto',
        transform: scale !== 1 ? `scale(${scale})` : 'none',
        transformOrigin: 'center'
      }}
    >
      {/* Photo */}
      <Box
        sx={{
          position: 'absolute',
          left: elements.photo.x,
          top: elements.photo.y,
          width: elements.photo.width,
          height: elements.photo.height
        }}
      >
        {badge?.photoURL ? (
          <img
            src={badge.photoURL}
            alt={`${badge.firstName} ${badge.lastName}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              border: '1px solid #ccc'
            }}
          />
        ) : (
          <BadgePlaceholder
            width={elements.photo.width}
            height={elements.photo.height}
          />
        )}
      </Box>

      {/* First Name */}
      <Typography
        sx={{
          position: 'absolute',
          left: elements.firstName.x,
          top: elements.firstName.y,
          fontSize: elements.firstName.fontSize,
          fontFamily: elements.firstName.fontFamily,
          fontWeight: elements.firstName.fontWeight,
          textTransform: 'uppercase',
          margin: 0,
          padding: 0,
          lineHeight: 1
        }}
      >
        {badge?.firstName || 'FIRST NAME'}
      </Typography>

      {/* Last Name */}
      <Typography
        sx={{
          position: 'absolute',
          left: elements.lastName.x,
          top: elements.lastName.y,
          fontSize: elements.lastName.fontSize,
          fontFamily: elements.lastName.fontFamily,
          fontWeight: elements.lastName.fontWeight,
          textTransform: 'uppercase',
          margin: 0,
          padding: 0,
          lineHeight: 1
        }}
      >
        {badge?.lastName || 'LAST NAME'}
      </Typography>

      {/* Employee ID */}
      <Typography
        sx={{
          position: 'absolute',
          left: elements.eid.x,
          top: elements.eid.y,
          fontSize: elements.eid.fontSize,
          fontFamily: elements.eid.fontFamily,
          margin: 0,
          padding: 0,
          lineHeight: 1
        }}
      >
        EID: {badge?.eid || '000000'}
      </Typography>

      {/* Position */}
      {badge?.position && (
        <Typography
          sx={{
            position: 'absolute',
            left: elements.position.x,
            top: elements.position.y,
            fontSize: elements.position.fontSize,
            fontFamily: elements.position.fontFamily,
            margin: 0,
            padding: 0,
            lineHeight: 1
          }}
        >
          {badge.position}
        </Typography>
      )}

      {/* Shift */}
      {badge?.shift && (
        <Typography
          sx={{
            position: 'absolute',
            left: elements.shift.x,
            top: elements.shift.y,
            fontSize: elements.shift.fontSize,
            fontFamily: elements.shift.fontFamily,
            margin: 0,
            padding: 0,
            lineHeight: 1
          }}
        >
          Shift: {badge.shift}
        </Typography>
      )}

      {/* Company Logo */}
      {elements.logo.url && (
        <Box
          sx={{
            position: 'absolute',
            left: elements.logo.x,
            top: elements.logo.y,
            width: elements.logo.width,
            height: elements.logo.height
          }}
        >
          <img
            src={elements.logo.url}
            alt="Company Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </Box>
      )}

      {/* Barcode */}
      <Box
        sx={{
          position: 'absolute',
          left: elements.barcode.x,
          top: elements.barcode.y
        }}
      >
        <BarcodeGenerator
          value={badge?.badgeId || 'PLX-00000000-ABC'}
          width={1.5}
          height={elements.barcode.height}
          displayValue={true}
          fontSize={10}
          margin={0}
        />
      </Box>
    </Paper>
  );
};

export default BadgePreview;
