import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import { AttendanceStatus, TimeType, SessionType } from '@prisma/client';
import { SF2Data, SF2Student } from '../interfaces/sf2.interface';
import { isLateArrival } from '../helpers/general.helper';
import { isDateHoliday } from './holiday.service';

export const generateSF2Data = async (
  staff_id: string | null,
  grade: string,
  section: string,
  month: number,
  year: number,
  schoolId: string = '000000',
  schoolName: string = 'School Name',
  schoolYear: string = `${year}-${year + 1}`,
  schoolHeadName: string = 'Principal/School Head',
  region?: string,
  division?: string,
  district?: string
): Promise<SF2Data> => {
  try {
    let staffName = 'Admin';
    let lateOptions: { lateTime?: string | null; gracePeriodMinutes?: number | null; pmSettings?: { enabled: boolean; time?: string | null } } = {};

    if (staff_id) {
      const staff = await prisma.staff.findUnique({
        where: { id: staff_id },
        select: {
          name: true,
          firstName: true,
          lastName: true,
          school_start_time: true,
          grace_period_minutes: true,
          pm_late_cutoff_enabled: true,
          pm_late_cutoff_time: true
        }
      });
      if (!staff) throw createError.NotFound('Staff not found');
      staffName = staff.name || `${staff.firstName} ${staff.lastName}`;
      lateOptions = {
        lateTime: staff.school_start_time,
        gracePeriodMinutes: staff.grace_period_minutes,
        pmSettings: {
          enabled: staff.pm_late_cutoff_enabled ?? false,
          time: staff.pm_late_cutoff_time ?? null
        }
      };
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const schoolDays = getSchoolDays(startDate, endDate);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const dayTypes: Record<string, 'weekday' | 'holiday'> = {};

    // Calculate day types for all school days (only weekdays now)
    for (const day of schoolDays) {
      const dayStr = day.toISOString().split('T')[0];
      const isHolidayDay = await isDateHoliday(dayStr);

      dayTypes[dayStr] = isHolidayDay ? 'holiday' : 'weekday';
    }

    const students = await prisma.student.findMany({
      where: staff_id ? { staff_id, grade } : { grade },
      include: {
        courses: { include: { course: true } },
        attendances: {
          include: { attendance: true },
          where: {
            attendance: { date: { gte: startDateStr, lte: endDateStr }, ...(staff_id && { staff_id }) },
            section,
          },
        },
      },
    });

    const sf2Students: SF2Student[] = students
      .filter(s =>
        s.courses.some(c => c.course.course_code === section)
      )
      .map(student => {
        const dailyAttendance: Record<string, { am: string; pm: string }> = {};
        let totalAbsentPoints = 0; // Changed from absentCount to track points
        let tardyCount = 0;
        let lateCount = 0; // Track late arrivals

        schoolDays.forEach(day => {
          const dayStr = day.toISOString().split('T')[0];
          const isHolidayDay = dayTypes[dayStr] === 'holiday';

          const amRecords = student.attendances.filter(
            a => a.attendance.date === dayStr && a.session_type === 'AM'
          );
          const pmRecords = student.attendances.filter(
            a => a.attendance.date === dayStr && a.session_type === 'PM'
          );

          // For SF2: 'x' = absent, '' = present, 'H' = holiday
          // Since schoolDays only includes weekdays, no need to check for weekends
          const amStatus = isHolidayDay ? 'H' : (amRecords.length === 0 ? 'x' : amRecords.some(r => r.status === AttendanceStatus.present) ? '' : 'x');

          const pmStatus = isHolidayDay ? 'H' : (pmRecords.length === 0 ? 'x' : pmRecords.some(r => r.status === AttendanceStatus.present) ? '' : 'x');

          dailyAttendance[dayStr] = { am: amStatus, pm: pmStatus };

          // Calculate absence points: 0.5 per missing session
          if (amStatus === 'x') totalAbsentPoints += 0.5;
          if (pmStatus === 'x') totalAbsentPoints += 0.5;

          // Count late arrivals
          amRecords.forEach(record => {
            if (record.status === AttendanceStatus.present && record.time_type === 'IN' &&
                isLateArrival(record.created_at, record.session_type as SessionType, record.time_type as TimeType, lateOptions)) {
              lateCount++;
            }
          });
          pmRecords.forEach(record => {
            if (record.status === AttendanceStatus.present && record.time_type === 'IN' &&
                isLateArrival(record.created_at, record.session_type as SessionType, record.time_type as TimeType, lateOptions)) {
              lateCount++;
            }
          });
        });

        return {
          id: student.id,
          name: student.name,
          matric_no: student.matric_no,
          dailyAttendance,
          absentCount: Math.round(totalAbsentPoints * 10) / 10, // Round to 1 decimal
          tardyCount,
          lateCount, // Add late count
          remarks: '',
        };
      });

    // Calculate total attendance points earned vs possible
    const totalAttendancePoints = sf2Students.reduce((sum, s) => {
      const studentPoints = Object.values(s.dailyAttendance).reduce((daySum, day) => {
        // Each day: 1 point if both AM and PM present, 0.5 if one session present, 0 if both absent
        const amPresent = day.am === '' || day.am === '▤';
        const pmPresent = day.pm === '' || day.pm === '▤';
        if (amPresent && pmPresent) return daySum + 1; // Both sessions present = 1 point
        if (amPresent || pmPresent) return daySum + 0.5; // One session present = 0.5 points
        return daySum; // Both absent = 0 points
      }, 0);
      return sum + studentPoints;
    }, 0);

    const totalPossiblePoints = sf2Students.length * schoolDays.length; // Each school day = 1 point
    const averageDailyAttendance = totalPossiblePoints > 0
      ? (totalAttendancePoints / totalPossiblePoints) * 100
      : 0;

    const percentageAttendance = averageDailyAttendance;

    const consecutive5DaysAbsent = sf2Students.filter(s => {
      const dailyValues = schoolDays.map(
        day => s.dailyAttendance[day.toISOString().split('T')[0]]
      );
      let consecutiveCount = 0;
      for (const val of dailyValues) {
        // Count as absent if missing either AM or PM session
        const hasAbsence = val.am === 'x' || val.pm === 'x';
        if (hasAbsence) {
          consecutiveCount++;
          if (consecutiveCount >= 5) return true;
        } else {
          consecutiveCount = 0;
        }
      }
      return false;
    }).length;

    return {
      region,
      division,
      district,
      schoolId,
      schoolName,
      schoolYear,
      month: getMonthName(month),
      grade,
      section,
      students: sf2Students,
      enrollmentFirstFriday: sf2Students.length,
      lateEnrollmentCount: 0,
      registeredLearners: sf2Students.length,
      percentageEnrollment: 100,
      averageDailyAttendance: Math.round(averageDailyAttendance * 100) / 100,
      percentageAttendance: Math.round(percentageAttendance * 100) / 100,
      consecutiveAbsent5Days: consecutive5DaysAbsent,
      dropoutMale: 0,
      dropoutFemale: 0,
      transferOutMale: 0,
      transferOutFemale: 0,
      transferInMale: 0,
      transferInFemale: 0,
      schoolDays: schoolDays.map(d => d.toISOString().split('T')[0]),
      dayTypes,
      staffName,
      schoolHeadName,
    };
  } catch (err) {
    throw err;
  }
};

function getSchoolDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Only include weekdays (Monday = 1, Tuesday = 2, ..., Friday = 5)
    // Exclude weekends (Sunday = 0, Saturday = 6)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return months[month - 1] || 'Unknown';
}


function isLate(timestamp: Date, lateThresholdHours: number = 1): boolean {
  const hour = timestamp.getHours();
  const schoolStartHour = 8;
  return hour > schoolStartHour + lateThresholdHours;
}
