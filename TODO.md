# TODO: Implement Clickable Present/Absent Numbers in Detailed Attendance Report

## Backend Changes
- [x] Add new service function `getStudentsByStatus` in `server/src/services/reports.service.ts`
- [x] Add new controller function `getStudentsByStatusController` in `server/src/controllers/reports.controller.ts`
- [x] Add new route `/api/reports/:staff_id/students-by-status` in `server/src/routes/reports.route.ts`

## Frontend Changes
- [x] Create new modal component `StudentAttendanceModal` in `client/src/components/`
- [x] Add new API hook `useGetStudentsByStatus` in `client/src/api/atttendance.api.ts`
- [ ] Update `Reports.tsx` to make Present/Absent numbers clickable and handle modal state
- [ ] Add time check for Absent modal (only show after 5:00 PM)

## Testing
- [ ] Test Present modal functionality
- [ ] Test Absent modal functionality and time restrictions
- [ ] Verify data accuracy for present/absent students
