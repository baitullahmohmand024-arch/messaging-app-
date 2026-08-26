export type MessageType = 'text' | 'image' | 'video' | 'audio';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  createdAt: number;
  lastSeen: number;
  isOnline: boolean;
  activeConnectionId?: string | null;
  customStatus?: string;
}

export interface Invitation {
  id: string;
  token: string;
  createdBy: string;
  creatorName: string;
  creatorPhoto: string | null;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  acceptedBy?: string;
  acceptedAt?: number;
}

export interface ConnectionMemberInfo {
  uid: string;
  displayName: string;
  photoURL: string | null;
  lastSeen: number;
  isOnline: boolean;
}

export interface Connection {
  id: string;
  members: string[];
  memberDetails: Record<string, ConnectionMemberInfo>;
  createdAt: number;
  status: 'active' | 'disconnected';
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
    type: MessageType;
  };
  disconnectedBy?: string;
  disconnectedAt?: number;
}

export interface ReplyContext {
  id: string;
  text?: string;
  senderName: string;
  type: MessageType;
  mediaUrl?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string | null;
  type: MessageType;
  text?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // seconds for voice/video
  fileName?: string;
  fileSize?: number;
  createdAt: number;
  deliveredAt?: number;
  readAt?: number;
  replyTo?: ReplyContext;
  reactions?: Record<string, string[]>; // emoji -> [userId, ...]
  isDeleted?: boolean;
  isSending?: boolean; // optimistic state
}

export interface AppSettings {
  soundEnabled: boolean;
  pushNotificationsEnabled: boolean;
  hideNotificationPreview: boolean;
  themeAmbiance: 'obsidian' | 'champagne' | 'midnight';
  hapticFeedback: boolean;
}
