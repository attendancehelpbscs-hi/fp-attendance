import { axiosClient } from '../lib/axios-client';

export const getAuditLogs = async () => {
  const response = await axiosClient.get('/api/audit/logs');
  return response.data;
};

export const logAudit = async (action: string, details?: string) => {
  const response = await axiosClient.post('/api/audit/log', { action, details });
  return response.data;
};
