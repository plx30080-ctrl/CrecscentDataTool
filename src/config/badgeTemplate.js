/**
 * Badge Template Configuration
 * SINGLE SOURCE OF TRUTH for badge layout
 * Used by: BadgePreview, PrintService, and BadgeService
 *
 * CR80 Card Standard: 3.375" × 2.125"
 * Portrait Orientation: 2.125" wide × 3.375" tall
 * At 100 DPI: 212.5px wide × 337.5px tall
 */

export const DEFAULT_BADGE_TEMPLATE = {
  name: 'Default Template',
  isDefault: true,
  cardSize: {
    width: 212.5,   // 2.125" at 100 DPI (portrait width)
    height: 337.5   // 3.375" at 100 DPI (portrait height)
  },
  elements: {
    logo: {
      x: 66,        // Centered: (212.5 - 80) / 2
      y: 10,
      width: 80,
      height: 30,
      url: '/images/plx-logo.png'
    },
    photo: {
      x: 56,        // Centered: (212.5 - 100) / 2
      y: 50,
      width: 100,
      height: 120
    },
    firstName: {
      x: 0,         // Start from left edge
      y: 180,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center',
      width: 212.5  // Full card width for centering
    },
    lastName: {
      x: 0,
      y: 200,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center',
      width: 212.5
    },
    eid: {
      x: 0,
      y: 225,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      width: 212.5
    },
    position: {
      x: 0,
      y: 245,
      fontSize: 11,
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      width: 212.5
    },
    shift: {
      x: 0,
      y: 262,
      fontSize: 11,
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      width: 212.5
    },
    barcode: {
      x: 6,         // Adjusted for better centering with barcode width
      y: 280,       // Moved up slightly to prevent cutoff
      width: 200,   // Full usable width (212.5 - margins)
      height: 40
    }
  }
};
