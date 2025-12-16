export interface User {
  id: string;
  email: string;
  role: 'administrator' | 'vendedor';
  created_at: Date;
  updated_at: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    role: string;
    created_at: Date;
  };
  token?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: 'administrator' | 'vendedor';
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}