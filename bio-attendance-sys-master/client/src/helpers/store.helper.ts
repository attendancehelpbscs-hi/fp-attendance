import type { UseMutationOptions, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import { axiosClient } from '../lib/axios-client';
import { removeObjectProps } from './global.helper';

export function useBaseMutation<TRes = unknown, TError = unknown, TData = unknown, TContext = unknown>(
  url: string,
  method: 'post' | 'put' | 'delete' | 'post',
) {
  return (useMutationOptions: Omit<UseMutationOptions<TRes, TError, TData, TContext>, 'mutationFn'> = {}) =>
    useMutation<TRes, TError, TData, TContext>(
      async (data) => {
        const dynamicUrl = (data as TData & { staffId?: string; studentId?: string })?.staffId && (data as TData & { staffId?: string; studentId?: string })?.studentId
          ? `/api/reports/${(data as TData & { staffId: string; studentId: string }).staffId}/students/${(data as TData & { staffId: string; studentId: string }).studentId}/mark-attendance`
          : url + ((data as TData & { url?: string })?.url || '');
        // FIXED: Added 'id' to the list of properties to remove from the payload
        const payload = removeObjectProps(data as { [k: string]: unknown }, ['staffId', 'studentId', 'url', 'id']);
        return method === 'delete'
          ? (await axiosClient[method](dynamicUrl)).data
          : (await axiosClient[method](dynamicUrl, payload)).data;
      },
      useMutationOptions,
    );
}

export function useBaseQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(url: string, options: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn'> = {}) {
  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...options,
    queryKey: options.queryKey || ([url] as unknown as TQueryKey),
    queryFn: async () => {
      const response = await axiosClient.get(url);
      return response?.data;
    },
  });
}
