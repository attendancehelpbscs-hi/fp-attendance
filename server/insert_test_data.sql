INSERT INTO Attendance (id, staff_id, name, date, created_at) VALUES
('test-attendance-1', 'f5453f69-f784-4b7e-8bf1-8358102f63d4', 'Test Attendance 1', '2024-01-15', '2024-01-15 08:00:00'),
('test-attendance-2', 'f5453f69-f784-4b7e-8bf1-8358102f63d4', 'Test Attendance 2', '2024-01-16', '2024-01-16 08:00:00'),
('test-attendance-3', 'f5453f69-f784-4b7e-8bf1-8358102f63d4', 'Test Attendance 3', '2024-01-17', '2024-01-17 08:00:00');

INSERT INTO StudentAttendance (id, student_id, attendance_id, time_type, section, status, created_at) VALUES
('test-1', 'c6c02431-4ad3-4b82-920d-6288458eda82', 'test-attendance-1', 'IN', 'CS101', 'present', '2024-01-15 08:30:00'),
('test-2', 'c6c02431-4ad3-4b82-920d-6288458eda82', 'test-attendance-2', 'IN', 'CS101', 'present', '2024-01-16 08:45:00'),
('test-3', 'c6c02431-4ad3-4b82-920d-6288458eda82', 'test-attendance-3', 'IN', 'CS101', 'present', '2024-01-17 09:00:00');
