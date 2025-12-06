import { axiosClient } from '../lib/axios-client';
import type {
  GetHolidaysResult,
  AddHolidayResult,
  UpdateHolidayResult,
  DeleteHolidayResult,
  AddHolidayInput,
  UpdateHolidayInput,
} from '../interfaces/api.interface';

export const getHolidays = async (): Promise<GetHolidaysResult> => {
  const response = await axiosClient.get('/api/holidays');
  return response.data;
};

export const addHoliday = async (data: AddHolidayInput): Promise<AddHolidayResult> => {
  const response = await axiosClient.post('/api/holidays', data);
  return response.data;
};

export const updateHoliday = async (id: string, data: UpdateHolidayInput): Promise<UpdateHolidayResult> => {
  const response = await axiosClient.put(`/api/holidays/${id}`, data);
  return response.data;
};

export const deleteHoliday = async (id: string): Promise<DeleteHolidayResult> => {
  const response = await axiosClient.delete(`/api/holidays/${id}`);
  return response.data;
};