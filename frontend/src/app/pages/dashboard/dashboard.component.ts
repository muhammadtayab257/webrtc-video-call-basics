import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RoomService } from '../../services/room.service';
import { SocketService } from '../../services/socket.service';
import { Room } from '../../models/room.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  // Create room form
  showCreateModal = signal<boolean>(false);
  newRoomName = '';

  // Join room form
  joinCode = '';

  // State
  loading = signal<boolean>(false);
  error = signal<string>('');

  constructor(
    public authService: AuthService,
    public roomService: RoomService,
    private socketService: SocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Connect to socket
    this.socketService.connect();

    // Load user's rooms
    this.loadRooms();
  }

  async loadRooms(): Promise<void> {
    try {
      await this.roomService.loadRooms();
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load rooms');
    }
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.newRoomName = '';
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.newRoomName = '';
  }

  async createRoom(): Promise<void> {
    if (!this.newRoomName.trim()) {
      this.error.set('Please enter a room name');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const room = await this.roomService.createRoom({
        name: this.newRoomName.trim()
      });
      this.closeCreateModal();
      // Navigate to the new room
      this.router.navigate(['/room', room.code]);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to create room');
    } finally {
      this.loading.set(false);
    }
  }

  async joinRoom(): Promise<void> {
    if (!this.joinCode.trim()) {
      this.error.set('Please enter a room code');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      const room = await this.roomService.joinRoom(this.joinCode.trim());
      this.joinCode = '';
      // Navigate to the room
      this.router.navigate(['/room', room.code]);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to join room');
    } finally {
      this.loading.set(false);
    }
  }

  enterRoom(room: Room): void {
    this.router.navigate(['/room', room.code]);
  }

  async deleteRoom(room: Room, event: Event): Promise<void> {
    event.stopPropagation();

    if (!confirm(`Delete room "${room.name}"?`)) {
      return;
    }

    try {
      await this.roomService.deleteRoom(room.id);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to delete room');
    }
  }

  async logout(): Promise<void> {
    this.socketService.disconnect();
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
