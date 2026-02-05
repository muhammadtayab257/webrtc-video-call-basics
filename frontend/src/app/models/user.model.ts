export interface User {
  id: number;
  email: string;
  username: string;
  avatar_url?: string;
  is_online?: boolean;
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  username: string;
}
