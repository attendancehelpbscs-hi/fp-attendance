import { axiosClient } from '../lib/axios-client';

export const getAuditLogs = async () => {
  const response = await axiosClient.get('/api/audit/logs');
  return response.data;
};
