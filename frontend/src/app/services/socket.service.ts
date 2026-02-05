import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | null = null;
  private isConnectedSignal = signal<boolean>(false);

  isConnected = this.isConnectedSignal.asReadonly();

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.socket?.connected) return;

    const token = this.authService.getToken();
    if (!token) {
      console.error('[SOCKET] No token available');
      return;
    }

    this.socket = io({
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('[SOCKET] Connected');
      this.isConnectedSignal.set(true);
    });

    this.socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected');
      this.isConnectedSignal.set(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error.message);
      this.isConnectedSignal.set(false);
    });

    this.socket.on('authenticated', (data) => {
      console.log('[SOCKET] Authenticated:', data.user.username);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnectedSignal.set(false);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('[SOCKET] Not connected, cannot emit:', event);
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    this.socket?.off(event, callback);
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}
