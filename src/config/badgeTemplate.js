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
      url: '/images/plx-logo.png'  // Fixed path (no /CrecscentDataTool prefix)
    },
    photo: {
      x: 56,        // Centered: (212.5 - 100) / 2
      y: 50,
      width: 100,
      height: 120
    },
    firstName: {
      x: 15,        // Left margin
      y: 180,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center'
    },
    lastName: {
      x: 15,
      y: 200,
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center'
    },
    eid: {
      x: 15,
      y: 225,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    },
    position: {
      x: 15,
      y: 245,
      fontSize: 11,
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    },
    shift: {
      x: 15,
      y: 262,
      fontSize: 11,
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center'
    },
    barcode: {
      x: 16,        // Centered: (212.5 - 180) / 2
      y: 285,       // Moved up from 168 to prevent cutoff (was too close to bottom)
      width: 180,
      height: 40    // Increased from 35 for better scanning
    }
  }
};
