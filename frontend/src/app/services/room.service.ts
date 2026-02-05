import { Injectable, signal } from '@angular/core';
import { Room, CreateRoomRequest, Participant } from '../models/room.model';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';

const API_URL = '/api/rooms';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private roomsSignal = signal<Room[]>([]);
  private currentRoomSignal = signal<Room | null>(null);
  private participantsSignal = signal<Participant[]>([]);

  rooms = this.roomsSignal.asReadonly();
  currentRoom = this.currentRoomSignal.asReadonly();
  participants = this.participantsSignal.asReadonly();

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
    // Room joined
    this.socketService.on('room-joined', (data: { room: Room; participants: Participant[] }) => {
      this.currentRoomSignal.set(data.room);
      this.participantsSignal.set(data.participants);
    });

    // User joined room
    this.socketService.on('user-joined', (user: Participant) => {
      const current = this.participantsSignal();
      if (!current.find(p => p.id === user.id)) {
        this.participantsSignal.set([...current, user]);
      }
    });

    // User left room
    this.socketService.on('user-left', (data: { userId: number }) => {
      const current = this.participantsSignal();
      this.participantsSignal.set(current.filter(p => p.id !== data.userId));
    });

    // Room error
    this.socketService.on('room-error', (error: string) => {
      console.error('[ROOM] Error:', error);
    });
  }

  async loadRooms(): Promise<Room[]> {
    const response = await fetch(API_URL, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to load rooms');
    }

    const data = await response.json();
    this.roomsSignal.set(data.rooms);
    return data.rooms;
  }

  async createRoom(request: CreateRoomRequest): Promise<Room> {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create room');
    }

    const data = await response.json();
    const rooms = this.roomsSignal();
    this.roomsSignal.set([data.room, ...rooms]);
    return data.room;
  }

  async getRoomByCode(code: string): Promise<Room> {
    const response = await fetch(`${API_URL}/${code.toUpperCase()}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Room not found');
    }

    const data = await response.json();
    return data.room;
  }

  async joinRoom(code: string): Promise<Room> {
    const response = await fetch(`${API_URL}/join`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code: code.toUpperCase() })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join room');
    }

    const data = await response.json();

    // Add to rooms list if not already there
    const rooms = this.roomsSignal();
    if (!rooms.find(r => r.id === data.room.id)) {
      this.roomsSignal.set([data.room, ...rooms]);
    }

    return data.room;
  }

  // Socket-based room join (for real-time updates)
  joinRoomSocket(code: string): void {
    this.socketService.emit('join-room', code);
  }

  leaveRoomSocket(code: string): void {
    this.socketService.emit('leave-room', code);
    this.currentRoomSignal.set(null);
    this.participantsSignal.set([]);
  }

  async deleteRoom(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete room');
    }

    const rooms = this.roomsSignal();
    this.roomsSignal.set(rooms.filter(r => r.id !== id));
  }

  setCurrentRoom(room: Room | null): void {
    this.currentRoomSignal.set(room);
  }

  updateParticipants(participants: Participant[]): void {
    this.participantsSignal.set(participants);
  }
}
