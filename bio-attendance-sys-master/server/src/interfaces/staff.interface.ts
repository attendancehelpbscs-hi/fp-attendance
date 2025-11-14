export interface NewStaff {
  firstName: string;
  lastName: string;
  name: string; // Keep for backward compatibility
  email: string;
  password: string;
  retype_password: string;
}

export interface RegisterReturn {
  accessToken: string | undefined;
  refreshToken: string | undefined;
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    name: string; // Keep for backward compatibility
    email: string;
    created_at: Date;
    profilePicture?: string;
  };
}
