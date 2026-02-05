import { User } from './user.model';

export interface Room {
  id: number;
  name: string;
  code: string;
  created_by: number;
  creator_name?: string;
  is_private: boolean;
  max_participants: number;
  created_at: string;
  participant_count?: number;
  participants?: Participant[];
}

export interface Participant {
  id: number;
  username: string;
  avatar_url?: string;
  is_online?: boolean;
  joined_at?: string;
}

export interface CreateRoomRequest {
  name: string;
  isPrivate?: boolean;
  maxParticipants?: number;
}

export interface JoinRoomRequest {
  code: string;
}
