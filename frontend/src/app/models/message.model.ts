export interface Message {
  id: number;
  room_id: number;
  user_id: number | null;
  username?: string;
  avatar_url?: string;
  content: string;
  message_type: 'text' | 'system' | 'file';
  created_at: string;
}

export interface SendMessageRequest {
  roomId: number;
  content: string;
}
