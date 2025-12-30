# Badge Management System - Crescent Management Platform V0.1

## Overview

The Badge Management System integrates directly into the Crescent Management Platform, replacing the need for CloudBadging.idwholesaler.com. This system provides a complete solution for creating, managing, and printing associate badges with the Fargo DTC1250e printer.

## Features

### 1. Badge Creation
- **Photo Capture**: Use webcam to take photos directly in the browser
- **Photo Upload**: Upload existing photos from your device
- **Associate Information**: Store first name, last name, Employee ID, position, shift, and notes
- **Auto-Generated Badge ID**: Format PLX-########-ABC (EID + last name first 3 letters)
- **Status Management**: Set badge status (Pending, Cleared, Not Cleared, Suspended)
- **Firebase Storage**: Photos stored securely in Firebase Cloud Storage
- **Integrated with Applicants**: Badges auto-created when adding new applicants

### 2. Badge Lookup & Verification
- **Search by Name or EID**: Quick lookup of any associate
- **Visual Badge Display**: See badge photo and all details
- **Status Verification**: Check if associate is cleared to start
- **Status Updates**: Mark badges as Cleared or Not Cleared
- **Issue Tracking**: Track when badges are printed and issued

### 3. Print Queue Management
- **Fargo DTC1250e Integration**: **Print queue supported; direct printer driver (HID/WebUSB) integration is planned and currently TODO**
- **Priority Queue**: Normal or Urgent priority levels
- **Print Tracking**: Monitor print status and completion (manual acknowledgement)
- **Batch Printing**: Queue multiple badges for printing
- **Print History**: Track when each badge was printed and by whom

> **Note:** The app currently supports a print queue and a browser-based print fallback; direct card-printer SDK/HID integration is a planned enhancement (see FUTURE_WORK.md and `src/services/printService.js` for TODOs).

## How to Use

### Creating a New Badge

1. **Navigate to Badge Management**
   - Click "Badges" in the main navigation
   - Or use the "Badge Management" quick action on the home page

2. **Enter Badge Information**
   - First Name
   - Last Name
   - Employee ID (must be unique)
   - Badge ID is auto-generated as PLX-########-ABC
   - Position
   - Shift (1st or 2nd)
   - Status (Pending, Cleared, Not Cleared, or Suspended)
   - Optional notes

3. **Add Photo**
   - **Option A: Webcam**
     - Click "Use Webcam"
     - Position associate in frame
     - Click "Capture Photo"
   - **Option B: Upload**
     - Click "Upload Photo"
     - Select image from your computer

4. **Create Badge**
   - Review all information
   - Click "Create Badge"
   - Badge is immediately saved to database with photo

### Looking Up an Associate

1. **Go to "Lookup & Verify" Tab**

2. **Search**
   - Enter name or Employee ID
   - Click "Search" or press Enter

3. **Review Results**
   - See all matching badges with photos
   - Check clearance status
   - View print and issue history

4. **Verify Status**
   - Click "View Details" on any badge
   - See full badge information
   - Update status if needed:
     - Mark Cleared
     - Mark Not Cleared
     - Mark Issued (after printing)

### Printing Badges

1. **From Lookup Results**
   - Search for the associate
   - Click "Print" button (only shows for Cleared badges)
   - Badge is added to print queue

2. **Process Print Queue**
   - Go to "Print Queue" tab
   - See all badges queued for Fargo DTC1250e
   - Priority badges appear first
   - Send to printer (follow Fargo software instructions)
   - Mark as "Printed" after physical print

3. **Issue Badge**
   - After printing, find the badge again
   - Click "Mark Issued" when you give it to the associate
   - Tracks who issued it and when

## Integration with Applicant Tracking

The badge system is designed to work seamlessly with your applicant tracking:

1. **Applicant → Badge**
   - When applicant status changes to "Hired" or "Started"
   - Create their badge immediately
   - Set status to "Pending" until background check clears

2. **Badge → Start Verification**
   - On-site managers can quickly verify if someone is cleared to start
   - Search by name or EID
   - If badge shows "Cleared" status, they can start
   - If "Not Cleared" or "Suspended", they cannot start

3. **Data Entry Integration**
   - When recording new starts in daily data entry
   - Badge creation confirms the associate exists in the system
   - Printed badges verify identity on site

## Database Structure

### badges Collection

```javascript
{
  badgeId: "PLX-00012345-DOE", // Auto-generated: PLX-EID-LastName3Letters
  eid: "12345",
  firstName: "JOHN",
  lastName: "DOE",
  photoURL: "https://firebase-storage-url/...",
  status: "Cleared", // Pending, Cleared, Not Cleared, Suspended
  position: "Production Associate",
  shift: "1st",
  notes: "Orientation completed",
  applicantId: "reference-to-applicant", // Optional
  createdAt: timestamp,
  createdBy: uid,
  printedAt: timestamp,
  printedBy: uid,
  issuedAt: timestamp,
  issuedBy: uid,
  expirationDate: timestamp
}
```

### badgePrintQueue Collection

```javascript
{
  badgeId: "PLX-00012345-DOE", // Reference to badge ID
  eid: "12345",
  firstName: "JOHN",
  lastName: "DOE",
  priority: "Normal", // Normal or Urgent
  status: "Queued", // Queued, Printing, Completed
  printerName: "Fargo DTC1250e",
  queuedAt: timestamp,
  queuedBy: uid,
  completedAt: timestamp
}
```

## Workflow Examples

### New Hire Workflow

1. **Applicant applies** → Tracked in Applicants page
2. **Interview and process** → Status updated
3. **Hire decision** → Status: "Hired"
4. **Background check pending** → Create badge with status "Pending"
5. **Background check clears** → Update badge to "Cleared"
6. **Start date approaches** → Add badge to print queue
7. **Day of start** → Print badge, issue to associate
8. **Associate arrives** → On-site manager verifies badge status
9. **Mark issued** → Badge given to associate

### Daily On-Site Workflow

**Morning (Pre-Shift)**
1. Associates arrive for work
2. On-site manager or assistant searches each associate by name/EID
3. Verify badge status shows "Cleared"
4. If "Not Cleared", send home and notify recruiting
5. New starts: Print and issue badges

**During Shift**
1. If badge is lost, search associate
2. Add to print queue with "Urgent" priority
3. Print replacement badge
4. Issue to associate

## Firebase Storage Setup

1. **Enable Firebase Storage** in your Firebase Console
2. **Security Rules** (already included in FIREBASE_SETUP.md)
3. **Photos are stored at**: `badges/{eid}_{timestamp}.jpg`
4. **Public URLs** generated automatically for display

## Fargo DTC1250e Printer Integration

### Current Setup
- Print queue tracks badges ready to print
- Badge data includes all information needed
- Photo URLs accessible for printing

### Future Enhancement Options
1. **Direct Printer Integration**
   - Connect to Fargo printer API
   - Auto-print from queue
   - Status updates automatic

2. **Barcode/QR Code**
   - Generate unique codes for each badge
   - Quick scan verification

3. **Badge Templates**
   - Customizable badge layouts
   - Company logo integration
   - Multiple badge types

## Benefits Over CloudBadging

1. **All-in-One Platform**: Everything in one place
2. **Better Integration**: Direct link to applicant tracking
3. **Start Verification**: Real-time clearance status
4. **Data Ownership**: Your data stays in your Firebase
5. **Custom Workflow**: Tailored to Crescent operations
6. **Cost Savings**: No external service fees
7. **Audit Trail**: Complete history of who created, printed, issued
8. **Offline Capable**: Photos stored locally in Firebase

## Security & Permissions

- **Create Badges**: On-Site Managers, Market Managers, Admins
- **View Badges**: All authenticated users
- **Update Status**: On-Site Managers, Market Managers, Admins
- **Print Badges**: On-Site Managers, Market Managers, Admins
- **Photos**: Stored securely in Firebase Storage with authentication required

## Future Enhancements (V0.2+)

- [ ] Bulk badge creation from applicant list
- [ ] Badge expiration and renewal alerts
- [ ] Mobile badge scanning app
- [ ] Automatic background check status integration
- [ ] Badge activity logging (clock-in/out)
- [ ] Visitor badge creation
- [ ] Multi-site badge management
- [ ] Badge template designer
- [ ] Direct Fargo printer API integration

---

**The badge system is now fully integrated into Crescent Management Platform V0.1!**

All your associate management tools are now in one place - from application to badge to daily operations.
