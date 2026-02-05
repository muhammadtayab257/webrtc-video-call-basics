import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RoomService } from '../../services/room.service';
import { ChatService } from '../../services/chat.service';
import { SocketService } from '../../services/socket.service';
import { WebRTCService } from '../../services/webrtc.service';
import { Room } from '../../models/room.model';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('chatMessages') chatMessagesRef!: ElementRef<HTMLDivElement>;

  room = signal<Room | null>(null);
  messageText = '';
  showChat = signal<boolean>(true);
  loading = signal<boolean>(true);
  error = signal<string>('');

  private roomCode: string = '';

  constructor(
    public authService: AuthService,
    public roomService: RoomService,
    public chatService: ChatService,
    public socketService: SocketService,
    public webrtcService: WebRTCService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Effect to handle local video stream
    effect(() => {
      const stream = this.webrtcService.localStream();
      if (stream && this.localVideoRef?.nativeElement) {
        this.localVideoRef.nativeElement.srcObject = stream;
      }
    });

    // Effect to scroll chat to bottom on new messages
    effect(() => {
      const messages = this.chatService.messages();
      if (messages.length > 0) {
        setTimeout(() => this.scrollChatToBottom(), 100);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.roomCode = this.route.snapshot.params['code'];

    if (!this.roomCode) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Ensure socket is connected
    if (!this.socketService.isConnected()) {
      this.socketService.connect();
    }

    await this.loadRoom();
  }

  ngOnDestroy(): void {
    // Leave room
    if (this.roomCode) {
      this.roomService.leaveRoomSocket(this.roomCode);
    }

    // End call if active
    if (this.webrtcService.isInCall()) {
      this.webrtcService.endCall();
    }

    // Clear chat
    this.chatService.clearMessages();
  }

  private async loadRoom(): Promise<void> {
    try {
      this.loading.set(true);

      // Get room details via REST
      const room = await this.roomService.getRoomByCode(this.roomCode);
      this.room.set(room);

      // Join room via Socket
      this.roomService.joinRoomSocket(this.roomCode);

      // Load existing messages
      await this.chatService.loadMessages(room.id);

    } catch (err: any) {
      this.error.set(err.message || 'Failed to load room');
    } finally {
      this.loading.set(false);
    }
  }

  async startCall(): Promise<void> {
    const room = this.room();
    if (!room) return;

    try {
      await this.webrtcService.startCall(room.id);
    } catch (err: any) {
      this.error.set('Failed to start call. Check camera permissions.');
    }
  }

  async endCall(): Promise<void> {
    await this.webrtcService.endCall();
  }

  toggleMute(): void {
    this.webrtcService.toggleMute();
  }

  toggleVideo(): void {
    this.webrtcService.toggleVideo();
  }

  toggleChat(): void {
    this.showChat.update(v => !v);
  }

  sendMessage(): void {
    const room = this.room();
    if (!room || !this.messageText.trim()) return;

    this.chatService.sendMessage(room.id, this.messageText.trim());
    this.messageText = '';
  }

  private scrollChatToBottom(): void {
    if (this.chatMessagesRef?.nativeElement) {
      const el = this.chatMessagesRef.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

  copyRoomCode(): void {
    const room = this.room();
    if (room) {
      navigator.clipboard.writeText(room.code);
    }
  }

  leaveRoom(): void {
    this.router.navigate(['/dashboard']);
  }

  getRemoteStreams(): { socketId: string; stream: MediaStream }[] {
    const streams = this.webrtcService.remoteStreams();
    return Array.from(streams.entries()).map(([socketId, stream]) => ({
      socketId,
      stream
    }));
  }
}
