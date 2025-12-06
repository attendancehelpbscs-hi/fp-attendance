export interface StaffInfo {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Keep for backward compatibility
  email: string;
  created_at: string;
  profilePicture?: string;
  role: string; // New field for role information (admin, teacher, etc.)
  grade?: string; // For teachers: their assigned grade
  section?: string; // For teachers: their assigned section
  matric_no?: string; // For teachers: their employee ID
}

export interface StaffSettings {
  grace_period_minutes: number;
  school_start_time: string;
  late_threshold_hours: number;
  pm_late_cutoff_enabled: boolean;
  pm_late_cutoff_time: string | null;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface State {
  // states
  count: number;
  staffInfo: StaffInfo | null;
  staffSettings: StaffSettings | null;
  tokens: Tokens | null;
  isAuthenticated: boolean;
  // actions
  increment: () => void;
  decrement: () => void;
  loginStaff: (data: Tokens & { staff: StaffInfo }) => void;
  updateStaffProfile: (profileData: Partial<StaffInfo>) => void;
  logoutStaff: () => void;
  logout: () => void;
  setStaffSettings: (settings: StaffSettings) => void;
}
