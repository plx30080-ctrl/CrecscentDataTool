/**
 * Print Service for HID Card Printer Integration
 *
 * This service handles communication with HID card printers.
 * HID printers typically use browser's native print dialog or require
 * specific driver software to be installed on the client machine.
 *
 * For production use, you may need to:
 * 1. Install HID printer drivers on client machines
 * 2. Use HID SDK/API if available for your printer model
 * 3. Implement WebUSB or similar technology for direct browser communication
 *
 * TODO: Implement direct HID / WebUSB integration for card printers. See `FUTURE_WORK.md` for details;
 * create gated code paths so the app gracefully falls back to browser print dialog when native drivers are unavailable.
 */

import { DEFAULT_BADGE_TEMPLATE } from '../config/badgeTemplate';
import logger from '../utils/logger';

/**
 * Send badge to HID printer
 * @param {Object} badge - Badge data
 * @param {Object} template - Badge template configuration
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendToPrinter = async (badge, template) => {
  try {
    // For browser-based printing, we'll use the native print dialog
    // In production, this would interface with HID printer drivers or SDK

    // Create a print-friendly version of the badge
    const printWindow = window.open('', 'PRINT', 'height=600,width=800');

    if (!printWindow) {
      return { success: false, error: 'Failed to open print window. Please check popup blocker settings.' };
    }

    // Build HTML for printing
    const printContent = buildPrintHTML(badge, template);

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 500));

    // Trigger print
    printWindow.print();

    // Close window after printing
    setTimeout(() => {
      printWindow.close();
    }, 100);

    return { success: true };
  } catch (error) {
    logger.error('Print error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Build HTML content for printing
 * @param {Object} badge - Badge data
 * @param {Object} template - Template configuration
 * @returns {string} HTML content
 */
const buildPrintHTML = (badge, template) => {
  const t = template || DEFAULT_BADGE_TEMPLATE;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Badge - ${badge.firstName} ${badge.lastName}</title>
      <style>
        @page {
          size: 2.125in 3.375in;  /* Portrait: width x height */
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
        .badge-card {
          width: ${t.cardSize.width}px;
          height: ${t.cardSize.height}px;
          position: relative;
          background: white;
          overflow: hidden;
        }
        .photo {
          position: absolute;
          left: ${t.elements.photo.x}px;
          top: ${t.elements.photo.y}px;
          width: ${t.elements.photo.width}px;
          height: ${t.elements.photo.height}px;
        }
        .photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: 1px solid #ccc;
        }
        .placeholder {
          width: 100%;
          height: 100%;
          background-color: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9e9e9e;
          font-size: 48px;
        }
        .first-name {
          position: absolute;
          left: ${t.elements.firstName.x}px;
          top: ${t.elements.firstName.y}px;
          width: ${t.cardSize.width - (t.elements.firstName.x * 2)}px;
          font-size: ${t.elements.firstName.fontSize}px;
          font-weight: bold;
          text-transform: uppercase;
          text-align: ${t.elements.firstName.textAlign || 'left'};
        }
        .last-name {
          position: absolute;
          left: ${t.elements.lastName.x}px;
          top: ${t.elements.lastName.y}px;
          width: ${t.cardSize.width - (t.elements.lastName.x * 2)}px;
          font-size: ${t.elements.lastName.fontSize}px;
          font-weight: bold;
          text-transform: uppercase;
          text-align: ${t.elements.lastName.textAlign || 'left'};
        }
        .eid {
          position: absolute;
          left: ${t.elements.eid.x}px;
          top: ${t.elements.eid.y}px;
          width: ${t.cardSize.width - (t.elements.eid.x * 2)}px;
          font-size: ${t.elements.eid.fontSize}px;
          text-align: ${t.elements.eid.textAlign || 'left'};
        }
        .position {
          position: absolute;
          left: ${t.elements.position.x}px;
          top: ${t.elements.position.y}px;
          width: ${t.cardSize.width - (t.elements.position.x * 2)}px;
          font-size: ${t.elements.position.fontSize}px;
          text-align: ${t.elements.position.textAlign || 'left'};
        }
        .shift {
          position: absolute;
          left: ${t.elements.shift.x}px;
          top: ${t.elements.shift.y}px;
          width: ${t.cardSize.width - (t.elements.shift.x * 2)}px;
          font-size: ${t.elements.shift.fontSize}px;
          text-align: ${t.elements.shift.textAlign || 'left'};
        }
        .logo {
          position: absolute;
          left: ${t.elements.logo?.x || 240}px;
          top: ${t.elements.logo?.y || 10}px;
          width: ${t.elements.logo?.width || 80}px;
          height: ${t.elements.logo?.height || 30}px;
        }
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .barcode {
          position: absolute;
          left: ${t.elements.barcode.x}px;
          top: ${t.elements.barcode.y}px;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="badge-card">
        ${t.elements.logo?.url ? `
        <div class="logo">
          <img src="${window.location.origin}${t.elements.logo.url}" alt="Company Logo" />
        </div>
        ` : ''}
        <div class="photo">
          ${badge.photoURL
            ? `<img src="${badge.photoURL}" alt="${badge.firstName} ${badge.lastName}" />`
            : '<div class="placeholder">👤</div>'
          }
        </div>
        <div class="first-name">${badge.firstName || 'FIRST NAME'}</div>
        <div class="last-name">${badge.lastName || 'LAST NAME'}</div>
        <div class="eid">EID: ${badge.eid || '000000'}</div>
        ${badge.position ? `<div class="position">${badge.position}</div>` : ''}
        ${badge.shift ? `<div class="shift">Shift: ${badge.shift}</div>` : ''}
        <div class="barcode">
          <svg id="barcode"></svg>
        </div>
      </div>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script>
        JsBarcode("#barcode", "${badge.badgeId || 'PLX-00000000-ABC'}", {
          format: "CODE128",
          width: 1.5,
          height: 35,
          displayValue: true,
          fontSize: 10,
          margin: 0
        });
      </script>
    </body>
    </html>
  `;
};

/**
 * Check if HID printer is available/connected
 * This is a placeholder - actual implementation would depend on HID SDK
 * TODO: Replace this stub with real detection using WebUSB/HID SDK, and surface
 * relevant status codes to the UI (connected, error, ready, offline, etc.).
 */
export const checkPrinterStatus = async () => {
  // In production, this would query the HID printer driver/SDK
  return {
    success: true,
    connected: true,
    printerName: 'HID Card Printer',
    status: 'Ready'
  };
};

/**
 * Get list of available printers
 * This is a placeholder for future implementation
 * TODO: Implement enumeration of attached card printers (HID/WebUSB/Local drivers) and
 * return structured metadata the UI can use to present available printers.
 */
export const getAvailablePrinters = async () => {
  // In production, this would enumerate available HID printers
  return {
    success: true,
    printers: [
      { id: 'hid-001', name: 'HID FARGO DTC1250e', status: 'Ready' }
    ]
  };
};


