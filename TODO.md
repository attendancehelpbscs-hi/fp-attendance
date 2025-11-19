# TODO: Implement Session Type (AM/PM) Support Across Frontend

## Overview
Add session_type (AM/PM) filtering and display to dashboard, reports, and attendance history components to properly handle checkins and outs for morning and afternoon sessions.

## Tasks

### 1. Dashboard/Home Page (`client/src/pages/Home.tsx`)
- [ ] Add session type filter dropdown (All, AM, PM)
- [ ] Update stats cards to show AM/PM breakdowns
- [ ] Modify daily trend chart to separate AM/PM data
- [ ] Update grade stats to include session breakdowns

### 2. Reports Page (`client/src/pages/staff/Reports.tsx`)
- [ ] Add session type filter to unified filters
- [ ] Update all report tabs to display session_type column in tables
- [ ] Modify charts to break down data by AM/PM sessions
- [ ] Update export functions to include session_type

### 3. Attendance List Modal (`client/src/components/AttendanceList.tsx`)
- [ ] Add session_type column to the attendance list display
- [ ] Update the display format to show session alongside time_type

### 4. Manage Students Attendance History Modal (`client/src/pages/staff/ManageStudents.tsx`)
- [ ] Add session_type column to the attendance records table
- [ ] Update summary stats to account for AM/PM sessions

### 5. Student List Modal (`client/src/components/StudentListModal.tsx`)
- [ ] Add session_type display in the student list
- [ ] Update filtering to support session type

### 6. API Updates (if needed)
- [ ] Verify all API calls include session_type in responses
- [ ] Update any missing session_type fields in API interfaces

## Implementation Notes
- Backend already supports session_type in database and API responses
- Frontend interfaces already include session_type fields
- Focus on UI updates to display and filter by session type
- Ensure backward compatibility with existing data

## Testing
- [ ] Test AM/PM session filtering on dashboard
- [ ] Test session type display in all tables
- [ ] Test chart breakdowns by session
- [ ] Test export functionality includes session_type
