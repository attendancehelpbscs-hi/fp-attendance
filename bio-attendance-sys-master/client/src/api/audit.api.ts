import { axiosClient } from '../lib/axios-client';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useBaseQuery } from '../helpers/store.helper';
import type { BaseError } from '../interfaces/api.interface';

export const getAuditLogs = async (page: number = 1, limit: number = 10) => {
  const response = await axiosClient.get('/api/audit/logs', {
    params: { page, limit },
  });
  return response.data;
};

export const useGetAuditLogs = (page: number = 1, limit: number = 10, options: Omit<UseQueryOptions<any, BaseError>, 'queryFn'> = {}) =>
  useBaseQuery<any, BaseError>(`/api/audit/logs?page=${page}&limit=${limit}`, options);

export const logAudit = async (action: string, details?: string) => {
  const response = await axiosClient.post('/api/audit/log', { action, details });
  return response.data;
};
