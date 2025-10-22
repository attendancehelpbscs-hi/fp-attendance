/* eslint-disable @typescript-eslint/no-unnecessary-type-constraint */
import type {
  AddStudentInput,
  AddStudentResult,
  BaseError,
  GetStudentsResult,
  UpdateStudentInput,
  UpdateStudentResult,
} from '../interfaces/api.interface';
import { useBaseMutation, useBaseQuery } from '../helpers/store.helper';
import { DeleteStudentResult } from '../interfaces/api.interface';

export const useAddStudent = useBaseMutation<AddStudentResult, BaseError, AddStudentInput>('/api/student', 'post');
export const useGetStudents = (staffId: string, page = 1, per_page = 10) =>
  useBaseQuery<GetStudentsResult, BaseError>(`/api/students/staff/${staffId}?page=${page}&per_page=${per_page}`);
export const useDeleteStudent = useBaseMutation<DeleteStudentResult, BaseError, { url: string }>(`/api/student`, 'delete');
export const useUpdateStudent = useBaseMutation<UpdateStudentResult, BaseError, UpdateStudentInput>(`/api/student`, 'put');