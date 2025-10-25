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

export const useGetReports = (staffId: string, grade?: string, section?: string, dateRange?: string) => {
  const queryParams = new URLSearchParams();
  if (grade) queryParams.append('grade', grade);
  if (section) queryParams.append('section', section);
  if (dateRange) queryParams.append('dateRange', dateRange);

  return useBaseQuery<GetReportsResult, BaseError>(`/api/reports/${staffId}?${queryParams.toString()}`);
};

export const useGetGradesAndSections = (staffId: string) =>
  useBaseQuery<GetGradesAndSectionsResult, BaseError>(`/api/reports/${staffId}/filters`);
