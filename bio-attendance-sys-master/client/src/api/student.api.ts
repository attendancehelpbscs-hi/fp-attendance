import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Student, ApiResponse, PaginationMeta, AddStudentInput, StudentFingerprint, ImportStudentsResult } from '../interfaces/api.interface';

export const useGetStudents = (
  staffId: string,
  page: number = 1,
  perPage: number = 10,
  options?: any
) => {
  return useQuery(
    ['students', staffId, page, perPage],
    async () => {
      const response = await api.get<ApiResponse<{ students: Student[]; meta: PaginationMeta }>>(
        `/api/students/staff/${staffId}?page=${page}&per_page=${perPage}`
      );
      return response.data;
    },
    {
      enabled: !!staffId,
      ...options,
    }
  );
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation(
    async (data: { id: string; name?: string; matric_no?: string; grade?: string; fingerprint?: string; courses?: string[]; url: string }) => {
      const response = await api.put<ApiResponse<{ student: Student }>>(`/api/student${data.url}`, {
        name: data.name,
        matric_no: data.matric_no,
        grade: data.grade,
        fingerprint: data.fingerprint,
        courses: data.courses,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['students']);
      },
    }
  );
};

export const useAddStudent = (options?: any) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (data: AddStudentInput) => {
      const response = await api.post<ApiResponse<{ student: Student }>>('/api/student', data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['students']);
        options?.onSuccess?.();
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
      ...options,
    }
  );
};

export const useImportStudents = (options?: any) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (formData: FormData) => {
      const response = await api.post<ApiResponse<ImportStudentsResult>>('/api/import/students', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['students']);
        options?.onSuccess?.();
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
      ...options,
    }
  );
};

export const useDeleteStudent = (options?: any) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (data: { url: string }) => {
      const response = await api.delete<ApiResponse<{ message: string }>>(`/api/student${data.url}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['students']);
        options?.onSuccess?.();
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
      ...options,
    }
  );
};

export const useGetStudentsFingerprints = (
  staffId: string,
  page: number = 1,
  perPage: number = 1000,
  options?: any
) => {
  return useQuery(
    ['studentsfingerprints', staffId, page, perPage],
    async () => {
      const response = await api.get<ApiResponse<{ students: StudentFingerprint[]; meta: PaginationMeta }>>(
        `/api/students/fingerprints/${staffId}?page=${page}&per_page=${perPage}`
      );
      return response.data;
    },
    {
      enabled: !!staffId,
      ...options,
    }
  );
};

export const useCheckFingerprintUniqueness = () => {
  return useMutation(
    async (fingerprint: string) => {
      const response = await api.post<ApiResponse<{
        isUnique: boolean;
        confidence?: number;
        matchedStudent?: {
          id: string;
          name: string;
          matric_no: string;
        };
        message: string;
      }>>('/api/student/check-fingerprint', { fingerprint });
      return response.data;
    }
  );
};

// ============================================================================
// NEW: Multi-Fingerprint Enrollment APIs
// ============================================================================

/**
 * Fetch all enrolled fingerprints for a specific student
 */
export const useGetStudentFingerprints = (studentId: string, options?: any) => {
  return useQuery(
    ['student-fingerprints', studentId],
    async () => {
      const response = await api.get<ApiResponse<{
        fingerprints: Array<{
          id: string;
          finger_type: string;
          created_at: string;
        }>;
      }>>(`/api/student/${studentId}/fingerprints`);
      return response.data;
    },
    {
      enabled: !!studentId,
      ...options,
    }
  );
};

/**
 * Add a new fingerprint for a student
 */
export const useAddStudentFingerprint = (options?: any) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (data: {
      student_id: string;
      fingerprint: string;
      finger_type: string;
    }) => {
      const response = await api.post<ApiResponse<{
        fingerprint: {
          id: string;
          student_id: string;
          finger_type: string;
          created_at: string;
        };
      }>>('/api/student/fingerprint/enroll', data);
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries(['student-fingerprints', variables.student_id]);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['studentsfingerprints']);
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
      ...options,
    }
  );
};

/**
 * Delete a specific fingerprint
 */
export const useDeleteStudentFingerprint = (options?: any) => {
  const queryClient = useQueryClient();

  return useMutation(
    async (data: { fingerprint_id: string; student_id: string }) => {
      const response = await api.delete<ApiResponse<{ message: string }>>(
        `/api/student/fingerprint/${data.fingerprint_id}`
      );
      return response.data;
    },
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['student-fingerprints', variables.student_id]);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['studentsfingerprints']);
        options?.onSuccess?.(data);
      },
      onError: (error: any) => {
        options?.onError?.(error);
      },
      ...options,
    }
  );
};

/**
 * Check if a fingerprint is unique (not enrolled by any other student)
 * @param excludeStudentId - Optional: Allow checking for re-enrollment of same student
 */
export const useCheckFingerprintUniquenesMulti = () => {
  return useMutation(
    async (data: { fingerprint: string; excludeStudentId?: string }) => {
      const response = await api.post<ApiResponse<{
        isUnique: boolean;
        confidence?: number;
        matchedStudent?: {
          id: string;
          name: string;
          matric_no: string;
        };
        matchedFingerType?: string;
        message: string;
      }>>('/api/student/check-fingerprint-multi', data);
      return response.data;
    }
  );
};