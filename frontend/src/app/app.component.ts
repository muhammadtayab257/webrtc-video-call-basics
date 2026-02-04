import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';

/**
 * Simple Video Call Component
 * - Connects to signaling server via Socket.IO
 * - Establishes WebRTC peer connection
 * - Displays local and remote video streams
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  // ============================================
  // VIEW REFERENCES
  // ============================================
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  // ============================================
  // COMPONENT STATE
  // ============================================
  joinCode: string = '';                    // User input for join code
  statusMessage: string = 'Enter join code to start';
  errorMessage: string = '';
  isJoined: boolean = false;                // Has user joined the call?
  isCallStarted: boolean = false;           // Is WebRTC call active?
  isWaiting: boolean = false;               // Waiting for other user?
  remoteUserConnected: boolean = false;     // Is remote user connected?

  // ============================================
  // SOCKET.IO & WEBRTC OBJECTS
  // ============================================
  private socket!: Socket;
  private peerConnection!: RTCPeerConnection;
  private localStream!: MediaStream;

  // ============================================
  // WEBRTC CONFIGURATION
  // Using public STUN servers only
  // ============================================
  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ]
  };

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================
  ngOnInit(): void {
    // Initialize Socket.IO connection to signaling server
    this.initializeSocket();
  }

  ngOnDestroy(): void {
    // Cleanup when component is destroyed
    this.cleanup();
  }

  // ============================================
  // SOCKET.IO INITIALIZATION
  // ============================================
  private initializeSocket(): void {
    // Connect to the signaling server
    // Uses current page URL (works for both localhost and production)
    this.socket = io();

    // -----------------------------------------
    // Handle successful connection
    // -----------------------------------------
    this.socket.on('connect', () => {
      console.log('[SOCKET] Connected to signaling server');
      this.statusMessage = 'Connected to server. Enter join code.';
    });

    // -----------------------------------------
    // Handle join success
    // -----------------------------------------
    this.socket.on('join-success', (data: any) => {
      console.log('[SOCKET] Join success:', data);
      this.isJoined = true;
      this.errorMessage = '';
      this.statusMessage = 'Joined successfully!';
    });

    // -----------------------------------------
    // Handle join error
    // -----------------------------------------
    this.socket.on('join-error', (message: string) => {
      console.log('[SOCKET] Join error:', message);
      this.errorMessage = message;
      this.isJoined = false;
    });

    // -----------------------------------------
    // Handle waiting for another user
    // -----------------------------------------
    this.socket.on('waiting', (message: string) => {
      console.log('[SOCKET] Waiting:', message);
      this.isWaiting = true;
      this.statusMessage = message;
    });

    // -----------------------------------------
    // Handle ready to call (2 users connected)
    // -----------------------------------------
    this.socket.on('ready-to-call', (data: any) => {
      console.log('[SOCKET] Ready to call:', data);
      this.isWaiting = false;
      this.remoteUserConnected = true;
      this.statusMessage = 'Another user joined! Click "Start Call" to begin.';
    });

    // -----------------------------------------
    // Handle incoming WebRTC offer
    // This is received by the SECOND user
    // -----------------------------------------
    this.socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
      console.log('[WEBRTC] Received offer');
      await this.handleOffer(offer);
    });

    // -----------------------------------------
    // Handle incoming WebRTC answer
    // This is received by the FIRST user
    // -----------------------------------------
    this.socket.on('answer', async (answer: RTCSessionDescriptionInit) => {
      console.log('[WEBRTC] Received answer');
      await this.handleAnswer(answer);
    });

    // -----------------------------------------
    // Handle incoming ICE candidate
    // -----------------------------------------
    this.socket.on('ice-candidate', async (candidate: RTCIceCandidateInit) => {
      console.log('[WEBRTC] Received ICE candidate');
      await this.handleIceCandidate(candidate);
    });

    // -----------------------------------------
    // Handle user left
    // -----------------------------------------
    this.socket.on('user-left', (message: string) => {
      console.log('[SOCKET] User left:', message);
      this.statusMessage = message;
      this.remoteUserConnected = false;
      this.isCallStarted = false;
      this.isWaiting = true;
      // Close peer connection
      this.closePeerConnection();
    });

    // -----------------------------------------
    // Handle disconnection
    // -----------------------------------------
    this.socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected from server');
      this.statusMessage = 'Disconnected from server';
      this.cleanup();
    });
  }

  // ============================================
  // USER ACTIONS
  // ============================================

  /**
   * Join the call with the entered code
   */
  joinCall(): void {
    if (!this.joinCode.trim()) {
      this.errorMessage = 'Please enter a join code';
      return;
    }

    console.log('[ACTION] Joining call with code:', this.joinCode);
    this.errorMessage = '';
    this.statusMessage = 'Joining...';

    // Send join request to server
    this.socket.emit('join-call', this.joinCode.toUpperCase());
  }

  /**
   * Start the video call
   * This initiates the WebRTC connection
   */
  async startCall(): Promise<void> {
    console.log('[ACTION] Starting call...');
    this.statusMessage = 'Starting call...';

    try {
      // Step 1: Get user's camera and microphone
      await this.getLocalMedia();

      // Step 2: Create peer connection
      this.createPeerConnection();

      // Step 3: Create and send offer
      await this.createAndSendOffer();

      this.isCallStarted = true;
      this.statusMessage = 'Call started! Connecting...';
    } catch (error) {
      console.error('[ERROR] Failed to start call:', error);
      this.errorMessage = 'Failed to start call. Check camera permissions.';
    }
  }

  /**
   * End the current call
   */
  endCall(): void {
    console.log('[ACTION] Ending call...');

    // Notify server
    this.socket.emit('leave-call');

    // Cleanup local resources
    this.cleanup();

    // Reset state
    this.isJoined = false;
    this.isCallStarted = false;
    this.isWaiting = false;
    this.remoteUserConnected = false;
    this.joinCode = '';
    this.statusMessage = 'Call ended. Enter code to join again.';
    this.errorMessage = '';
  }

  // ============================================
  // WEBRTC METHODS
  // ============================================

  /**
   * Get local media (camera + microphone)
   */
  private async getLocalMedia(): Promise<void> {
    console.log('[WEBRTC] Getting local media...');

    // Request camera and microphone access
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    // Display local video (muted to prevent echo)
    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = this.localStream;
    }

    console.log('[WEBRTC] Local media obtained');
  }

  /**
   * Create WebRTC peer connection
   */
  private createPeerConnection(): void {
    console.log('[WEBRTC] Creating peer connection...');

    // Create new RTCPeerConnection with STUN servers
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    // -----------------------------------------
    // Add local tracks to the connection
    // This sends our video/audio to the remote peer
    // -----------------------------------------
    this.localStream.getTracks().forEach(track => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    // -----------------------------------------
    // Handle ICE candidates
    // ICE = Interactive Connectivity Establishment
    // These are potential network paths to the remote peer
    // -----------------------------------------
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WEBRTC] Sending ICE candidate');
        this.socket.emit('ice-candidate', event.candidate);
      }
    };

    // -----------------------------------------
    // Handle incoming remote tracks
    // This is the remote user's video/audio
    // -----------------------------------------
    this.peerConnection.ontrack = (event) => {
      console.log('[WEBRTC] Received remote track');
      if (this.remoteVideo?.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = event.streams[0];
      }
      this.statusMessage = 'Connected! Video call in progress.';
    };

    // -----------------------------------------
    // Handle connection state changes
    // -----------------------------------------
    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WEBRTC] Connection state:', this.peerConnection.connectionState);

      switch (this.peerConnection.connectionState) {
        case 'connected':
          this.statusMessage = 'Connected! Video call in progress.';
          break;
        case 'disconnected':
        case 'failed':
          this.statusMessage = 'Connection lost';
          break;
      }
    };

    // -----------------------------------------
    // Handle ICE connection state changes
    // -----------------------------------------
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WEBRTC] ICE state:', this.peerConnection.iceConnectionState);
    };

    console.log('[WEBRTC] Peer connection created');
  }

  /**
   * Create and send WebRTC offer
   * This is called by the user who clicks "Start Call"
   */
  private async createAndSendOffer(): Promise<void> {
    console.log('[WEBRTC] Creating offer...');

    // Create offer
    const offer = await this.peerConnection.createOffer();

    // Set local description
    await this.peerConnection.setLocalDescription(offer);

    // Send offer to remote peer via signaling server
    this.socket.emit('offer', offer);

    console.log('[WEBRTC] Offer sent');
  }

  /**
   * Handle incoming offer from remote peer
   * This is received by the second user
   */
  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    console.log('[WEBRTC] Handling offer...');

    // Make sure we have local media
    if (!this.localStream) {
      await this.getLocalMedia();
    }

    // Create peer connection if not exists
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    // Set the remote description (the offer)
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create answer
    const answer = await this.peerConnection.createAnswer();

    // Set local description
    await this.peerConnection.setLocalDescription(answer);

    // Send answer back to the caller
    this.socket.emit('answer', answer);

    this.isCallStarted = true;
    console.log('[WEBRTC] Answer sent');
  }

  /**
   * Handle incoming answer from remote peer
   * This is received by the first user (who sent the offer)
   */
  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    console.log('[WEBRTC] Handling answer...');

    // Set the remote description (the answer)
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

    console.log('[WEBRTC] Remote description set');
  }

  /**
   * Handle incoming ICE candidate
   * ICE candidates are exchanged to establish the connection
   */
  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[WEBRTC] ICE candidate added');
      }
    } catch (error) {
      console.error('[WEBRTC] Error adding ICE candidate:', error);
    }
  }

  // ============================================
  // CLEANUP METHODS
  // ============================================

  /**
   * Close peer connection
   */
  private closePeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Clear remote video
    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
  }

  /**
   * Full cleanup of all resources
   */
  private cleanup(): void {
    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    // Clear local video
    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = null;
    }

    // Close peer connection
    this.closePeerConnection();
  }
}
