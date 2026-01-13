export interface User {
  phoneNumber: string;
  firstName: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  isPremium: boolean;
  stars: number;
  bio?: string;
  isDev?: boolean; // Developer flag
  password?: string; // For the specific admin account
  statusEmoji?: string; // Premium status emoji or custom image URL
  wallpaper?: string; // Custom background (hex or image URL)
  messagePrice?: number; // Cost in stars for others to send message to this user
}

export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; // New field to identify who gets the message
  text?: string;
  imageUrl?: string;
  timestamp: number;
  isRead: boolean;
  type: 'text' | 'image' | 'sticker' | 'system' | 'gift';
  views?: number;
  reactions?: Record<string, number>;
}

export interface Chat {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  unreadCount: number;
  isOnline?: boolean;
  type: 'private' | 'group' | 'bot' | 'channel';
  messages: Message[];
  
  // Channel/Group specific
  subscribers?: number;
  description?: string;
  isAdmin?: boolean; // Can user manage this?
  hasStarted?: boolean; // For bots
  link?: string; // t.me style link
  privacy?: 'public' | 'private';
}

export enum AppScreen {
  AUTH_PHONE = 'AUTH_PHONE',
  AUTH_LOGIN_PASSWORD = 'AUTH_LOGIN_PASSWORD', // Login existing
  AUTH_REGISTER_PROFILE = 'AUTH_REGISTER_PROFILE', // Create name
  AUTH_CREATE_PASSWORD = 'AUTH_CREATE_PASSWORD', // Create password
  MAIN_MESSENGER = 'MAIN_MESSENGER'
}

export const COUNTRY_CODES = [
  { code: '+380', country: 'Ukraine', flag: '🇺🇦' },
  { code: '+1', country: 'USA', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+48', country: 'Poland', flag: '🇵🇱' },
  { code: '+7', country: 'Kazakhstan', flag: '🇰🇿' },
];