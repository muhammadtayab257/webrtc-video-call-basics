import { Injectable, signal } from '@angular/core';
import { User, AuthResponse, LoginCredentials, SignupCredentials } from '../models/user.model';

const API_URL = '/api/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Reactive state using signals
  private currentUserSignal = signal<User | null>(null);
  private isAuthenticatedSignal = signal<boolean>(false);

  // Public readonly signals
  currentUser = this.currentUserSignal.asReadonly();
  isAuthenticated = this.isAuthenticatedSignal.asReadonly();

  constructor() {
    // Check for existing token on init
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      try {
        this.currentUserSignal.set(JSON.parse(user));
        this.isAuthenticatedSignal.set(true);
      } catch {
        this.clearAuth();
      }
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Signup failed');
    }

    const data: AuthResponse = await response.json();
    this.setAuth(data.token, data.user);
    return data;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    this.setAuth(data.token, data.user);
    return data;
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch {
        // Ignore logout errors
      }
    }
    this.clearAuth();
  }

  async getMe(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      this.clearAuth();
      throw new Error('Session expired');
    }

    const data = await response.json();
    this.currentUserSignal.set(data.user);
    return data.user;
  }

  private setAuth(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.currentUserSignal.set(user);
    this.isAuthenticatedSignal.set(true);
  }

  private clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSignal.set(null);
    this.isAuthenticatedSignal.set(false);
  }
}
