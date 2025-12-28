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
 */

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
    console.error('Print error:', error);
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
  const defaultTemplate = {
    cardSize: { width: 337.5, height: 212.5 },
    elements: {
      photo: { x: 20, y: 40, width: 100, height: 120 },
      firstName: { x: 135, y: 50, fontSize: 18 },
      lastName: { x: 135, y: 75, fontSize: 18 },
      eid: { x: 135, y: 105, fontSize: 14 },
      position: { x: 135, y: 125, fontSize: 12 },
      shift: { x: 135, y: 142, fontSize: 12 },
      barcode: { x: 80, y: 168 }
    }
  };

  const t = template || defaultTemplate;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Badge - ${badge.firstName} ${badge.lastName}</title>
      <style>
        @page {
          size: 3.375in 2.125in;
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
          font-size: ${t.elements.firstName.fontSize}px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .last-name {
          position: absolute;
          left: ${t.elements.lastName.x}px;
          top: ${t.elements.lastName.y}px;
          font-size: ${t.elements.lastName.fontSize}px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .eid {
          position: absolute;
          left: ${t.elements.eid.x}px;
          top: ${t.elements.eid.y}px;
          font-size: ${t.elements.eid.fontSize}px;
        }
        .position {
          position: absolute;
          left: ${t.elements.position.x}px;
          top: ${t.elements.position.y}px;
          font-size: ${t.elements.position.fontSize}px;
        }
        .shift {
          position: absolute;
          left: ${t.elements.shift.x}px;
          top: ${t.elements.shift.y}px;
          font-size: ${t.elements.shift.fontSize}px;
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
        JsBarcode("#barcode", "${badge.badgeId || badge.eid || 'PLX-00000000-ABC'}", {
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
