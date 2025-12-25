# Admin Panel - Crescent Management Platform V0.1

## Overview

The Admin Panel provides Market Managers and Administrators with powerful tools to manage users, customize badge templates, and monitor system activity through comprehensive audit logs.

## Access Control

**Who Can Access:**
- Market Managers
- Admins

**Access Denied:**
- On-Site Managers
- Recruiters
- Regular users

The Admin Panel link only appears in the navigation bar for authorized users.

## Features

### 1. User Role Management

Manage user roles and permissions across the entire platform.

#### Available Roles:
- **Admin** - Full system access
- **Market Manager** - Oversight and management capabilities
- **On-Site Manager** - Daily operations and shift management
- **Recruiter** - Applicant tracking and recruiting functions

#### Capabilities:
- View all system users
- See user email, name, role, and creation date
- Change user roles with a single click
- Prevent users from changing their own role
- All role changes are logged in the audit system

#### How to Use:
1. Navigate to **Admin** → **User Management** tab
2. View the list of all users
3. Click **Change Role** next to any user
4. Select the new role from the dropdown
5. Click **Update Role**
6. The change is immediately reflected and logged

#### User Table Columns:
- Email
- Name
- Current Role (color-coded chip)
- Account Created Date
- Actions (Change Role button)

### 2. Badge Template Designer

Customize the appearance and layout of printed badges for the Fargo DTC1250e printer.

#### Template Options:

**Display Elements:**
- Company Logo toggle
- Associate Photo toggle
- Badge ID display (PLX-########-ABC format)
- Name display
- Position display
- Shift display

**Visual Customization:**
- Background Color (color picker)
- Text Color (color picker)
- Font Size (8pt - 20pt slider)
- Photo Size (Small/Medium/Large)
- Layout Style (Standard/Compact/Detailed)

#### Live Preview:
- Real-time preview updates as you make changes
- See exactly how the badge will look when printed
- Preview shows sample data:
  - Badge ID: PLX-00012345-DOE
  - Name: JOHN DOE
  - Position: Production Associate
  - Shift: 1st Shift

#### How to Use:
1. Navigate to **Admin** → **Badge Template** tab
2. Adjust toggles to show/hide elements
3. Choose colors using color pickers
4. Adjust font size with the slider
5. Select photo size and layout
6. View live preview on the right
7. Click **Save Template** when satisfied
8. The new template becomes active immediately
9. All future badges will use this template

#### Template Activation:
- Only ONE template can be active at a time
- Saving a new template automatically deactivates previous templates
- Template changes are logged in the audit system

### 3. Audit Logs

Track all user actions and system events for compliance and security.

#### What's Logged:
- User role changes
- Badge template creations
- Badge creations and updates
- Applicant additions and updates
- All administrative actions

#### Log Information:
- Action type (color-coded)
- User who performed the action
- Timestamp (date and time)
- Additional details (JSON format)

#### Filtering Options:
- **Filter by User** - See all actions by a specific user
- **Filter by Action Type** - See all instances of a specific action
- **Refresh Button** - Reload latest logs

#### Action Color Coding:
- **Green** - CREATE/ADD actions
- **Yellow** - UPDATE/EDIT actions
- **Red** - DELETE actions
- **Gray** - Other actions

#### How to Use:
1. Navigate to **Admin** → **Audit Logs** tab
2. Use filters to narrow down logs:
   - Select a user from the dropdown
   - Select an action type from the dropdown
3. View detailed log entries
4. Click **Refresh** to reload latest logs

#### Log Entry Format:
```
[ACTION TYPE CHIP] user@example.com
MMM D, YYYY h:mm AM/PM
{"key": "value"} // Additional details
```

## Database Schema

### badgeTemplates Collection

```javascript
{
  companyLogo: boolean,
  showPhoto: boolean,
  showBadgeId: boolean,
  showName: boolean,
  showPosition: boolean,
  showShift: boolean,
  backgroundColor: string, // Hex color
  textColor: string, // Hex color
  fontSize: number, // 8-20
  photoSize: "small" | "medium" | "large",
  layout: "standard" | "compact" | "detailed",
  isActive: boolean,
  createdBy: string, // User ID
  createdAt: timestamp
}
```

### auditLog Collection

```javascript
{
  action: string, // e.g., "UPDATE_USER_ROLE", "CREATE_BADGE"
  performedBy: string, // User ID
  targetUserId: string, // Optional - for user-related actions
  details: object, // Action-specific details
  timestamp: timestamp
}
```

### users Collection (Updated Fields)

```javascript
{
  email: string,
  displayName: string,
  role: string,
  createdAt: timestamp,
  updatedAt: timestamp,
  updatedBy: string // User ID of who last updated
}
```

## Security Features

### Role-Based Access
- Admin Panel only accessible to Market Managers and Admins
- User role updates require proper permissions
- Badge template changes require admin permissions
- Audit logs are read-only for Market Managers

### Audit Trail
- Every administrative action is automatically logged
- Logs include user, timestamp, and action details
- Logs cannot be deleted by regular users
- Complete accountability for all system changes

### Self-Protection
- Users cannot change their own role
- Prevents privilege escalation
- Admin role can only be assigned by another admin

## Use Cases

### 1. New Employee Onboarding
**Scenario:** New recruiter joins the team

**Steps:**
1. User signs up for account (default role: none)
2. Market Manager navigates to Admin → User Management
3. Finds new user in the list
4. Changes role to "Recruiter"
5. Recruiter can now access applicant tracking

### 2. Badge Design Update
**Scenario:** Company rebrands with new colors

**Steps:**
1. Market Manager navigates to Admin → Badge Template
2. Updates background color to new brand color
3. Updates text color for contrast
4. Previews the new design
5. Saves template
6. All future badges print with new design

### 3. Security Audit
**Scenario:** Review recent system changes

**Steps:**
1. Admin navigates to Admin → Audit Logs
2. Filters by date range (last 30 days)
3. Reviews all role changes
4. Checks badge creations
5. Verifies all changes are legitimate

### 4. User Permission Review
**Scenario:** Quarterly user access review

**Steps:**
1. Market Manager navigates to Admin → User Management
2. Reviews all user roles
3. Identifies users who changed positions
4. Updates roles accordingly
5. All changes automatically logged

## Best Practices

### User Management
- Review user permissions quarterly
- Remove access for terminated employees immediately
- Use least privilege principle (assign lowest role needed)
- Document reasons for role changes

### Badge Template
- Test template changes before company-wide rollout
- Keep photo size medium or large for better visibility
- Ensure text color contrasts with background color
- Use standard layout unless specific needs require custom

### Audit Logs
- Review logs weekly for unusual activity
- Filter by user when investigating specific concerns
- Export logs for compliance reporting (future feature)
- Set up alerts for sensitive actions (future feature)

## Troubleshooting

### Can't Access Admin Panel
- Verify your role is "Market Manager" or "admin"
- Contact system administrator to update your role
- Refresh the page after role change

### Role Update Failed
- Cannot change your own role
- Ensure you have proper permissions
- Check audit logs for error details

### Template Not Saving
- Verify all required fields are filled
- Check that colors are valid hex codes
- Ensure you have admin permissions

### Audit Logs Not Loading
- Check your network connection
- Verify you have Market Manager or Admin role
- Refresh the page
- Clear filters and try again

## Future Enhancements (V0.2+)

- [ ] Bulk user import/export
- [ ] Advanced filtering and search in audit logs
- [ ] Email notifications for critical actions
- [ ] Audit log export to CSV/PDF
- [ ] Custom badge template upload
- [ ] Role permission customization
- [ ] User activity dashboards
- [ ] Automated compliance reports
- [ ] Two-factor authentication management
- [ ] Session management and timeout controls

## Integration Points

### With Badge System
- Badge templates apply to all badge printing
- Changes take effect immediately for new badges
- Existing badges retain their original template

### With User Management
- Role changes affect access across entire platform
- Changes reflected in real-time
- No re-login required after role change

### With Audit System
- All admin actions automatically logged
- Logs accessible only to authorized users
- Provides complete audit trail

## Security Considerations

### Data Privacy
- User emails and names are visible to admins
- Audit logs contain sensitive action details
- Access restricted to Market Managers and Admins only

### Compliance
- Audit logs support SOX/GDPR compliance
- Complete history of data access and modifications
- User role changes fully traceable

### Best Practices
- Regularly review user access
- Monitor audit logs for suspicious activity
- Limit number of admin users
- Use strong passwords for admin accounts

---

**The Admin Panel is your command center for managing the entire Crescent Management Platform!** 🎛️
