SELECT
    s.id as student_id,
    s.name as student_name,
    s.grade,
    st.id as teacher_id,
    st.name as teacher_name,
    st.role
FROM student s
JOIN staff st ON s.staff_id = st.id
WHERE s.grade = '1';