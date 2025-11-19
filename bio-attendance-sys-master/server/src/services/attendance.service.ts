import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import type { Attendance, StudentAttendance, Student } from '@prisma/client';
import type { PrismaBatchPayload } from '../interfaces/helper.interface';

export const determineAttendanceStatus = (currentTime: Date, schoolStartTime: string, gracePeriodMinutes: number, lateThresholdHours: number): 'present' | 'absent' => {
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  // Absent if no check-in recorded after 5:00 PM (17:00)
  const fivePMInMinutes = 17 * 60;
  if (currentTimeInMinutes > fivePMInMinutes) {
    return 'absent';
  }

  // For now, return present for check-ins before 5 PM
  // This can be extended with more complex logic if needed
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
    select: { student_id: true, status: true }
  });

  const existingStudentIds = new Set(existingAttendances.map(att => att.student_id));
  const presentStudentIds = new Set(existingAttendances.filter(att => att.status === 'present').map(att => att.student_id));

  // Mark absent for each session where no check-in or check-out
  for (const student of students) {
    for (const session of ['AM', 'PM'] as const) {
      const existingRecord = await prisma.studentAttendance.findFirst({
        where: {
          student_id: student.id,
          attendance_id: attendance.id,
          time_type: { in: ['IN', 'OUT'] },
          session_type: session,
          status: 'present'
        }
      });

      if (!existingRecord) {
        const section = student.courses?.[0]?.course?.course_code || '';

        await prisma.studentAttendance.create({
          data: {
            student_id: student.id,
            attendance_id: attendance.id,
            time_type: 'IN',
            session_type: session,
            section,
            status: 'absent'
          }
        });
      }
    }
  }
};

export const markAbsentForStudent = async (student_id: string, date: string): Promise<void> => {
  // Get student with courses
  const student = await prisma.student.findUnique({
    where: { id: student_id },
    include: {
      courses: {
        include: {
          course: true
        }
      }
    }
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Check if attendance record exists for this date
  let attendance = await prisma.attendance.findFirst({
    where: {
      staff_id: student.staff_id,
      date,
    },
  });

  // Create attendance record if it doesn't exist
  if (!attendance) {
    attendance = await prisma.attendance.create({
      data: {
        staff_id: student.staff_id,
        name: `Daily Attendance - ${date}`,
        date,
        created_at: new Date(),
      },
    });
  }

  // Mark absent for AM and PM sessions
  for (const session of ['AM', 'PM'] as const) {
    const existingRecord = await prisma.studentAttendance.findFirst({
      where: {
        student_id: student.id,
        attendance_id: attendance.id,
        time_type: 'IN',
        session_type: session,
        status: 'present'
      }
    });

    if (!existingRecord) {
      const section = student.courses?.[0]?.course?.course_code || '';

      await prisma.studentAttendance.create({
        data: {
          student_id: student.id,
          attendance_id: attendance.id,
          time_type: 'IN',
          session_type: session,
          section,
          status: 'absent'
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

export const determineSessionType = (currentTime: Date): 'AM' | 'PM' => {
  const currentHour = currentTime.getHours();
  return currentHour < 12 ? 'AM' : 'PM';
};

export const markStudentAttendance = (studentAttendanceInfo: { attendance_id: string; student_id: string; time_type: 'IN' | 'OUT'; section: string; status?: 'present' | 'absent'; session_type?: 'AM' | 'PM' }): Promise<StudentAttendance> => {
  return new Promise<StudentAttendance>(async (resolve, reject) => {
    try {
      const currentTime = new Date();
      const sessionType = studentAttendanceInfo.session_type || determineSessionType(currentTime);

      // Verify check-in exists before allowing check-out
      if (studentAttendanceInfo.time_type === 'OUT') {
        const attendance = await prisma.attendance.findUnique({ where: { id: studentAttendanceInfo.attendance_id } });
        if (!attendance) {
          return reject(new createError.NotFound('Attendance session not found'));
        }

        // Check if student has checked in today for this session
        const existingCheckIn = await prisma.studentAttendance.findFirst({
          where: {
            student_id: studentAttendanceInfo.student_id,
            attendance_id: studentAttendanceInfo.attendance_id,
            time_type: 'IN',
            session_type: sessionType,
          },
        });

        if (!existingCheckIn) {
          return reject(new createError.BadRequest('Student must check in before checking out for this session'));
        }

        // Check if student has already checked out today for this session
        const existingCheckOut = await prisma.studentAttendance.findFirst({
          where: {
            student_id: studentAttendanceInfo.student_id,
            attendance_id: studentAttendanceInfo.attendance_id,
            time_type: 'OUT',
            session_type: sessionType,
          },
        });

        if (existingCheckOut) {
          return reject(new createError.BadRequest('Student has already checked out for this session'));
        }

        // Create a new OUT record for check-out
        const checkOutRecord = await prisma.studentAttendance.create({
          data: {
            student_id: studentAttendanceInfo.student_id,
            attendance_id: studentAttendanceInfo.attendance_id,
            time_type: 'OUT',
            session_type: sessionType,
            section: studentAttendanceInfo.section,
            status: 'present', // Check-out maintains present status
            created_at: currentTime,
          },
        });
        return resolve(checkOutRecord);
      }

      // Check for existing present attendance in this session with time-based re-scan allowance
      // Only consider 'present' records for re-scan logic, ignore 'absent' records
      const existingAttendance = await prisma.studentAttendance.findFirst({
        where: {
          student_id: studentAttendanceInfo.student_id,
          attendance_id: studentAttendanceInfo.attendance_id,
          time_type: studentAttendanceInfo.time_type,
          session_type: sessionType,
          status: 'present',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      // Allow re-scan based on time_type
      if (existingAttendance) {
        const timeDiff = currentTime.getTime() - existingAttendance.created_at.getTime();
        const allowRescanMs = studentAttendanceInfo.time_type === 'IN' ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 minutes for IN, 1 hour for OUT

        if (timeDiff < allowRescanMs) {
          const waitTime = studentAttendanceInfo.time_type === 'IN' ? '5 minutes' : '1 hour';
          return reject(new createError.BadRequest(`Student has already been marked for this time type in this session. Please wait at least ${waitTime} before re-scanning.`));
        }
      }

      // If marking present, remove any existing absent records for this student on the same date
      if (studentAttendanceInfo.status === 'present') {
        const attendance = await prisma.attendance.findUnique({ where: { id: studentAttendanceInfo.attendance_id } });
        if (attendance) {
          await prisma.studentAttendance.deleteMany({
            where: {
              student_id: studentAttendanceInfo.student_id,
              attendance: { date: attendance.date },
              status: 'absent',
            },
          });
        }
      }

      // Create new attendance record
      const studentAttendance = await prisma.studentAttendance.create({
        data: {
          ...studentAttendanceInfo,
          session_type: sessionType,
          created_at: currentTime,
        },
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

      // If marking present, remove any existing absent records for these students on the same dates
      if (status === 'present') {
        await prisma.studentAttendance.deleteMany({
          where: {
            student_id: { in: student_ids },
            attendance: { date: { in: dates } },
            status: 'absent',
          },
        });
      }

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
