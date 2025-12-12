export interface SF2Student {
  id: string;
  name: string;
  matric_no?: string;
  dailyAttendance: Record<string, { am: string; pm: string }>;
  absentCount: number;
}

export interface SF2Data {
  region?: string;
  division?: string;
  district?: string;
  schoolId?: string;
  schoolName?: string;
  schoolYear?: string;
  schoolHeadName?: string;
  grade: string;
  section: string;
  month: number;
  year: number;
  teacherName?: string;
  students: SF2Student[];
  enrollmentFirstFriday: number;
  schoolDays: string[];
}