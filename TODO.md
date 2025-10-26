# TODO List for Dashboard Integration

## 1. Backend Changes
- [x] Add new service function `getDashboardStats` in `reports.service.ts` to calculate today's attendance stats (totalStudents, presentToday, absentToday, attendanceRate)
- [x] Add new controller function `getDashboardStats` in `reports.controller.ts`
- [x] Add new route `/api/reports/:staff_id/dashboard` in `reports.route.ts`
- [x] Update Joi validation for the new route in `reports.joi.ts`

## 2. Frontend API Changes
- [x] Add new API hook `useGetDashboardStats` in `atttendance.api.ts`
- [x] Update API interfaces in `api.interface.ts` for dashboard stats

## 3. UI Changes
- [x] Modify `Header.tsx` to include navigation menu for authenticated users (Dashboard, Manage Students, etc.)
- [x] Update `Home.tsx` to fetch real data using the new API hook when authenticated
- [x] Replace mock stats with real data from API
- [x] Ensure dashboard is accessible via menu link

## 4. Testing
- [ ] Test the new API endpoint
- [ ] Test dashboard data loading
- [ ] Test navigation menu functionality
- [ ] Verify authentication requirements
