/**
 * Badge Template Configuration
 * SINGLE SOURCE OF TRUTH for badge layout
 * Used by: BadgePreview, PrintService, and BadgeService
 */

export const DEFAULT_BADGE_TEMPLATE = {
  name: 'Default Template',
  isDefault: true,
  cardSize: {
    width: 337.5,  // 3.375" at 100 DPI
    height: 212.5  // 2.125" at 100 DPI (CR80 standard card size)
  },
  elements: {
    photo: {
      x: 20,
      y: 40,
      width: 100,
      height: 120
    },
    firstName: {
      x: 135,
      y: 50,
      fontSize: 18,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold'
    },
    lastName: {
      x: 135,
      y: 75,
      fontSize: 18,
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold'
    },
    eid: {
      x: 135,
      y: 105,
      fontSize: 14,
      fontFamily: 'Arial, sans-serif'
    },
    position: {
      x: 135,
      y: 125,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif'
    },
    shift: {
      x: 135,
      y: 142,
      fontSize: 12,
      fontFamily: 'Arial, sans-serif'
    },
    logo: {
      x: 240,
      y: 10,
      width: 80,
      height: 30,
      url: '/CrecscentDataTool/images/plx-logo.png'
    },
    barcode: {
      x: 80,
      y: 168,
      width: 180,
      height: 35
    }
  }
};
