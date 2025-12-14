import { prisma } from '../db/prisma-client';
import createError from 'http-errors';

export const markAbsentForUnmarkedDays = async (staff_id: string, date: string): Promise<void> => {
  // Get all students for this staff
  const students = await prisma.student.findMany({
    where: { staff_id },
    select: { id: true, name: true }
  });

  if (students.length === 0) return;

  // Check if attendance record exists for this date
  let attendance = await prisma.attendance.findFirst({
    where: {
      staff_id,
      date
    }
  });

  // Create attendance record if it doesn't exist
  if (!attendance) {
    attendance = await prisma.attendance.create({
      data: {
        staff_id,
        name: `Auto Absent Marking - ${date}`,
        date,
        created_at: new Date()
      }
    });
  }

  // Get all student attendances for this attendance (whole day)
  const existingAttendances = await prisma.studentAttendance.findMany({
    where: { attendance_id: attendance.id },
    select: { student_id: true, status: true }
  });

  const existingStudentIds = new Set(existingAttendances.map((a: any) => a.student_id));

  // Mark absent for students who haven't been marked yet
  const absentRecords = students
    .filter((student: any) => !existingStudentIds.has(student.id))
    .map((student: any) => ({
      student_id: student.id,
      attendance_id: attendance!.id, // ✅ Fixed: Added ! to assert non-null
      status: 'absent' as const, // ✅ Fixed: Added 'as const'
      time_type: 'IN' as const, // ✅ Fixed: Added 'as const' for proper typing
      section: 'AUTO',
      created_at: new Date()
    }));

  if (absentRecords.length > 0) {
    await prisma.studentAttendance.createMany({
      data: absentRecords
    });
  }
};

export const markDailyAbsentsForAllStaff = async (): Promise<void> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Get all staff members
  const staffMembers = await prisma.staff.findMany({
    select: { id: true }
  });

  // Mark absents for each staff member
  for (const staff of staffMembers) {
    try {
      await markAbsentForUnmarkedDays(staff.id, today);
    } catch (error) {
      console.error(`Error marking absents for staff ${staff.id}:`, error);
    }
  }
};

// Other functions from the search results...

export const fetchOneAttendance = (attendanceId: string): Promise<any> => {
  return new Promise<any>(async (resolve, reject) => {
    try {
      const attendance = await prisma.attendance.findUnique({
        where: {
          id: attendanceId,
        },
      });
      if (!attendance) throw new createError.NotFound('Attendance not found');
      resolve(attendance);
    } catch (err) {
      reject(err);
    }
  });
};

export const saveAttendanceToDb = (attendance: any): Promise<any> => {
  return new Promise<any>(async (resolve, reject) => {
    try {
      const savedAttendance = await prisma.attendance.create({
        data: attendance,
      });
      resolve(savedAttendance);
    } catch (err) {
      reject(err);
    }
  });
};

export const markStudentAttendance = (studentAttendanceInfo: { attendance_id: string; student_id: string; time_type: 'IN' | 'OUT'; section: string; status?: 'present' | 'absent'; session_type?: 'AM' | 'PM' }): Promise<any> => {
  return new Promise<any>(async (resolve, reject) => {
    const { attendance_id, student_id, time_type, section, status, session_type } = studentAttendanceInfo;

    try {
      const attendance = await prisma.attendance.findUnique({ where: { id: attendance_id } });
      if (!attendance) {
        return reject(new createError.NotFound('Attendance session not found'));
      }

      // Check for existing present attendance in this session within the last 15 minutes
      // Only consider 'present' records for re-scan logic, ignore 'absent' records
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      const existingPresentRecord = await prisma.studentAttendance.findFirst({
        where: {
          student_id,
          attendance_id,
          time_type,
          status: 'present',
          created_at: {
            gte: fifteenMinutesAgo
          }
        },
        orderBy: { created_at: 'desc' }
      });

      if (existingPresentRecord) {
        return reject(new createError.Conflict('Student has already checked in within the last 15 minutes. Please wait before checking in again.'));
      }

      if (status === 'present') {
        const attendance = await prisma.attendance.findUnique({ where: { id: attendance_id } });
        if (attendance) {
          await prisma.studentAttendance.deleteMany({
            where: {
              student_id,
              attendance: { date: attendance.date },
              status: 'absent',
            }
          });
        }
      }

      // Create new attendance record
      const studentAttendance = await prisma.studentAttendance.create({
        data: {
          student_id,
          attendance_id,
          time_type: time_type,
          status: status,
          section,
          session_type: session_type as any,
        },
      });

      resolve(studentAttendance);
    } catch (err) {
      reject(err);
    }
  });
};

export const manualMarkStudentAttendance = (manualMarkInfo: { student_ids: string[]; attendance_id: string; status: 'present' | 'absent'; dates: string[]; section?: string }): Promise<any[]> => {
  return new Promise<any[]>(async (resolve, reject) => {
    try {
      const { student_ids, attendance_id, status, dates, section } = manualMarkInfo;

      // Get existing attendance records to avoid duplicates
      const existingRecords = await prisma.studentAttendance.findMany({
        where: {
          attendance_id,
          student_id: { in: student_ids },
        },
        select: { student_id: true, attendance: { select: { date: true } } }
      });

      const existingMap = new Map<string, Set<string>>();
      existingRecords.forEach((record: any) => {
        const key = record.student_id;
        if (!existingMap.has(key)) existingMap.set(key, new Set());
        existingMap.get(key)!.add(record.attendance.date);
      });

      // Create attendance records for each student and date combination
      const attendanceRecords: any[] = [];

      for (const student_id of student_ids) {
        for (const date of dates) {
          if (!existingMap.get(student_id)?.has(date)) {
            const record = await prisma.studentAttendance.create({
              data: {
                student_id,
                attendance_id,
                time_type: 'IN', // Default to IN for manual marking
                status: status,
                section: section || 'MANUAL',
              },
            });
            attendanceRecords.push(record);
          }
        }
      }

      resolve(attendanceRecords);
    } catch (err) {
      reject(err);
    }
  });
};

export const removeAllStudentAttendance = (attendance_id: string): Promise<any> => {
  return new Promise<any>(async (resolve, reject) => {
    try {
      const result = await prisma.studentAttendance.deleteMany({
        where: {
          attendance_id,
        },
      });
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
};

export const checkIfStudentIsMarked = (studentAttendanceInfo: { attendance_id: string; student_id: string; time_type?: 'IN' | 'OUT' }): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      const whereClause: any = {
        attendance_id: studentAttendanceInfo.attendance_id,
        student_id: studentAttendanceInfo.student_id,
      };
      if (studentAttendanceInfo.time_type) {
        whereClause.time_type = studentAttendanceInfo.time_type;
      }
      const attendance = await prisma.studentAttendance.findFirst({
        where: whereClause,
      });
      resolve(!!attendance);
    } catch (err) {
      reject(err);
    }
  });
};

export const checkIfStudentIsPresent = (attendance_id: string, student_id: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      // Check if student has any present record for this attendance session
      const presentRecord = await prisma.studentAttendance.findFirst({
        where: {
          attendance_id,
          student_id,
          status: 'present',
        },
      });
      resolve(!!presentRecord);
    } catch (err) {
      reject(err);
    }
  });
};

// ============================================================================
// FIXED: fetchAttendanceStudents - Now properly filters for kiosk display
// ============================================================================
export const fetchAttendanceStudents = (
  attendance_id: string,
): Promise<any[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`🔍 Fetching attendance for attendance_id: ${attendance_id}`);
      
      // FIXED: Only fetch records with time_type 'IN' or 'OUT' (actual check-ins/outs)
      // FIXED: Only fetch 'present' status records (exclude 'absent' students)
      const attendanceCourses = await prisma.studentAttendance.findMany({
        where: {
          attendance_id,
          time_type: {
            in: ['IN', 'OUT'], // ✅ CRITICAL: Only actual check-in/out records
          },
          status: 'present', // ✅ CRITICAL: Only present students (not absent)
        },
        include: {
          student: {
            select: { id: true, name: true, matric_no: true, grade: true },
          },
        },
        orderBy: { created_at: 'desc' },
      });
      
      console.log(`✅ fetchAttendanceStudents: Found ${attendanceCourses.length} records with time_type IN/OUT and status=present`);
      console.log(`📊 Sample record:`, attendanceCourses[0]);
      
      resolve(attendanceCourses);
    } catch (err) {
      console.error('❌ Error in fetchAttendanceStudents:', err);
      reject(err);
    }
  });
};

export const removeAttendanceFromDb = (attendanceId: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      const res = await prisma.attendance.delete({
        where: {
          id: attendanceId,
        },
      });
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateAttendanceInDb = (id: string, updateData: any): Promise<any> => {
  return new Promise<any>(async (resolve, reject) => {
    try {
      const attendance = await prisma.attendance.update({
        where: {
          id,
        },
        data: updateData,
      });
      resolve(attendance);
    } catch (err) {
      reject(err);
    }
  });
};

// ============================================================================
// Missing function: markAbsentForStudent
// ============================================================================
export const markAbsentForStudent = async (
  student_id: string,
  date: string,
  staff_id: string,  // Added staff_id parameter
  section?: string
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    try {
      // First, find or create the attendance record for this date and staff
      let attendance = await prisma.attendance.findFirst({
        where: {
          date: date,
          staff_id: staff_id
        }
      });

      // If attendance doesn't exist, create it
      if (!attendance) {
        attendance = await prisma.attendance.create({
          data: {
            staff_id: staff_id,
            name: `Auto Absent Marking - ${date}`,
            date: date,
            created_at: new Date(),
          }
        });
      }

      const studentAttendance = await prisma.studentAttendance.create({
        data: {
          student_id,
          attendance_id: attendance.id,
          time_type: 'IN' as const,
          status: 'absent' as const,
          section: section || 'N/A',
          session_type: 'AM' as const,
        },
      });
      resolve(studentAttendance);
    } catch (err) {
      reject(err);
    }
  });
};