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
} from '../interfaces/api.interface';
import { useBaseMutation, useBaseQuery } from '../helpers/store.helper';
import useStore from '../store/store';


export const useLoginStaff = useBaseMutation<LoginStaffResult, BaseError, LoginStaffInput>('/api/auth/staff/login', 'post');
export const useUpdateStaffSettings = useBaseMutation<UpdateStaffSettingsResult, BaseError, UpdateStaffSettingsInput>('/api/staff/settings', 'put');
export const useGetStaffSettings = (options: { enabled?: boolean } = {}) =>
  useBaseQuery<GetStaffSettingsResult, BaseError>('/api/staff/settings', options);
export const useBackupData = useBaseMutation<BackupDataResult, BaseError, Record<string, never>>('/api/staff/backup', 'post');
export const useClearAuditLogs = useBaseMutation<ClearAuditLogsResult, BaseError, Record<string, never>>('/api/staff/clear-logs', 'delete');
export const useUpdateStaffProfile = () => {
  return useBaseMutation<UpdateStaffProfileResult, BaseError, UpdateStaffProfileInput>('/api/staff/profile', 'put');
};

export const useForgotPassword = useBaseMutation<{ message: string }, BaseError, { email: string }>('/api/auth/staff/forgot-password', 'post');
export const useResetPassword = useBaseMutation<{ message: string }, BaseError, { token: string; newPassword: string }>('/api/auth/staff/reset-password', 'post');
export const useFingerprintLogin = useBaseMutation<LoginStaffResult, BaseError, { fingerprint: string }>('/api/auth/staff/fingerprint-login', 'post');
