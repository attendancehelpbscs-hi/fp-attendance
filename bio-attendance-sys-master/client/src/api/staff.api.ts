/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import type {
  RegisterStaffInput,
  RegisterStaffResult,
  LoginStaffInput,
  LoginStaffResult,
  BaseError,
} from '../interfaces/api.interface';
import { useBaseMutation } from '../helpers/store.helper';

export const useRegisterStaff = useBaseMutation<RegisterStaffResult, BaseError, RegisterStaffInput>('/api/staff/register', 'post');
export const useLoginStaff = useBaseMutation<LoginStaffResult, BaseError, LoginStaffInput>('/api/auth/staff/login', 'post');