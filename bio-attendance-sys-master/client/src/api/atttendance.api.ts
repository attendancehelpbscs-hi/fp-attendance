/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import type { UseQueryOptions } from '@tanstack/react-query';
import type {
  AddAttendanceInput,
  AddAttendanceResult,
  BaseError,
  GetAttendancesResult,
  UpdateAttendanceInput,
  UpdateAttendanceResult,
  MarkAttendanceInput,
  MarkAttendanceResult,
  GetAttendanceListResult,
  GetReportsResult,
  GetGradesAndSectionsResult,
  GetStudentReportsResult,
  MarkStudentAttendanceInput,
  MarkStudentAttendanceResult,
  GetDashboardStatsResult,
  GetCheckInTimeAnalysisResult,
  ManualMarkAttendanceInput,
  GetSF2ReportResult,
} from '../interfaces/api.interface';
import { useBaseMutation, useBaseQuery } from '../helpers/store.helper';
import { DeleteAttendanceResult } from '../interfaces/api.interface';

export const useAddAttendance = useBaseMutation<AddAttendanceResult, BaseError, AddAttendanceInput>('/api/attendance', 'post');
export const useGetAttendances = (staffId: string, page = 1, per_page = 10, options: Omit<UseQueryOptions<GetAttendancesResult, BaseError>, 'queryFn'> = {}) =>
  useBaseQuery<GetAttendancesResult, BaseError>(`/api/attendances/staff/${staffId}?page=${page}&per_page=${per_page}`, options);
/* upon calling `mutate`, you can pass extra string data that will be attached to the url */
export const useDeleteAttendance = useBaseMutation<DeleteAttendanceResult, BaseError, { url: string }>(
  `/api/attendance`,
  'delete',
);
export const useUpdateAttendance = useBaseMutation<UpdateAttendanceResult, BaseError, UpdateAttendanceInput>(
  `/api/attendance`,
  'put',
);
export const useMarkAttendance = useBaseMutation<MarkAttendanceResult, BaseError, MarkAttendanceInput>(
  '/api/attendance/student',
  'post',
);
export const useManualMarkAttendance = useBaseMutation<{ marked: number; skipped: number }, BaseError, ManualMarkAttendanceInput>(
  '/api/attendance/manual',
  'post',
);
export const useGetAttendanceList = (attendance_id: string, page = 1, per_page = 10, options: Omit<UseQueryOptions<GetAttendanceListResult, BaseError>, 'queryFn'> = {}) =>
  useBaseQuery<GetAttendanceListResult, BaseError>(`/api/attendance/${attendance_id}/students?page=${page}&per_page=${per_page}`, options);

export const useGetReports = (staffId: string, options: { grade?: string; section?: string; dateRange?: string; startDate?: string; endDate?: string; page?: number; per_page?: number; session?: string } = {}) => {
  const queryParams = new URLSearchParams();
  if (options.grade) queryParams.append('grade', options.grade);
  if (options.section) queryParams.append('section', options.section);
  if (options.dateRange) queryParams.append('dateRange', options.dateRange);
  if (options.startDate) queryParams.append('startDate', options.startDate);
  if (options.endDate) queryParams.append('endDate', options.endDate);
  if (options.page) queryParams.append('page', options.page.toString());
  if (options.per_page) queryParams.append('per_page', options.per_page.toString());
  if (options.session) queryParams.append('session', options.session);

  return useBaseQuery<GetReportsResult, BaseError>(`/api/reports/${staffId}?${queryParams.toString()}`);
};

export const useGetSF2Report = (
  staffId: string,
  params: { grade?: string; section?: string; month?: number; year?: number; schoolId?: string; schoolName?: string; schoolYear?: string; schoolHeadName?: string; region?: string; division?: string; district?: string } = {},
  options: Omit<UseQueryOptions<GetSF2ReportResult, BaseError>, 'queryFn'> = {}
) => {
  const queryParams = new URLSearchParams();
  if (params.grade) queryParams.append('grade', params.grade);
  if (params.section) queryParams.append('section', params.section);
  if (params.month) queryParams.append('month', params.month.toString());
  if (params.year) queryParams.append('year', params.year.toString());
  if (params.schoolId) queryParams.append('schoolId', params.schoolId);
  if (params.schoolName) queryParams.append('schoolName', params.schoolName);
  if (params.schoolYear) queryParams.append('schoolYear', params.schoolYear);
  if (params.schoolHeadName) queryParams.append('schoolHeadName', params.schoolHeadName);
  if (params.region) queryParams.append('region', params.region);
  if (params.division) queryParams.append('division', params.division);
  if (params.district) queryParams.append('district', params.district);

  return useBaseQuery<GetSF2ReportResult, BaseError>(`/api/reports/${staffId}/sf2?${queryParams.toString()}`, options);
};

export const useGetGradesAndSections = (staffId: string, options: Omit<UseQueryOptions<GetGradesAndSectionsResult, BaseError>, 'queryFn'> = {}) =>
  useBaseQuery<GetGradesAndSectionsResult, BaseError>(`/api/reports/${staffId}/filters`, options);

export const useGetStudentReports = (staffId: string, options: { studentId?: string; grade?: string; section?: string; startDate?: string; endDate?: string; dateRange?: string; page?: number; per_page?: number; session?: string } & Omit<UseQueryOptions<GetStudentReportsResult, BaseError>, 'queryFn'> = {}) => {
  const queryParams = new URLSearchParams();
  if (options.studentId) queryParams.append('student_id', options.studentId);
  if (options.grade) queryParams.append('grade', options.grade);
  if (options.section) queryParams.append('section', options.section);
  if (options.startDate) queryParams.append('startDate', options.startDate);
  if (options.endDate) queryParams.append('endDate', options.endDate);
  if (options.dateRange) queryParams.append('dateRange', options.dateRange);
  if (options.page) queryParams.append('page', options.page.toString());
  if (options.per_page) queryParams.append('per_page', options.per_page.toString());
  if (options.session) queryParams.append('session', options.session);

  return useBaseQuery<GetStudentReportsResult, BaseError>(`/api/reports/${staffId}/students?${queryParams.toString()}`, options);
};

export const useGetSectionsForGrade = (staffId: string, grade: string, options: Omit<UseQueryOptions<{ data: { sections: string[] } }, BaseError>, 'queryFn'> = {}) =>
  useBaseQuery<{ data: { sections: string[] } }, BaseError>(`/api/reports/${staffId}/grades/${grade}/sections`, options);

export const useGetStudentsForGradeAndSection = (staffId: string, grade: string, section: string, options: Omit<UseQueryOptions<{ data: { students: { id: string; name: string; matric_no: string; grade: string; section: string }[] } }, BaseError>, 'queryFn'> = {}) =>
  useBaseQuery<{ data: { students: { id: string; name: string; matric_no: string; grade: string; section: string }[] } }, BaseError>(`/api/reports/${staffId}/grades/${grade}/sections/${section}/students`, options);

export const useGetStudentDetailedReport = (staffId: string, studentId: string, startDate?: string, endDate?: string, options: Omit<UseQueryOptions<{
  student: { id: string; name: string; matric_no: string; grade: string };
  attendanceRecords: { date: string; status: 'present' | 'absent'; time_type: 'IN' | 'OUT' | null; section: string; created_at: string }[];
  summaries: {
    weekly: { total_days: number; present_days: number; absent_days: number };
    monthly: { total_days: number; present_days: number; absent_days: number };
    yearly: { total_days: number; present_days: number; absent_days: number };
  };
}, BaseError>, 'queryFn'> = {}) => {
  const queryParams = new URLSearchParams();
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  return useBaseQuery<{
    student: { id: string; name: string; matric_no: string; grade: string };
    attendanceRecords: { date: string; status: 'present' | 'absent'; time_type: 'IN' | 'OUT' | null; section: string; created_at: string }[];
    summaries: {
      weekly: { total_days: number; present_days: number; absent_days: number };
      monthly: { total_days: number; present_days: number; absent_days: number };
      yearly: { total_days: number; present_days: number; absent_days: number };
    };
  }, BaseError>(`/api/reports/${staffId}/students/${studentId}/details?${queryParams.toString()}`, options);
};

export const useMarkStudentAttendance = useBaseMutation<MarkStudentAttendanceResult, BaseError, MarkStudentAttendanceInput & { staffId: string; studentId: string }, unknown>(
  '/api/reports/:staff_id/students/:student_id/mark-attendance',
  'post'
);

export const useGetDashboardStats = (staffId: string, options: { session?: string } & Omit<UseQueryOptions<GetDashboardStatsResult, BaseError>, 'queryFn'> = {}) => {
  const { session, ...queryOptions } = options;
  const queryParams = new URLSearchParams();
  if (session) queryParams.append('session', session);
  const url = queryParams.toString() ? `/api/reports/${staffId}/dashboard?${queryParams.toString()}` : `/api/reports/${staffId}/dashboard`;

  return useBaseQuery<GetDashboardStatsResult, BaseError>(url, queryOptions);
};

export const useGetCheckInTimeAnalysis = (staffId: string, options: { grade?: string; section?: string; dateRange?: string; startDate?: string; endDate?: string; session?: string } & Omit<UseQueryOptions<GetCheckInTimeAnalysisResult, BaseError>, 'queryFn'> = {}) => {
  const queryParams = new URLSearchParams();
  if (options.grade) queryParams.append('grade', options.grade);
  if (options.section) queryParams.append('section', options.section);
  if (options.dateRange) queryParams.append('dateRange', options.dateRange);
  if (options.startDate) queryParams.append('startDate', options.startDate);
  if (options.endDate) queryParams.append('endDate', options.endDate);
  if (options.session) queryParams.append('session', options.session);

  return useBaseQuery<GetCheckInTimeAnalysisResult, BaseError>(`/api/reports/${staffId}/check-in-analysis?${queryParams.toString()}`, options);
};

export const useGetCheckInTimeDistribution = (staffId: string, options: { grade?: string; section?: string; session?: string } & Omit<UseQueryOptions<{status: string; statusCode: number; message: string; data: Array<{hour: string, count: number}>}, BaseError>, 'queryFn'> = {}) => {
  const queryParams = new URLSearchParams();
  if (options.grade) queryParams.append('grade', options.grade);
  if (options.section) queryParams.append('section', options.section);
  if (options.session) queryParams.append('session', options.session);

  return useBaseQuery<{status: string; statusCode: number; message: string; data: Array<{hour: string, count: number}>}, BaseError>(`/api/reports/${staffId}/check-in-distribution?${queryParams.toString()}`, options);
};

export const useGetStudentsByStatus = (
  staffId: string,
  date: string,
  grade: string,
  section: string,
  status: 'present' | 'absent' | 'late',
  session?: string,
  options: Omit<
    UseQueryOptions<
      { status: string; statusCode: number; message: string; data: { students: { id: string; name: string; matric_no: string; grade: string; section: string; checkin_time?: string; checkout_time?: string }[] } },
      BaseError
    >,
    'queryFn'
  > = {}
) => {
  const queryParams = new URLSearchParams();
  queryParams.append('date', date);
  queryParams.append('grade', grade);
  queryParams.append('section', section);
  queryParams.append('status', status);
  if (session && session !== 'all') queryParams.append('session', session);

  return useBaseQuery<
    { status: string; statusCode: number; message: string; data: { students: { id: string; name: string; matric_no: string; grade: string; section: string; checkin_time?: string; checkout_time?: string; time_type?: string }[] } },
    BaseError
  >(`/api/reports/${staffId}/students/status?${queryParams.toString()}`, options);
};

export const useGetMonthlyAttendanceSummary = (staffId: string, options: { grade?: string; section?: string; year?: number; session?: string } & Omit<UseQueryOptions<{
  status: string;
  message: string;
  data: {
    year: number;
    totalStudents: number;
    monthlySummaries: Array<{
      month: string;
      monthKey: string;
      totalStudents: number;
      schoolDays: number;
      presentDays: number;
      absentDays: number;
      lateDays: number;
      absencePercentage: number;
      latePercentage: number;
      days: Array<{
        date: string;
        isWeekend: boolean;
        isHoliday: boolean;
        present: number;
        absent: number;
        late: number;
        total: number;
      } | null>;
    }>;
  };
}, BaseError>, 'queryFn'> = {}) => {
  const { grade, section, year, session, ...queryOptions } = options;
  const queryParams = new URLSearchParams();
  if (grade) queryParams.append('grade', grade);
  if (section) queryParams.append('section', section);
  if (year) queryParams.append('year', year.toString());
  if (session) queryParams.append('session', session);

  const url = queryParams.toString() ? `/api/reports/${staffId}/monthly-summary?${queryParams.toString()}` : `/api/reports/${staffId}/monthly-summary`;

  return useBaseQuery<{
    status: string;
    message: string;
    data: {
      year: number;
      totalStudents: number;
      monthlySummaries: Array<{
        month: string;
        monthKey: string;
        totalStudents: number;
        schoolDays: number;
        presentDays: number;
        absentDays: number;
        lateDays: number;
        absencePercentage: number;
        latePercentage: number;
        days: Array<{
          date: string;
          isWeekend: boolean;
          isHoliday: boolean;
          present: number;
          absent: number;
          late: number;
          total: number;
        } | null>;
      }>;
    };
  }, BaseError>(url, queryOptions);
};
