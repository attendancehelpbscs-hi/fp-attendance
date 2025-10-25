# Reports Page Fixes TODO

## Backend Updates (reports.service.ts)
- [x] Modify `getAttendanceReports` to include all grade-sections from StudentAttendance, even with 0 attendance
- [x] Add a new function `getPreviousPeriodReports` to calculate data for the previous equivalent period
- [x] Update `getAttendanceSummary` to handle empty data scenarios properly

## Frontend Updates (Reports.tsx)
- [ ] Replace hardcoded comparative values with dynamic data from new API response
- [ ] Add a search input field above the detailed attendance table for filtering rows
- [ ] Add sorting functionality to table columns (Date, Grade, Section, Present, Absent, Rate)
- [ ] Ensure filter options are unique and remove any duplicates

## API Updates (reports.controller.ts)
- [x] Update controller to include previous period data in response

## Testing
- [ ] Test backend logic to ensure all students/grade-sections are included even with 0 attendance
- [ ] Test frontend to verify dynamic comparative data, search, and sorting work correctly
- [ ] Verify filters are unique and data populates properly
