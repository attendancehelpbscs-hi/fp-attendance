/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import type {
  AddCourseInput,
  AddCourseResult,
  BaseError,
  GetCoursesResult,
  UpdateCourseInput,
  UpdateCourseResult,
} from '../interfaces/api.interface';
import { useBaseMutation, useBaseQuery } from '../helpers/store.helper';
import { DeleteCourseResult } from '../interfaces/api.interface';

export const useAddCourse = useBaseMutation<AddCourseResult, BaseError, AddCourseInput>('/api/course', 'post');
export const useGetCourses = (staffId: string, page = 1, per_page = 10) =>
  useBaseQuery<GetCoursesResult, BaseError>(`/api/courses/staff/${staffId}?page=${page}&per_page=${per_page}`);
export const useDeleteCourse = useBaseMutation<DeleteCourseResult, BaseError, { url: string }>(`/api/course`, 'delete');
export const useUpdateCourse = useBaseMutation<UpdateCourseResult, BaseError, UpdateCourseInput>(`/api/course`, 'put');