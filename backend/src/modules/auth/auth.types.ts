export interface AdminUser {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export interface JWTPayload {
  userId: string;
  role: string;
}
