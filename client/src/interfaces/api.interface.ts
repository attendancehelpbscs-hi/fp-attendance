export interface PaginationMeta {
  total_items: number;
  total_pages: number;
  page: number;
  per_page: number;
}

export interface ApiResponse<T = any> {
  data: T;
  meta?: PaginationMeta;
}

export interface MarkAttendanceInput {
  student_id: string;
  attendance_id: string;
  time_type: 'IN' | 'OUT';
  section: string;
  status?: 'present' | 'absent';
  session_type?: 'AM' | 'PM';
}

export interface ManualMarkAttendanceInput {
  student_ids: string[];
  attendance_id: string;
  dates: string[];
  section?: string;
}

export interface Attendance {
  id: string;
  name: string;
  date: string;
  staff_id: string;
  created_at: string;
}

export interface StudentFingerprint {
  id: string;
  name: string;
  matric_no: string;
  grade: string;
  fingerprint: string;
  courses: Course[];
}

export interface Course {
  id: string;
  course_name: string;
  course_code: string;
  grade: string;
  staff_id: string;
  matric_no?: string;
  created_at: string;
}

export interface AttendanceReportData {
  date: string;
  grade: string;
  section: string;
  session_type?: 'AM' | 'PM';
  present: number;
  absent: number;
  late: number;
  rate: number;
}

export interface StudentAttendanceReportData {
  student_id: string;
  student_name: string;
  matric_no: string;
  grade: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'departure';
  section: string;
  session_type?: 'AM' | 'PM';
  isLate?: boolean;
}

export interface StudentAttendanceSummary {
  weekly: {
    present_days: number;
    late_days: number;
    total_days: number;
    absent_days: number;
  };
  monthly: {
    present_days: number;
    late_days: number;
    total_days: number;
    absent_days: number;
  };
  yearly: {
    present_days: number;
    late_days: number;
    total_days: number;
    absent_days: number;
  };
}

export interface StudentDetailedReport {
  student: {
    id: string;
    name: string;
    matric_no: string;
    grade: string;
  };
  summaries: StudentAttendanceSummary;
  attendanceRecords: {
    date: string;
    status: 'present' | 'absent' | 'late' | 'departure';
    time_type: 'IN' | 'OUT' | null;
    session_type: 'AM' | 'PM' | null;
    section: string;
    created_at: string | null;
    checkin_time?: string | null;
    checkout_time?: string | null;
    isLate?: boolean;
  }[];
}

// Additional interfaces for API responses
export interface AddAttendanceInput {
  name: string;
  date: string;
  staff_id: string;
}

export interface AddAttendanceResult {
  attendance: Attendance;
}

export interface BaseError {
  message: string;
  errorType?: string;
  response?: {
    data?: {
      message?: string;
    };
  };
}

export interface GetAttendancesResult {
  data: {
    attendances: Attendance[];
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface UpdateAttendanceInput {
  id: string;
  name?: string;
  date?: string;
}

export interface UpdateAttendanceResult {
  attendance: Attendance;
}

export interface MarkAttendanceResult {
  marked: boolean;
}

export interface GetAttendanceListResult {
  data: {
    attendanceList: {
      id: string;
      student: {
        id: string;
        name: string;
        matric_no: string;
        grade: string;
      };
      time_type: 'IN' | 'OUT';
      session_type: 'AM' | 'PM';
      section: string;
      status: 'present' | 'absent';
      created_at: string;
      isLate?: boolean;
    }[];
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface GetReportsResult {
  data: {
    reports: AttendanceReportData[];
    summary: {
      totalStudents: number;
      averageRate: number;
      lowAttendanceCount: number;
      perfectAttendanceCount: number;
      lateCount: number;
    };
    previousPeriodSummary: {
      totalStudents: number;
      averageRate: number;
      lowAttendanceCount: number;
      perfectAttendanceCount: number;
      lateCount: number;
    };
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface SF2DailyAttendanceEntry {
  am: string;
  pm: string;
}

export interface SF2StudentRecord {
  id: string;
  name: string;
  matric_no: string;
  dailyAttendance: Record<string, SF2DailyAttendanceEntry>;
  absentCount: number;
  tardyCount: number;
  lateCount: number;
  remarks: string;
}

export interface SF2ReportData {
  region?: string;
  division?: string;
  district?: string;
  schoolId: string;
  schoolName: string;
  schoolYear: string;
  month: string;
  grade: string;
  section: string;
  students: SF2StudentRecord[];
  enrollmentFirstFriday: number;
  lateEnrollmentCount: number;
  registeredLearners: number;
  percentageEnrollment: number;
  averageDailyAttendance: number;
  percentageAttendance: number;
  consecutiveAbsent5Days: number;
  dropoutMale: number;
  dropoutFemale: number;
  transferOutMale: number;
  transferOutFemale: number;
  transferInMale: number;
  transferInFemale: number;
  schoolDays: string[];
  dayTypes: Record<string, 'weekday' | 'weekend' | 'holiday'>;
  staffName: string;
  schoolHeadName: string;
}

export interface GetSF2ReportResult {
  data: SF2ReportData;
}

export interface GetGradesAndSectionsResult {
  data: Array<{
    grade: string;
    sections: string[];
  }>;
}

export interface GetStudentReportsResult {
  data: {
    reports: StudentAttendanceReportData[];
    summary: any;
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface MarkStudentAttendanceInput {
  student_id: string;
  date: string;
  status: 'present' | 'absent';
  section: string;
}

export interface MarkStudentAttendanceResult {
  marked: boolean;
}

export interface GetDashboardStatsResult {
  data: {
    totalStudents: number;
    presentToday: number;
    absentToday: number;
    attendanceRate: number;
    gradeStats: {
      grade: string;
      data: {
        date: string;
        totalStudents: number;
        presentStudents: number;
        absentStudents: number;
        attendanceRate: number;
      }[];
    }[];
  };
}

export interface GetCheckInTimeAnalysisResult {
  data: {
    data: {
      timeRange: string;
      count: number;
    }[];
  };
}

export interface DeleteAttendanceResult {
  deleted: boolean;
}

export interface Student {
  id: string;
  name: string;
  matric_no: string;
  grade: string;
  section: string;
  fingerprint?: string;
  courses: Course[];
}

export interface AddStudentInput {
  name: string;
  matric_no: string;
  grade: string;
  fingerprint?: string;
  courses: string[];
  staff_id: string;
}

export interface AddStudentResult {
  student: Student;
}

export interface ImportStudentsResult {
  imported: number;
  errors: number;
  errorDetails: {
    row: number;
    data: Record<string, any>;
    error: string;
  }[];
}

export interface GetStudentsResult {
  data: {
    students: Student[];
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface UpdateStudentInput {
  id: string;
  name?: string;
  matric_no?: string;
  grade?: string;
  fingerprint?: string;
  courses?: string[];
  url: string;
}

export interface UpdateStudentResult {
  data: {
    student: Student;
  };
}

export interface GetStudentsFingerprintsResult {
  data: {
    students: StudentFingerprint[];
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface DeleteStudentResult {
  deleted: boolean;
}

export interface AddCourseInput {
  course_name: string;
  course_code: string;
  grade: string;
  staff_id: string;
  matric_no?: string;
}

export interface AddCourseResult {
  course: Course;
}

export interface GetCoursesResult {
  data: {
    courses: Course[];
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface UpdateCourseInput {
  id: string;
  course_name?: string;
  course_code?: string;
  grade?: string;
  matric_no?: string;
  url: string;
}

export interface UpdateCourseResult {
  course: Course;
}

export interface DeleteCourseResult {
  deleted: boolean;
}

// Staff-related interfaces
export interface RegisterStaffInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterStaffResult {
  accessToken: string;
  refreshToken: string;
  staff: {
    id: string;
    name: string;
    email: string;
    created_at: string;
  };
}

export interface LoginStaffInput {
  email: string;
  password: string;
}

export interface LoginStaffResult {
  data: {
    accessToken: string;
    refreshToken: string;
    staff: {
      id: string;
      firstName: string;
      lastName: string;
      name: string;
      email: string;
      created_at: string;
      profilePicture?: string;
      role: string; // New field for role information
    };
  };
}

export interface StaffSettings {
  grace_period_minutes: number;
  school_start_time: string;
  late_threshold_hours: number;
  pm_late_cutoff_enabled: boolean;
  pm_late_cutoff_time: string | null;
}

export interface UpdateStaffSettingsInput {
  grace_period_minutes?: number;
  school_start_time?: string;
  late_threshold_hours?: number;
  pm_late_cutoff_enabled?: boolean;
  pm_late_cutoff_time?: string | null;
}

export interface UpdateStaffSettingsResult {
  settings: StaffSettings;
}

export interface GetStaffSettingsResult {
  settings: StaffSettings;
}

export interface BackupDataResult {
  message: string;
}

export interface ClearAuditLogsResult {
  message: string;
}

export interface UpdateStaffProfileInput {
  firstName?: string;
  lastName?: string;
  name?: string; // Keep for backward compatibility
  password?: string;
  confirmPassword?: string;
  profilePicture?: string;
}

export interface UpdateStaffProfileResult {
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    name: string; // Keep for backward compatibility
    email: string;
    created_at: string;
    profilePicture?: string;
    role: string; // New field for role information
  };
}

// Teacher management interfaces
export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  profilePicture?: string;
  section?: string;
  grade?: string;
  matric_no?: string;
}

export interface AddTeacherInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  section?: string;
  grade?: string;
  matric_no?: string;
}

export interface AddTeacherResult {
  teacher: Teacher;
}

export interface GetTeachersResult {
  data: {
    teachers: Teacher[];
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface UpdateTeacherInput {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  password?: string;
  section?: string;
  grade?: string;
  matric_no?: string;
}

export interface UpdateTeacherResult {
  teacher: Teacher;
}

export interface DeleteTeacherResult {
  deleted: boolean;
}

export interface ImportTeachersInput {
  csvFile: File;
}

export interface ImportTeachersResult {
  message: string;
  imported: number;
  errors: string[];
}

// Holiday management interfaces
export interface Holiday {
  id: string;
  date: string;
  name: string;
  type: string;
  created_at: string;
}

export interface AddHolidayInput {
  date: string;
  name: string;
  type?: string;
}

export interface UpdateHolidayInput {
  date?: string;
  name?: string;
  type?: string;
}

export interface GetHolidaysResult {
  data: {
    holidays: Holiday[];
  };
}

export interface AddHolidayResult {
  data: {
    holiday: Holiday;
  };
}

export interface UpdateHolidayResult {
  data: {
    holiday: Holiday;
  };
}

export interface DeleteHolidayResult {
  data: {
    deleted: boolean;
  };
}
