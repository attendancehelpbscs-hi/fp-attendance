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

export const useRegisterStaff = useBaseMutation<RegisterStaffResult, BaseError, RegisterStaffInput>('/api/staff/register', 'post');
export const useLoginStaff = useBaseMutation<LoginStaffResult, BaseError, LoginStaffInput>('/api/auth/staff/login', 'post');
export const useUpdateStaffSettings = useBaseMutation<UpdateStaffSettingsResult, BaseError, UpdateStaffSettingsInput>('/api/staff/settings', 'put');
export const useGetStaffSettings = useBaseQuery<GetStaffSettingsResult, BaseError>('/api/staff/settings');
export const useBackupData = useBaseMutation<BackupDataResult, BaseError, Record<string, never>>('/api/staff/backup', 'post');
export const useClearAuditLogs = useBaseMutation<ClearAuditLogsResult, BaseError, Record<string, never>>('/api/staff/clear-logs', 'delete');
export const useUpdateStaffProfile = useBaseMutation<UpdateStaffProfileResult, BaseError, UpdateStaffProfileInput>('/api/staff/profile', 'put');
