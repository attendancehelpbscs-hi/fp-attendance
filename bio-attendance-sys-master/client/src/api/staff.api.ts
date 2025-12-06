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


export const useLoginStaff = useBaseMutation<LoginStaffResult, BaseError, LoginStaffInput>('/api/auth/staff/login', 'post');
export const useUpdateStaffSettings = useBaseMutation<UpdateStaffSettingsResult, BaseError, UpdateStaffSettingsInput>('/api/staff/settings', 'put');
export const useGetStaffSettings = (options: Omit<UseQueryOptions<GetStaffSettingsResult, BaseError, GetStaffSettingsResult, QueryKey>, 'queryFn'> = {}) =>
  useBaseQuery<GetStaffSettingsResult, BaseError>('/api/staff/settings', options);
export const useBackupData = useBaseMutation<BackupDataResult, BaseError, Record<string, never>>('/api/staff/backup', 'post');
export const useClearAuditLogs = useBaseMutation<ClearAuditLogsResult, BaseError, Record<string, never>>('/api/staff/clear-logs', 'delete');
export const useUpdateStaffProfile = () => {
  return useBaseMutation<UpdateStaffProfileResult, BaseError, UpdateStaffProfileInput>('/api/staff/profile', 'put');
};

export const useForgotPassword = useBaseMutation<{ message: string }, BaseError, { email: string }>('/api/auth/staff/forgot-password', 'post');
export const useResetPassword = useBaseMutation<{ message: string }, BaseError, { token: string; newPassword: string }>('/api/auth/staff/reset-password', 'post');
export const useFingerprintLogin = useBaseMutation<LoginStaffResult, BaseError, { fingerprint: string }>('/api/auth/staff/fingerprint-login', 'post');

// Teacher management API functions
export const useAddTeacher = useBaseMutation<AddTeacherResult, BaseError, AddTeacherInput>('/api/teachers', 'post');
export const useGetTeachers = (page: number = 1, per_page: number = 10, options: Omit<UseQueryOptions<GetTeachersResult, BaseError, GetTeachersResult, QueryKey>, 'queryFn'> = {}) =>
  useBaseQuery<GetTeachersResult, BaseError>(`/api/teachers?page=${page}&per_page=${per_page}`, options);
export const useUpdateTeacher = useBaseMutation<UpdateTeacherResult, BaseError, UpdateTeacherInput>('/api/teachers', 'put');
export const useDeleteTeacher = useBaseMutation<DeleteTeacherResult, BaseError, { url: string }>('/api/teachers', 'delete');
export const useImportTeachers = (options?: any) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (formData: FormData) => {
      const response = await api.post<ApiResponse<ImportTeachersResult>>('/api/teachers/import', formData, {
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
