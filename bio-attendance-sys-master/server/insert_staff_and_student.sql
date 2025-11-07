INSERT INTO Staff (id, name, email, password, grace_period_minutes, school_start_time, late_threshold_hours, created_at) VALUES
('f5453f69-f784-4b7e-8bf1-8358102f63d4', 'Test Staff', 'staff@test.com', '$2b$10$examplehashedpassword', 15, '08:00', 1, NOW());

INSERT INTO Student (id, staff_id, name, matric_no, grade, fingerprint, created_at) VALUES
('c6c02431-4ad3-4b82-920d-6288458eda82', 'f5453f69-f784-4b7e-8bf1-8358102f63d4', 'Test Student', '88888', 'Grade 1', 'test_fingerprint_data', NOW());
