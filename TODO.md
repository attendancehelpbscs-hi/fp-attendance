# Fix Y-Axis Numbering in Reports Page Charts

## Task: Fix incorrect/redundant y-axis numbering in graphs on Reports page

### Current Issue
- Y-axis displays repeated values like: 1, 1, 1, 0, 0
- Should display proper descending scale: 3, 2, 1, 0

### Root Cause
- YAxis components use `tickCount={5}` which creates duplicate ticks when data range is small
- Need to use `interval={0}` for proper integer-based scaling

### Charts to Fix (6 total)
1. Attendance Percentage by Grade (BarChart)
2. Attendance Trend Over Time (LineChart)
3. Weekly Attendance Patterns (BarChart)
4. Grade-Section Attendance Patterns (BarChart)
5. Grade Performance Comparison (BarChart)
6. Check-in Time Distribution (BarChart)

### Changes Needed
- Update all YAxis components to use `interval={0}` and `domain={[0, 'dataMax']}`
- Remove `tickCount={5}` where present
- Ensure proper integer tick formatting

### Files to Edit
- `bio-attendance-sys-master/client/src/pages/staff/Reports.tsx`

### Status
- [ ] Update Attendance Percentage by Grade chart YAxis
- [ ] Update Attendance Trend Over Time chart YAxis
- [ ] Update Weekly Attendance Patterns chart YAxis
- [ ] Update Grade-Section Attendance Patterns chart YAxis
- [ ] Update Grade Performance Comparison chart YAxis
- [ ] Update Check-in Time Distribution chart YAxis
- [ ] Test changes to ensure proper y-axis scaling
