import { axiosClient } from '../lib/axios-client';

export const getAuditLogs = async (page: number = 1, limit: number = 10) => {
  const response = await axiosClient.get('/api/audit/logs', {
    params: { page, limit },
  });
  return response.data;
};

export const logAudit = async (action: string, details?: string) => {
  const response = await axiosClient.post('/api/audit/log', { action, details });
  return response.data;
};
