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
        const payload = removeObjectProps(data as { [k: string]: unknown }, ['staffId', 'studentId', 'url']);
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
>(url: string) {
  return (useQueryOptions: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn'> = {}) =>
    useQuery<TQueryFnData, TError, TData, TQueryKey>({
      ...useQueryOptions,
      queryKey: [url] as unknown as TQueryKey,
      queryFn: async () => (await axiosClient.get(url)).data,
    });
}
