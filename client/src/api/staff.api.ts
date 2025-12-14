/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import type {
  RegisterStaffInput,
  RegisterStaffResult,
  LoginStaffInput,
  LoginStaffResult,
  BaseError,
  UpdateStaffSettingsInput,
  UpdateStaffSettingsResult,
  GetStaffSettingsResult,
  BackupDataResult,
  ClearAuditLogsResult,
  UpdateStaffProfileInput,
  UpdateStaffProfileResult,
  AddTeacherInput,
  AddTeacherResult,
  GetTeachersResult,
  UpdateTeacherInput,
  UpdateTeacherResult,
  DeleteTeacherResult,
  ImportTeachersInput,
  ImportTeachersResult,
  ApiResponse,
} from '../interfaces/api.interface';
import type { UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBaseMutation, useBaseQuery } from '../helpers/store.helper';
import { api } from './api';
import useStore from '../store/store';


export const useLoginStaff = useBaseMutation<LoginStaffResult, BaseError, LoginStaffInput>('/auth/staff/login', 'post');
export const useUpdateStaffSettings = useBaseMutation<UpdateStaffSettingsResult, BaseError, UpdateStaffSettingsInput>('/staff/settings', 'put');
export const useGetStaffSettings = (options: Omit<UseQueryOptions<GetStaffSettingsResult, BaseError, GetStaffSettingsResult, QueryKey>, 'queryFn'> = {}) =>
  useBaseQuery<GetStaffSettingsResult, BaseError>('/staff/settings', options);
export const useBackupData = useBaseMutation<BackupDataResult, BaseError, Record<string, never>>('/staff/backup', 'post');
export const useClearAuditLogs = useBaseMutation<ClearAuditLogsResult, BaseError, Record<string, never>>('/staff/clear-logs', 'delete');
export const useUpdateStaffProfile = () => {
  return useBaseMutation<UpdateStaffProfileResult, BaseError, UpdateStaffProfileInput>('/staff/profile', 'put');
};

export const useForgotPassword = useBaseMutation<{ message: string }, BaseError, { email: string }>('/auth/staff/forgot-password', 'post');
export const useResetPassword = useBaseMutation<{ message: string }, BaseError, { token: string; newPassword: string }>('/auth/staff/reset-password', 'post');
export const useFingerprintLogin = useBaseMutation<LoginStaffResult, BaseError, { fingerprint: string }>('/auth/staff/fingerprint-login', 'post');

// Teacher management API functions
export const useAddTeacher = useBaseMutation<AddTeacherResult, BaseError, AddTeacherInput>('/teachers', 'post');
export const useGetTeachers = (page: number = 1, per_page: number = 10, options: Omit<UseQueryOptions<GetTeachersResult, BaseError, GetTeachersResult, QueryKey>, 'queryFn'> = {}) =>
  useBaseQuery<GetTeachersResult, BaseError>(`/teachers?page=${page}&per_page=${per_page}`, options);
export const useUpdateTeacher = useBaseMutation<UpdateTeacherResult, BaseError, UpdateTeacherInput>('/teachers', 'put');
export const useDeleteTeacher = useBaseMutation<DeleteTeacherResult, BaseError, { url: string; password?: string }>('/teachers', 'delete');
export const useGetPendingTeachers = (options: Omit<UseQueryOptions<{ teachers: any[] }, BaseError, { teachers: any[] }, QueryKey>, 'queryFn'> = {}) =>
  useBaseQuery<{ teachers: any[] }, BaseError>('/teachers/pending/list', options);
export const useApproveTeacher = useBaseMutation<{ message: string }, BaseError, { teacherId: string; action: 'approve' | 'reject'; reason?: string; url: string }>('/teachers', 'post');
export const useImportTeachers = (options?: any) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (formData: FormData) => {
      const response = await api.post<ApiResponse<ImportTeachersResult>>('/teachers/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['teachers']);
        options?.onSuccess?.();
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
      ...options,
    }
  );
};

export const useSendWelcomeEmail = useBaseMutation<{ message: string }, BaseError, { teacherId: string; url: string }>('/teachers', 'post');

export const useGetAssignedSectionsForGrade = (grade: string, options: Omit<UseQueryOptions<{ sections: string[] }, BaseError, { sections: string[] }, QueryKey>, 'queryFn'> = {}) =>
  useBaseQuery<{ sections: string[] }, BaseError>(`/teachers/assigned-sections/${grade}`, options);

export const useGetAllAssignedSections = (options: Omit<UseQueryOptions<{ sections: string[] }, BaseError, { sections: string[] }, QueryKey>, 'queryFn'> = {}) =>
  useBaseQuery<{ sections: string[] }, BaseError>(`/teachers/assigned-sections`, options);

// Template download function
export const useDownloadStudentTemplate = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get('/import/template', {
        responseType: 'blob'
      });
      return response.data;
    },
    onError: (error: any) => {
      console.error('Template download failed:', error);
      throw error;
    }
  });
};