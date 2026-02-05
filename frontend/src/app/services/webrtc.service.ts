import { Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';

interface PeerConnection {
  id: string;          // Socket ID
  oderId: number;     // User ID
  username: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

@Injectable({
  providedIn: 'root'
})
export class WebRTCService {
  private localStreamSignal = signal<MediaStream | null>(null);
  private remoteStreamsSignal = signal<Map<string, MediaStream>>(new Map());
  private isInCallSignal = signal<boolean>(false);
  private isMutedSignal = signal<boolean>(false);
  private isVideoOffSignal = signal<boolean>(false);

  localStream = this.localStreamSignal.asReadonly();
  remoteStreams = this.remoteStreamsSignal.asReadonly();
  isInCall = this.isInCallSignal.asReadonly();
  isMuted = this.isMutedSignal.asReadonly();
  isVideoOff = this.isVideoOffSignal.asReadonly();

  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private currentRoomId: number | null = null;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' }
    ]
  };

  constructor(private socketService: SocketService) {
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    // Someone joined the call
    this.socketService.on('user-joined-call', async (data: { userId: number; username: string; socketId: string }) => {
      console.log('[WEBRTC] User joined call:', data.username);
      // Create offer for the new user
      await this.createOffer(data.socketId, data.userId, data.username);
    });

    // Received offer from someone
    this.socketService.on('offer', async (data: { offer: RTCSessionDescriptionInit; fromUserId: number; fromUsername: string; fromSocketId: string; roomId: number }) => {
      console.log('[WEBRTC] Received offer from:', data.fromUsername);
      await this.handleOffer(data);
    });

    // Received answer
    this.socketService.on('answer', async (data: { answer: RTCSessionDescriptionInit; fromUserId: number; fromSocketId: string }) => {
      console.log('[WEBRTC] Received answer');
      await this.handleAnswer(data);
    });

    // Received ICE candidate
    this.socketService.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit; fromSocketId: string }) => {
      await this.handleIceCandidate(data);
    });

    // User left call
    this.socketService.on('user-left-call', (data: { userId: number; socketId: string }) => {
      console.log('[WEBRTC] User left call:', data.socketId);
      this.removePeer(data.socketId);
    });

    // User toggled media
    this.socketService.on('user-toggled-media', (data: { userId: number; mediaType: string; enabled: boolean }) => {
      console.log('[WEBRTC] User toggled:', data);
    });

    // Call joined - we get list of existing participants
    this.socketService.on('call-joined', async (data: { roomId: number; participants: { id: number; username: string; socketId: string }[] }) => {
      console.log('[WEBRTC] Joined call with participants:', data.participants.length);
      this.currentRoomId = data.roomId;
      // Existing participants will send us offers
    });
  }

  async startCall(roomId: number): Promise<void> {
    try {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      this.localStreamSignal.set(stream);
      this.currentRoomId = roomId;
      this.isInCallSignal.set(true);

      // Join call room via socket
      this.socketService.emit('join-call', { roomId });

      console.log('[WEBRTC] Started call in room:', roomId);
    } catch (error) {
      console.error('[WEBRTC] Failed to start call:', error);
      throw error;
    }
  }

  async endCall(): Promise<void> {
    // Leave call room
    if (this.currentRoomId) {
      this.socketService.emit('leave-call', { roomId: this.currentRoomId });
    }

    // Stop local stream
    const localStream = this.localStreamSignal();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Close all peer connections
    this.peerConnections.forEach((pc, socketId) => {
      pc.close();
    });

    // Clear state
    this.localStreamSignal.set(null);
    this.remoteStreamsSignal.set(new Map());
    this.peerConnections.clear();
    this.currentRoomId = null;
    this.isInCallSignal.set(false);
    this.isMutedSignal.set(false);
    this.isVideoOffSignal.set(false);

    console.log('[WEBRTC] Ended call');
  }

  private async createOffer(targetSocketId: string, userId: number, username: string): Promise<void> {
    const pc = this.createPeerConnection(targetSocketId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.socketService.emit('offer', {
      targetSocketId,
      offer,
      roomId: this.currentRoomId
    });
  }

  private async handleOffer(data: { offer: RTCSessionDescriptionInit; fromUserId: number; fromUsername: string; fromSocketId: string; roomId: number }): Promise<void> {
    const pc = this.createPeerConnection(data.fromSocketId);

    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.socketService.emit('answer', {
      targetSocketId: data.fromSocketId,
      answer,
      roomId: data.roomId
    });
  }

  private async handleAnswer(data: { answer: RTCSessionDescriptionInit; fromSocketId: string }): Promise<void> {
    const pc = this.peerConnections.get(data.fromSocketId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  }

  private async handleIceCandidate(data: { candidate: RTCIceCandidateInit; fromSocketId: string }): Promise<void> {
    const pc = this.peerConnections.get(data.fromSocketId);
    if (pc && data.candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('[WEBRTC] Error adding ICE candidate:', error);
      }
    }
  }

  private createPeerConnection(socketId: string): RTCPeerConnection {
    // Check if already exists
    let pc = this.peerConnections.get(socketId);
    if (pc) return pc;

    pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnections.set(socketId, pc);

    // Add local tracks
    const localStream = this.localStreamSignal();
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc!.addTrack(track, localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socketService.emit('ice-candidate', {
          targetSocketId: socketId,
          candidate: event.candidate,
          roomId: this.currentRoomId
        });
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log('[WEBRTC] Received remote track from:', socketId);
      const streams = this.remoteStreamsSignal();
      const newStreams = new Map(streams);
      newStreams.set(socketId, event.streams[0]);
      this.remoteStreamsSignal.set(newStreams);
    };

    // Handle connection state
    pc.onconnectionstatechange = () => {
      console.log('[WEBRTC] Connection state:', pc?.connectionState);
      if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected') {
        this.removePeer(socketId);
      }
    };

    return pc;
  }

  private removePeer(socketId: string): void {
    const pc = this.peerConnections.get(socketId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(socketId);
    }

    const streams = this.remoteStreamsSignal();
    const newStreams = new Map(streams);
    newStreams.delete(socketId);
    this.remoteStreamsSignal.set(newStreams);
  }

  toggleMute(): void {
    const localStream = this.localStreamSignal();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMutedSignal.set(!audioTrack.enabled);

        // Notify others
        this.socketService.emit('toggle-media', {
          roomId: this.currentRoomId,
          mediaType: 'audio',
          enabled: audioTrack.enabled
        });
      }
    }
  }

  toggleVideo(): void {
    const localStream = this.localStreamSignal();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isVideoOffSignal.set(!videoTrack.enabled);

        // Notify others
        this.socketService.emit('toggle-media', {
          roomId: this.currentRoomId,
          mediaType: 'video',
          enabled: videoTrack.enabled
        });
      }
    }
  }
}
