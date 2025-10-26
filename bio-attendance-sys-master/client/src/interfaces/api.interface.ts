import type { StaffInfo, Tokens } from '../interfaces/store.interface';
import { AxiosError } from 'axios';

export interface PaginationMeta {
  per_page: number;
  page: number;
  total_pages: number;
  total_items: number;
}

/* STAFF */
export interface RegisterStaffInput {
  name: string;
  email: string;
  password: string;
  retype_password: string;
}

export interface BaseResult<TData> {
  message: string;
  status: 'sucess';
  statusCode: number;
  data: TData;
}

export type BaseError = AxiosError<{
  message: string;
  status: string;
  statusCode: number;
}>;

export type RegisterStaffResult = BaseResult<{
  staff: Tokens & {
    staff: StaffInfo;
  };
}>;

export interface LoginStaffInput {
  email: string;
  password: string;
}

export type LoginStaffResult = RegisterStaffResult;

/* COURSE */

export interface Course {
  id: string;
  staff_id: string;
  course_name: string;
  course_code: string;
  created_at: string;
}

export interface AddCourseInput {
  staff_id: string;
  course_name: string;
  course_code: string;
}

export type AddCourseResult = BaseResult<{
  course: Course;
}>;

export type GetCoursesResult = BaseResult<{
  courses: Course[];
  meta: PaginationMeta;
}>;

export type DeleteCourseResult = BaseResult<{
  deleted: boolean;
}>;

export interface UpdateCourseInput {
  id: string;
  staff_id: string;
  course_name: string;
  course_code: string;
  url: string;
}

export type UpdateCourseResult = BaseResult<{
  course: Course;
}>;

/* STUDENT */
export interface Student {
  id: string;
  staff_id: string;
  name: string;
  matric_no: string;
  grade: string;
  fingerprint: string;
  courses: Course[];
  created_at: string;
}

export interface AddStudentInput {
  staff_id: string;
  name: string;
  matric_no: string;
  grade: string;
  fingerprint: string;
  courses: string[];
}

export type AddStudentResult = BaseResult<{
  student: Student;
}>;

export type GetStudentsResult = BaseResult<{
  students: Student[];
  meta: PaginationMeta;
}>;

export type DeleteStudentResult = BaseResult<{
  deleted: boolean;
}>;

export type UpdateStudentInput = AddStudentInput & { id: string; url: string };

export type UpdateStudentResult = BaseResult<{
  student: Student;
}>;

export interface StudentFingerprint {
  id: string;
  name: string;
  matric_no: string;
  grade: string;
  fingerprint: string;
  courses: Course[];
}

export type GetStudentsFingerprintsResult = BaseResult<{
  students: StudentFingerprint[];
}>;

/* ATTENDANCE */

export interface Attendance {
  id: string;
  staff_id: string;
  name: string;
  date: string;
  created_at: string;
}

export interface AddAttendanceInput {
  staff_id: string;
  name: string;
  date: string;
}

export type AddAttendanceResult = BaseResult<{
  attendance: Attendance;
}>;

export type GetAttendancesResult = BaseResult<{
  attendances: Attendance[];
  meta: PaginationMeta;
}>;

export type DeleteAttendanceResult = BaseResult<{
  deleted: boolean;
}>;

export type UpdateAttendanceInput = AddAttendanceInput & { id: string; url: string };

export type UpdateAttendanceResult = BaseResult<{
  attendance: Attendance;
}>;

export interface MarkAttendanceInput {
  attendance_id: string;
  student_id: string;
  time_type: 'IN' | 'OUT';
  section: string;
}

export type MarkAttendanceResult = BaseResult<{
  marked: boolean;
}>;

export type GetAttendanceListResult = BaseResult<{
  attendanceList: Array<{
    student_id: string;
    attendance_id: string;
    time_type: 'IN' | 'OUT';
    section: string;
    created_at: string;
    student: Student;
  }>;
}>;

export interface AttendanceReportData {
  date: string;
  grade: string;
  section: string;
  present: number;
  absent: number;
  rate: number;
}

export interface AttendanceSummary {
  totalStudents: number;
  averageRate: number;
  lowAttendanceCount: number;
  perfectAttendanceCount: number;
}

export type GetReportsResult = BaseResult<{
  reports: AttendanceReportData[];
  summary: AttendanceSummary;
}>;

export type GetGradesAndSectionsResult = BaseResult<{
  grades: string[];
  sections: string[];
}>;

export interface StudentAttendanceReportData {
  date: string;
  student_id: string;
  student_name: string;
  matric_no: string;
  grade: string;
  section: string;
  status: 'present' | 'late' | 'absent';
  time_type: 'IN' | 'OUT' | null;
  created_at: string;
}

export interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  matric_no: string;
  grade: string;
  section: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  attendance_rate: number;
  period_start: string;
  period_end: string;
}

export type GetStudentReportsResult = BaseResult<{
  reports: StudentAttendanceReportData[];
  summary: StudentAttendanceSummary[];
}>;

export interface MarkStudentAttendanceInput {
  dates: string[];
  status: 'late' | 'absent';
  section: string;
}

export type MarkStudentAttendanceResult = BaseResult<{
  marked: number;
}>;

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  attendanceRate: number;
}

export type GetDashboardStatsResult = BaseResult<DashboardStats>;
