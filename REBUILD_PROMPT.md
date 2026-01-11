# Crescent Management Platform - Rebuild Specification

## Vision

Build a **Workforce Management Platform** for staffing operations at a warehouse/distribution center. The platform tracks the complete employee lifecycle: recruitment pipeline, daily attendance, labor hours, badge management, and corrective actions.

**Core Principle:** All data flows into a **single unified database** centered around the `associates` table. Every upload, import, or data entry updates this central source of truth—never creating disconnected datasets.

---

## Technology Stack

### Frontend
- **Next.js 14+** with App Router
- **TypeScript** for type safety
- **Server Actions** for form handling (minimal client-side state)
- **Shadcn/ui** or **Material-UI** for components
- **Tailwind CSS** for styling
- **Recharts** or **Tremor** for analytics visualizations

### Backend
- **Supabase** (hosted PostgreSQL + Auth + Storage + Edge Functions)
- **Prisma ORM** (optional, for type-safe database queries)
- **Row Level Security (RLS)** for data protection

### Deployment
- **Vercel** (optimized for Next.js)
- Environment-based configuration (dev/staging/prod)

---

## Core Data Architecture

### Design Philosophy

The database is **associate-centric**. The `associates` table is the single source of truth for all people in the system. All other tables link back to associates via foreign keys.

When users upload Excel files, CSV data, or enter forms:
1. Parse the incoming data
2. Match records to existing associates (by EID or name)
3. **Update existing records** or **create new associates** as needed
4. Log the activity with timestamps and user attribution

**Never create orphan datasets.** All data must connect to the central schema.

---

## Database Schema (PostgreSQL)

### Core Tables

```sql
-- Central source of truth for all people
CREATE TABLE associates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eid VARCHAR(20) UNIQUE NOT NULL,          -- Employee ID (primary identifier)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),

  -- Current Status
  status VARCHAR(20) DEFAULT 'Active',       -- Active, Inactive, Terminated, DNR
  pipeline_status VARCHAR(30),               -- Applied, Interviewed, Processed, CB_Updated, Finalized, Started

  -- Assignment
  shift VARCHAR(10),                         -- 1st, 2nd, Flex
  position VARCHAR(100),
  line VARCHAR(50),
  recruiter VARCHAR(100),

  -- Dates
  start_date DATE,
  termination_date DATE,

  -- Photo
  photo_url TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- System users (managers, recruiters, admins)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(200),
  role VARCHAR(30) DEFAULT 'On-Site Manager',  -- On-Site Manager, Recruiter, Market Manager, Admin
  photo_url TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily attendance records (links to associates)
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift VARCHAR(10) NOT NULL,

  -- Attendance data
  scheduled BOOLEAN DEFAULT true,
  present BOOLEAN DEFAULT false,
  hours_worked DECIMAL(4,2),
  is_new_start BOOLEAN DEFAULT false,
  sent_home BOOLEAN DEFAULT false,
  sent_home_reason TEXT,

  -- Source tracking
  source VARCHAR(50),                        -- 'manual_entry', 'excel_upload', 'labor_report'
  source_file VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(associate_id, date, shift)
);

-- Hours worked (aggregated from labor reports)
CREATE TABLE hours_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift VARCHAR(10) NOT NULL,

  total_hours DECIMAL(5,2),
  direct_hours DECIMAL(5,2),
  indirect_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2),

  -- Source tracking
  source_file VARCHAR(255),
  week_ending DATE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(associate_id, date, shift)
);

-- Early leave incidents
CREATE TABLE early_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shift VARCHAR(10) NOT NULL,

  time_left TIME,
  hours_worked DECIMAL(4,2),
  reason VARCHAR(50),                        -- Personal, Medical, Family Emergency, Transportation, Childcare, NCNS, Other
  corrective_action VARCHAR(30),             -- None, Warning, 5_Day_Suspension, DNR

  -- Occurrence tracking (calculated or entered)
  occurrences_14_days INT DEFAULT 0,
  occurrences_30_days INT DEFAULT 0,
  occurrences_90_days INT DEFAULT 0,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

-- Badge records
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id) ON DELETE CASCADE,
  badge_id VARCHAR(50) UNIQUE NOT NULL,      -- Format: PLX-{eid}-{initials}

  status VARCHAR(20) DEFAULT 'Pending',      -- Pending, Cleared, Not_Cleared, Suspended
  photo_url TEXT,

  -- Lifecycle timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  printed_at TIMESTAMPTZ,
  printed_by UUID REFERENCES users(id),
  issued_at TIMESTAMPTZ,
  issued_by UUID REFERENCES users(id)
);

-- Daily shift summaries (aggregated metrics)
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift VARCHAR(10) NOT NULL,

  -- Headcount metrics
  requested INT,
  required INT,
  working INT,
  new_starts INT,
  send_homes INT,
  line_cuts INT,

  -- Hour metrics (aggregated)
  total_hours DECIMAL(8,2),
  direct_hours DECIMAL(8,2),
  indirect_hours DECIMAL(8,2),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(date, shift)
);

-- Recruiter/branch metrics
CREATE TABLE recruiter_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  branch VARCHAR(100),
  recruiter VARCHAR(100),

  interviews_scheduled INT DEFAULT 0,
  interview_shows INT DEFAULT 0,
  shift1_processed INT DEFAULT 0,
  shift2_processed INT DEFAULT 0,
  confirmations INT DEFAULT 0,

  -- Weekly summary fields
  is_weekly_summary BOOLEAN DEFAULT false,
  week_ending DATE,
  total_applicants INT,
  total_processed INT,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- DNR (Do Not Rehire) list
CREATE TABLE dnr_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associate_id UUID REFERENCES associates(id),
  eid VARCHAR(20) NOT NULL,                  -- Stored separately in case associate deleted
  name VARCHAR(200) NOT NULL,

  reason TEXT NOT NULL,
  source VARCHAR(50),                        -- 'early_leave', 'manual', 'termination'
  source_record_id UUID,

  status VARCHAR(20) DEFAULT 'Active',       -- Active, Removed
  date_added TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  removed_at TIMESTAMPTZ,
  removed_by UUID REFERENCES users(id),
  notes TEXT
);

-- Audit log for all actions
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id UUID,
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File upload history
CREATE TABLE upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),                     -- 'labor_report', 'attendance', 'applicants', 'early_leaves'
  file_size INT,

  records_processed INT,
  records_created INT,
  records_updated INT,
  errors JSONB,

  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);
```

### Key Indexes

```sql
CREATE INDEX idx_associates_eid ON associates(eid);
CREATE INDEX idx_associates_status ON associates(status);
CREATE INDEX idx_associates_pipeline ON associates(pipeline_status);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_attendance_associate ON attendance_records(associate_id);
CREATE INDEX idx_hours_date ON hours_records(date);
CREATE INDEX idx_hours_associate ON hours_records(associate_id);
CREATE INDEX idx_early_leaves_associate ON early_leaves(associate_id);
CREATE INDEX idx_early_leaves_date ON early_leaves(date);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date, shift);
```

---

## Authentication & Authorization

### Roles

| Role | Permissions |
|------|-------------|
| **On-Site Manager** | Enter attendance, view shift dashboards, manage badges |
| **Recruiter** | Enter recruiter metrics, view pipeline dashboards |
| **Market Manager** | All above + Admin Panel, user management, all reports |
| **Admin** | Full system access |

### Implementation

- Use **Supabase Auth** with email/password
- Store role in `users` table
- Implement **Row Level Security (RLS)** policies
- Server-side role checks for sensitive operations
- Middleware protection for admin routes

---

## Features & Requirements

### 1. Authentication

**Login Page**
- Email/password authentication
- "Forgot password" flow
- Redirect to dashboard on success

**Signup Page**
- Email, password, name fields
- Auto-create user profile with default role "On-Site Manager"
- Email verification (optional)

**Session Management**
- Persistent sessions with refresh tokens
- Auto-logout on inactivity (configurable)
- Track last login timestamp

---

### 2. Dashboard / Home

**Welcome Section**
- Greeting with user's name
- Current date display
- Role-specific quick tips

**Metric Cards** (real-time from database)
- Today's Working Headcount (by shift)
- Active Pipeline Count (associates not yet started)
- Current Pool (processed in last 14 days)
- Weekly Hours Total

**Quick Actions**
- Enter Daily Data
- View Analytics
- Badge Management
- Upload Data

---

### 3. Data Entry

#### A. Daily Attendance Entry

**Form Fields:**
- Date (default: today)
- Shift selector (1st / 2nd)
- Requested headcount
- Required headcount
- Working headcount
- New starts count
- Send homes count
- Line cuts count
- Notes

**New Starts EID Entry:**
- Dynamic input fields based on new starts count
- Real-time EID validation against `associates` table
- Visual indicators: ✓ Found & Ready | ⚠ Found but wrong status | ✗ Not found
- Option to quick-add unknown EIDs as new associates

**On Submit:**
1. Save to `daily_summaries` table
2. For each validated EID: Update associate's `status` → "Active", `pipeline_status` → "Started"
3. Create `attendance_records` for new starts
4. Log action to `audit_log`

#### B. Labor Report Upload

**Interface:**
- Week ending date picker
- Excel file upload (.xlsx, .xls)
- Parse preview before submission

**Excel Parsing Logic:**
1. Extract employee names/EIDs and hours by day
2. Match each row to an associate (by EID first, then fuzzy name match)
3. Show matching results with confidence scores
4. Allow manual corrections for unmatched records

**On Submit:**
1. Create/update `hours_records` for each employee-date
2. Update `associates` status to "Active" if hours > 0
3. Calculate and update `daily_summaries` aggregates
4. Save to `upload_history` with stats
5. Log action to `audit_log`

#### C. Recruiter Daily Metrics

**Form Fields:**
- Date
- Branch
- Recruiter name (optional)
- Interviews Scheduled
- Interview Shows
- Shift 1 Processed
- Shift 2 Processed
- Confirmations
- Notes

**On Submit:**
1. Save to `recruiter_metrics` table
2. Log action

#### D. Recruiter Weekly Summary

**Form Fields:**
- Week ending date
- Branch
- Total Applicants
- Total Processed
- All daily metric fields (aggregated)

**On Submit:**
1. Save to `recruiter_metrics` with `is_weekly_summary: true`

---

### 4. Analytics Dashboards

#### A. Shift Dashboard (1st / 2nd)

**Filters:**
- Date range picker (default: last 30 days)
- Compare to previous period toggle

**Metrics Cards:**
- Total Hours Worked
- Average Daily Headcount
- New Starts Count
- Send Home Rate (%)

**Charts:**
- Line chart: Daily headcount trend
- Line chart: Daily hours trend (dual Y-axis with headcount)
- Bar chart: New starts by week

**Data Table:**
- Date | Requested | Working | Hours | Direct Hours | New Starts | Send Homes
- Sortable columns
- Export to CSV

#### B. Recruiter Dashboard

**Metrics:**
- Conversion rate (shows / scheduled)
- Processing rate (processed / shows)
- Pipeline velocity

**Charts:**
- Funnel: Scheduled → Shows → Processed → Started
- Trend: Weekly processing volume

#### C. New Starts Analytics

**Metrics:**
- Total new starts (period)
- Retention rate (still active after 30/60/90 days)
- Average time from processed to started

**Charts:**
- New starts trend over time
- Retention cohort analysis

#### D. Year-over-Year Comparison

**Interface:**
- Select two date ranges to compare
- Side-by-side metrics
- Percentage change indicators

---

### 5. Badge Management

#### A. Create Badge

**Form Fields:**
- First Name (required)
- Last Name (required)
- EID (required, validates against associates)
- Position
- Shift
- Status (Pending / Cleared / Not Cleared)
- Notes

**Photo Capture:**
- Webcam capture button (with preview)
- File upload alternative
- Crop/adjust interface

**Badge ID Generation:**
- Format: `PLX-{eid}-{first 3 chars of lastName}`
- Auto-generated, displayed before save

**On Submit:**
1. Upload photo to Supabase Storage
2. Create badge record linked to associate
3. Update associate's `photo_url` if not set
4. Log action

#### B. Badge Lookup & Verification

**Search:**
- Search by name or EID
- Searches both `badges` and `associates` tables
- Shows all matches with source indicator

**Results Display:**
- Card grid with photo, name, EID, status badge
- Click to view full details

**Detail View (Modal/Sheet):**
- Full badge preview (CR80 card layout)
- All badge fields
- Action buttons:
  - Mark Cleared / Not Cleared
  - Print Badge
  - Mark as Issued
  - Edit
  - Delete (with confirmation)

#### C. Print Queue

**Queue List:**
- Badges with status "Pending" or "Cleared" not yet printed
- Checkbox selection (individual + select all)
- Priority indicator

**Actions:**
- Print Selected (opens print dialog with badge layout)
- Mark as Printed (batch update)
- Remove from Queue

**Badge Print Layout (CR80 Standard: 2.125" × 3.375" portrait):**
- Company logo (top center)
- Photo (centered)
- First name (bold, centered)
- Last name (bold, centered)
- Position (smaller, centered)
- Barcode with badge ID (bottom)

---

### 6. Early Leaves Tracker

**Stats Cards:**
- Total Early Leaves (period)
- Warnings Issued
- Suspensions Issued
- DNR Count

**Filters:**
- Search by name or EID
- Shift filter
- Corrective action filter
- Date range

**Data Table:**
- Date | Name | EID | Shift | Time Left | Hours Worked | Reason | Action | 14/30/90 Days | Actions
- Edit/Delete buttons per row

**Add/Edit Form:**
- Associate Name (required)
- EID (required, validates)
- Date
- Shift
- Time Left
- Hours Worked
- Reason (dropdown: Personal, Medical, Family Emergency, Transportation, Childcare, No Call No Show, Other)
- Corrective Action (dropdown: None, Warning, 5 Day Suspension, DNR)
- 14/30/90 Day occurrence counts

**DNR Auto-Add:**
- When corrective action is "DNR", automatically:
  1. Add to `dnr_list` table
  2. Update associate `status` to "DNR"
  3. Show confirmation

---

### 7. Admin Panel

**(Market Manager / Admin only)**

#### A. User Management

**User Table:**
- Email | Name | Role | Created | Last Login | Actions
- Role displayed as colored badge

**Actions:**
- Change Role (dropdown dialog)
- Delete User (with confirmation, cannot delete self)

**Add User:**
- Create invitation or direct user creation

#### B. Audit Logs

**Filters:**
- User filter (dropdown)
- Action type filter
- Date range

**Log Display:**
- Timestamp | User | Action | Details
- Expandable details panel

#### C. Data Management

**Bulk Import:**
- Upload CSV/Excel with field mapping interface
- Preview before import
- Progress indicator for large files

**Data Backup:**
- Export all data as CSV or JSON
- Table-by-table or full database

**Data Cleanup:**
- Remove orphan records
- Deduplicate associates
- Archive old records

#### D. DNR Database

**Table:**
- Name | EID | Reason | Date Added | Status | Actions

**Actions:**
- Remove from DNR (with reason)
- Restore to DNR

**DNR Check:**
- Search interface to check if name/EID is on DNR
- Fuzzy matching for name variations

---

### 8. Bulk Upload System

**Unified Upload Interface:**

1. **File Selection**
   - Drag & drop or click to upload
   - Support: .xlsx, .xls, .csv
   - File size limit indicator

2. **Type Detection**
   - Auto-detect file type based on columns
   - Manual override dropdown

3. **Column Mapping**
   - Display detected columns
   - Map to database fields
   - Show sample data for each column
   - Save mapping templates for reuse

4. **Data Preview**
   - Show first 10-20 rows
   - Highlight validation errors
   - Show match status for associate lookups

5. **Processing**
   - Progress bar
   - Real-time stats: Created / Updated / Errors
   - Error log download

6. **Confirmation**
   - Summary of changes
   - Link to view affected records

**Key Principle:** All uploads must map to the central schema. The system should:
- Match incoming records to existing associates
- Create new associates only when no match found
- Update existing records rather than creating duplicates
- Maintain referential integrity

---

### 9. User Profile

**Display:**
- Profile photo (with upload/change)
- Name (editable)
- Email (read-only)
- Role (read-only)
- Last login timestamp

**Actions:**
- Change password
- Update photo
- Edit name

---

## File Upload Processing Logic

### Labor Report Excel Processing

```
Input: Excel file with columns like [Name, EID, Mon, Tue, Wed, Thu, Fri, Sat, Total]

For each row:
  1. Extract EID (clean/normalize)
  2. Query: SELECT * FROM associates WHERE eid = {extracted_eid}
  3. If found:
     - Create hours_records for each day with hours > 0
     - Update associate.status = 'Active' if not already
  4. If not found:
     - Attempt fuzzy name match
     - If confident match: use that associate
     - If no match: add to "unmatched" list for review
  5. Log all operations

Output:
  - hours_records created/updated
  - associates updated
  - upload_history record
  - List of unmatched for manual review
```

### Applicant CSV Processing

```
Input: CSV with applicant data [Name, EID, Status, Recruiter, etc.]

For each row:
  1. Extract and normalize EID
  2. Query existing associate by EID
  3. If exists: UPDATE with new data (merge, don't overwrite non-null)
  4. If not exists: INSERT new associate
  5. Track pipeline_status changes

Output:
  - associates created/updated
  - Pipeline status change log
```

---

## UI/UX Guidelines

### Design Principles
- Clean, professional interface suitable for warehouse environment
- High contrast for visibility
- Large touch targets for tablet use
- Fast load times (< 2 seconds for any page)

### Theme
- Primary: Deep Purple (#673ab7)
- Secondary: Amber (#ffc107)
- Font: Montserrat (headings), Inter or Roboto (body)

### Responsive Breakpoints
- Desktop: Full feature set, multi-column layouts
- Tablet: Simplified navigation, larger buttons
- Mobile: Single column, bottom navigation

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader friendly labels

---

## Security Requirements

1. **Authentication**
   - Secure password requirements (8+ chars, mixed case, numbers)
   - Rate limiting on login attempts
   - Session timeout after inactivity

2. **Authorization**
   - Row Level Security on all tables
   - Server-side role verification
   - Admin actions require re-authentication

3. **Data Protection**
   - No sensitive data in URLs
   - Sanitize all user inputs
   - Prepared statements for all queries (Prisma handles this)

4. **Audit Trail**
   - Log all data modifications
   - Include user ID, timestamp, before/after values
   - Immutable audit log

---

## Performance Requirements

- Page load: < 2 seconds
- Form submission: < 1 second response
- Dashboard queries: < 500ms
- File upload processing: Real-time progress, < 30 seconds for 1000 rows
- Support 50+ concurrent users

---

## Deployment Checklist

1. Set up Supabase project
2. Run database migrations
3. Configure RLS policies
4. Set up Storage buckets (badges, user-photos)
5. Configure auth providers
6. Deploy to Vercel
7. Set environment variables
8. Create initial admin user
9. Test all features in production

---

## Success Criteria

The rebuild is successful when:

1. **Single Source of Truth**: All data flows through the central `associates` table
2. **No Orphan Data**: Every record links back to the core schema
3. **File Uploads Update, Don't Create**: Imports merge with existing data
4. **Type Safety**: Full TypeScript coverage with no `any` types
5. **Performance**: All metrics within requirements
6. **User Adoption**: Existing users can perform all current tasks

---

This specification provides the requirements and architecture. Implementation details (file structure, component naming, state management approach) are intentionally flexible to allow for optimal solutions during development.
