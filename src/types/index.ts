export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar?: string;       // profile picture URL/data URI stored in DB
  status: 'online' | 'idle' | 'dnd' | 'offline';
  created_at: string;
}

export interface Server {
  id: string;
  name: string;
  icon?: string;         // server icon URL/data URI
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export type Permission =
  | 'MANAGE_SERVER'
  | 'MANAGE_CHANNELS'
  | 'MANAGE_ROLES'
  | 'MANAGE_MEMBERS'
  | 'CREATE_INVITES'
  | 'SEND_MESSAGES'
  | 'READ_MESSAGES'
  | 'MANAGE_MESSAGES'
  | 'MENTION_EVERYONE'
  | 'MANAGE_BOTS';

export interface Role {
  id: string;
  server_id: string;
  name: string;
  color?: string;
  position: number;
  permissions: Permission[];
  is_default: boolean;
  created_at: string;
}

export interface ChannelPermissionOverride {
  id?: string;
  channel_id: string;
  role_id: string;
  allow: Permission[];
  deny: Permission[];
}

export interface ServerMember {
  server_id: string;
  user_id: string;
  role_id?: string;
  joined_at: string;
  user?: User;
}

export interface Channel {
  id: string;
  server_id: string;
  name: string;
  type: 'text' | 'announcement' | 'dm';
  topic?: string;
  position: number;
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  edited_at?: string;
  created_at: string;
  author?: User;
  bot_name?: string;
  bot_avatar?: string;
  is_bot?: boolean;
  embed?: string | null;
}

export interface DmChannel {
  id: string;
  participant_ids: string[];
  created_at: string;
  other_user?: User;     // hydrated by the API
}

export interface DirectMessage {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  edited_at?: string;
  created_at: string;
  author?: User;
}

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at?: string;
}

export interface FriendEntry {
  request: FriendRequest;
  user: User;
}

export interface BotToken {
  id: string;
  server_id: string;
  name: string;
  avatar?: string;
  token: string;
  created_by: string;
  created_at: string;
}

export interface InsForgeSession {
  user_id: string;
  token: string;
}
