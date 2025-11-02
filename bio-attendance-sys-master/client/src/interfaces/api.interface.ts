export interface MarkAttendanceInput {
  student_id: string;
  attendance_id: string;
  time_type: 'IN' | 'OUT';
  section: string;
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
}

export interface AttendanceReportData {
  date: string;
  grade: string;
  section: string;
  present: number;
  absent: number;
  rate: number;
}

export interface StudentAttendanceReportData {
  student_id: string;
  student_name: string;
  matric_no: string;
  grade: string;
  date: string;
  status: 'present';
  section: string;
}

export interface StudentAttendanceSummary {
  weekly: {
    present_days: number;
    total_days: number;
    absent_days: number;
  };
  monthly: {
    present_days: number;
    total_days: number;
    absent_days: number;
  };
  yearly: {
    present_days: number;
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
    status: 'present';
    time_type: 'IN' | 'OUT' | null;
    section: string;
    created_at: string;
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
      section: string;
      status: 'present' | 'late' | 'absent';
      created_at: string;
    }[];
  };
}

export interface GetReportsResult {
  data: {
    reports: AttendanceReportData[];
    summary: any;
    previousPeriodSummary: any;
    meta: {
      total_items: number;
      total_pages: number;
      page: number;
      per_page: number;
    };
  };
}

export interface GetGradesAndSectionsResult {
  data: {
    grades: string[];
    sections: string[];
  };
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
  status: 'present';
  section: string;
}

export interface MarkStudentAttendanceResult {
  marked: boolean;
}

export interface GetDashboardStatsResult {
  data: {
    totalStudents: number;
    presentToday: number;
    attendanceRate: number;
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
  fingerprint: string;
  courses: Course[];
}

export interface AddStudentInput {
  name: string;
  matric_no: string;
  grade: string;
  fingerprint: string;
  courses: string[];
  staff_id: string;
}

export interface AddCourseInput {
  course_name: string;
  course_code: string;
  staff_id: string;
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
  accessToken: string;
  refreshToken: string;
  staff: {
    id: string;
    name: string;
    email: string;
    created_at: string;
  };
}

export interface StaffSettings {
  grace_period_minutes: number;
  school_start_time: string;
  late_threshold_hours: number;
}

export interface UpdateStaffSettingsInput {
  grace_period_minutes?: number;
  school_start_time?: string;
  late_threshold_hours?: number;
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
  name?: string;
  password?: string;
  confirmPassword?: string;
}

export interface UpdateStaffProfileResult {
  staff: {
    id: string;
    name: string;
    email: string;
  };
}
