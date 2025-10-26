/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
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
} from '../interfaces/api.interface';
import { useBaseMutation, useBaseQuery } from '../helpers/store.helper';
import { DeleteAttendanceResult } from '../interfaces/api.interface';

export const useAddAttendance = useBaseMutation<AddAttendanceResult, BaseError, AddAttendanceInput>('/api/attendance', 'post');
export const useGetAttendances = (staffId: string, page = 1, per_page = 10) =>
  useBaseQuery<GetAttendancesResult, BaseError>(`/api/attendances/staff/${staffId}?page=${page}&per_page=${per_page}`);
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
export const useGetAttendanceList = (attendance_id: string) =>
  useBaseQuery<GetAttendanceListResult, BaseError>(`/api/attendance/${attendance_id}/students`);

export const useGetReports = (staffId: string, options: { grade?: string; section?: string; dateRange?: string } = {}) => {
  const queryParams = new URLSearchParams();
  if (options.grade) queryParams.append('grade', options.grade);
  if (options.section) queryParams.append('section', options.section);
  if (options.dateRange) queryParams.append('dateRange', options.dateRange);

  return useBaseQuery<GetReportsResult, BaseError>(`/api/reports/${staffId}?${queryParams.toString()}`);
};

export const useGetGradesAndSections = (staffId: string) =>
  useBaseQuery<GetGradesAndSectionsResult, BaseError>(`/api/reports/${staffId}/filters`);

export const useGetStudentReports = (staffId: string, studentId?: string, startDate?: string, endDate?: string, dateRange?: string) => {
  const queryParams = new URLSearchParams();
  if (studentId) queryParams.append('student_id', studentId);
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);
  if (dateRange) queryParams.append('dateRange', dateRange);

  return useBaseQuery<GetStudentReportsResult, BaseError>(`/api/reports/${staffId}/students?${queryParams.toString()}`);
};

export const useGetSectionsForGrade = (staffId: string, grade: string) =>
  useBaseQuery<{ sections: string[] }, BaseError>(`/api/reports/${staffId}/grades/${grade}/sections`);

export const useGetStudentsForGradeAndSection = (staffId: string, grade: string, section: string) =>
  useBaseQuery<{ students: { id: string; name: string; matric_no: string; grade: string; section: string }[] }, BaseError>(`/api/reports/${staffId}/grades/${grade}/sections/${section}/students`);

export const useGetStudentDetailedReport = (staffId: string, studentId: string) =>
  useBaseQuery<{
    student: { id: string; name: string; matric_no: string; grade: string };
    attendanceRecords: { date: string; status: 'present' | 'absent'; time_type: 'IN' | 'OUT' | null; section: string; created_at: string }[];
    summaries: {
      weekly: { total_days: number; present_days: number; absent_days: number; attendance_rate: number };
      monthly: { total_days: number; present_days: number; absent_days: number; attendance_rate: number };
      yearly: { total_days: number; present_days: number; absent_days: number; attendance_rate: number };
    };
  }, BaseError>(`/api/reports/${staffId}/students/${studentId}/details`);

export const useMarkStudentAttendance = useBaseMutation<MarkStudentAttendanceResult, BaseError, MarkStudentAttendanceInput & { staffId: string; studentId: string }>(
  '',
  'post'
);

export const useGetDashboardStats = (staffId: string) =>
  useBaseQuery<GetDashboardStatsResult, BaseError>(`/api/reports/${staffId}/dashboard`);
