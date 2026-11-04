import { IUserProfile, UserRole } from '../types';

export interface AuthSession {
  user: {
    id: string;
    email: string;
  };
  profile: IUserProfile;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  session?: AuthSession;
  error?: string;
}
