export interface SF2Student {
  id: string;
  name: string;
  matric_no: string;
  dailyAttendance: Record<string, { am: string; pm: string }>;
  absentCount: number;
  tardyCount: number;
  lateCount: number;
  remarks: string;
}

export interface SF2Data {
  region?: string;
  division?: string;
  district?: string;
  schoolId: string;
  schoolName: string;
  schoolYear: string;
  month: string;
  grade: string;
  section: string;
  students: SF2Student[];
  enrollmentFirstFriday: number;
  lateEnrollmentCount: number;
  registeredLearners: number;
  percentageEnrollment: number;
  averageDailyAttendance: number;
  percentageAttendance: number;
  consecutiveAbsent5Days: number;
  dropoutMale: number;
  dropoutFemale: number;
  transferOutMale: number;
  transferOutFemale: number;
  transferInMale: number;
  transferInFemale: number;
  schoolDays: string[];
  dayTypes: Record<string, 'weekday' | 'weekend' | 'holiday'>;
  staffName: string;
  schoolHeadName: string;
}
