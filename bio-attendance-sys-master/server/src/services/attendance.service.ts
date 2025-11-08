import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import type { Attendance, StudentAttendance, Student } from '@prisma/client';
import type { PrismaBatchPayload } from '../interfaces/helper.interface';

export const determineAttendanceStatus = (currentTime: Date, schoolStartTime: string, gracePeriodMinutes: number, lateThresholdHours: number): 'present' => {
  // Always return 'present' as per simplified attendance system
  return 'present';
};





export const markAbsentForUnmarkedDays = async (staff_id: string, date: string): Promise<void> => {
  // Get all students for this staff
  const students = await prisma.student.findMany({
    where: { staff_id },
    include: {
      courses: {
        include: {
          course: true
        }
      }
    }
  });

  // Check if attendance record exists for this date
  let attendance = await prisma.attendance.findFirst({
    where: {
      staff_id,
      date,
    },
  });

  // Create attendance record if it doesn't exist
  if (!attendance) {
    attendance = await prisma.attendance.create({
      data: {
        staff_id,
        name: `Daily Attendance - ${date}`,
        date,
        created_at: new Date(),
      },
    });
  }

  // Get all student attendances for this attendance (whole day)
  const existingAttendances = await prisma.studentAttendance.findMany({
    where: { attendance_id: attendance.id },
    select: { student_id: true }
  });

  const existingStudentIds = new Set(existingAttendances.map(att => att.student_id));

  // Mark absent for students who haven't scanned at all for the day
  for (const student of students) {
    if (!existingStudentIds.has(student.id)) {
      // Get the first course section for the student
      const section = student.courses?.[0]?.course?.course_code || '';

      await prisma.studentAttendance.create({
        data: {
          student_id: student.id,
          attendance_id: attendance.id,
          time_type: null,
          section,
          status: 'absent',
          created_at: new Date(date.split('T')[0] + 'T00:00:00') // Set to start of day for absent
        }
      });
    }
  }
};

export const fetchOneAttendance = (attendanceId: string): Promise<Attendance> => {
  return new Promise<Attendance>(async (resolve, reject) => {
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

export const saveAttendanceToDb = (attendance: Omit<Attendance, 'id'>): Promise<Attendance> => {
  return new Promise<Attendance>(async (resolve, reject) => {
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

export const markStudentAttendance = (studentAttendanceInfo: { attendance_id: string; student_id: string; time_type: 'IN' | 'OUT'; section: string; status?: 'present' | 'absent' }): Promise<StudentAttendance> => {
  return new Promise<StudentAttendance>(async (resolve, reject) => {
    try {
      const studentAttendance = await prisma.studentAttendance.create({
        data: studentAttendanceInfo,
      });
      resolve(studentAttendance);
    } catch (err) {
      reject(err);
    }
  });
};

export const manualMarkStudentAttendance = (manualMarkInfo: { student_ids: string[]; attendance_id: string; status: 'present' | 'absent'; dates: string[]; section?: string }): Promise<StudentAttendance[]> => {
  return new Promise<StudentAttendance[]>(async (resolve, reject) => {
    try {
      const { student_ids, attendance_id, status, dates, section } = manualMarkInfo;

      // Get existing attendance records to avoid duplicates
      const existingRecords = await prisma.studentAttendance.findMany({
        where: {
          attendance_id,
          student_id: { in: student_ids },
          created_at: {
            gte: new Date(dates[0]),
            lte: new Date(dates[dates.length - 1] + 'T23:59:59'),
          },
        },
      });

      const existingStudentDatePairs = new Set(
        existingRecords.map(record => `${record.student_id}-${record.created_at.toISOString().split('T')[0]}`)
      );

      // Create attendance records for each student and date combination
      const attendanceRecords: StudentAttendance[] = [];

      for (const student_id of student_ids) {
        for (const date of dates) {
          const dateKey = `${student_id}-${date}`;

          // Skip if already marked for this date
          if (existingStudentDatePairs.has(dateKey)) {
            continue;
          }

          const record = await prisma.studentAttendance.create({
            data: {
              student_id,
              attendance_id,
              time_type: 'IN', // Default to IN for manual marking
              section: section || '',
              status,
              created_at: new Date(`${date}T12:00:00`), // Set to noon for manual entries
            },
          });
          attendanceRecords.push(record);
        }
      }

      resolve(attendanceRecords);
    } catch (err) {
      reject(err);
    }
  });
};

export const removeAllStudentAttendance = (attendance_id: string): Promise<PrismaBatchPayload> => {
  return new Promise<PrismaBatchPayload>(async (resolve, reject) => {
    try {
      const studentAttendance = await prisma.studentAttendance.deleteMany({
        where: {
          attendance_id,
        },
      });
      resolve(studentAttendance);
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

      // If time_type is provided, include it in the check
      if (studentAttendanceInfo.time_type) {
        whereClause.time_type = studentAttendanceInfo.time_type;
      }



      const studentAttendance = await prisma.studentAttendance.findFirst({
        where: whereClause,
      });
      if (studentAttendance) resolve(true);
      resolve(false);
    } catch (err) {
      reject(err);
    }
  });
};

export const fetchAttendanceStudents = (
  attendance_id: string,
): Promise<
  (StudentAttendance & {
    student: Student;
  })[]
> => {
  return new Promise<
    (StudentAttendance & {
      student: Student;
    })[]
  >(async (resolve, reject) => {
    try {
      const attendanceCourses = await prisma.studentAttendance.findMany({
        where: {
          attendance_id,
        },
        include: {
          student: true,
        },
      });
      resolve(attendanceCourses);
    } catch (err) {
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
      if (res) resolve(true);
      reject(new createError.NotFound('Attendance not found'));
    } catch (err) {
      reject(err);
    }
  });
};

export const updateAttendanceInDb = (id: string, newUpdate: Partial<Attendance>): Promise<Attendance> => {
  return new Promise<Attendance>(async (resolve, reject) => {
    try {
      const attendance = await prisma.attendance.update({
        where: {
          id,
        },
        data: newUpdate,
      });
      resolve(attendance);
    } catch (err) {
      reject(err);
    }
  });
};
