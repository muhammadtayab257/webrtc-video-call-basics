import { Injectable, signal } from '@angular/core';
import { Message } from '../models/message.model';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';

const API_URL = '/api/messages';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messagesSignal = signal<Message[]>([]);
  private typingUsersSignal = signal<{ userId: number; username: string }[]>([]);

  messages = this.messagesSignal.asReadonly();
  typingUsers = this.typingUsersSignal.asReadonly();

  constructor(
    private authService: AuthService,
    private socketService: SocketService
  ) {
    this.setupSocketListeners();
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authService.getToken()}`
    };
  }

  private setupSocketListeners(): void {
    // New message received
    this.socketService.on('new-message', (message: Message) => {
      const current = this.messagesSignal();
      this.messagesSignal.set([...current, message]);
    });

    // User typing
    this.socketService.on('user-typing', (data: { userId: number; username: string }) => {
      const current = this.typingUsersSignal();
      if (!current.find(u => u.userId === data.userId)) {
        this.typingUsersSignal.set([...current, data]);
      }
    });

    // User stopped typing
    this.socketService.on('user-stopped-typing', (data: { userId: number }) => {
      const current = this.typingUsersSignal();
      this.typingUsersSignal.set(current.filter(u => u.userId !== data.userId));
    });
  }

  async loadMessages(roomId: number, limit = 50, offset = 0): Promise<Message[]> {
    const response = await fetch(`${API_URL}/${roomId}?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to load messages');
    }

    const data = await response.json();
    this.messagesSignal.set(data.messages);
    return data.messages;
  }

  sendMessage(roomId: number, content: string): void {
    this.socketService.emit('send-message', { roomId, content });
  }

  startTyping(roomId: number): void {
    this.socketService.emit('typing-start', { roomId });
  }

  stopTyping(roomId: number): void {
    this.socketService.emit('typing-stop', { roomId });
  }

  clearMessages(): void {
    this.messagesSignal.set([]);
    this.typingUsersSignal.set([]);
  }
}
