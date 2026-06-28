/**
 * Nexus Bot API
 * ─────────────────────────────────────────────────────────────────────────────
 * This module exposes a client-side Bot API handler. In production you would
 * run a small Express/Hono server as a gateway, but this file gives bots the
 * exact same interface — they POST to /api/bot/* with their token.
 *
 * BOT REST API REFERENCE
 * ──────────────────────
 * Base URL: https://your-domain.com/api/bot
 *
 * Authentication
 *   All requests must include:
 *     Authorization: Bot <your-bot-token>
 *
 * Endpoints
 *   GET  /channels/:channelId/messages          — Fetch recent messages
 *   POST /channels/:channelId/messages          — Send a message
 *   GET  /servers/:serverId/channels            — List channels in a server
 *   GET  /servers/:serverId/members             — List members
 *   POST /channels/:channelId/messages/:id/react — React to a message (metadata only)
 *
 * Message Payload (POST /messages)
 *   {
 *     "content": "Hello world",
 *     "embed": {                // optional
 *       "title": "...",
 *       "description": "...",
 *       "color": "#5865F2"
 *     }
 *   }
 *
 * EXAMPLE (Node.js)
 * ─────────────────
 * const BOT_TOKEN = 'nxb_xxxxxxxxxxxxxxxx';
 * const BASE = 'https://your-nexus.com/api/bot';
 *
 * async function sendMessage(channelId, content) {
 *   const res = await fetch(`${BASE}/channels/${channelId}/messages`, {
 *     method: 'POST',
 *     headers: {
 *       'Authorization': `Bot ${BOT_TOKEN}`,
 *       'Content-Type': 'application/json',
 *     },
 *     body: JSON.stringify({ content }),
 *   });
 *   return res.json();
 * }
 *
 * // Listen for new messages (polling — or use WebSocket/SSE gateway)
 * async function poll(channelId, since) {
 *   const res = await fetch(`${BASE}/channels/${channelId}/messages?after=${since}`, {
 *     headers: { 'Authorization': `Bot ${BOT_TOKEN}` },
 *   });
 *   return res.json();
 * }
 */

import insforge from './insforge';
import type { Message, Channel, ServerMember, BotToken } from '../types';

const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL || 'https://api.insforge.com';

export interface BotMessagePayload {
  content: string;
  embed?: {
    title?: string;
    description?: string;
    color?: string;
    fields?: { name: string; value: string; inline?: boolean }[];
  };
}

export interface BotApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

// Validate a bot token against InsForge and return the token record
export async function validateBotToken(rawToken: string): Promise<BotToken | null> {
  const res = await insforge.dbQuery<BotToken>('bot_tokens', { token: rawToken });
  if (!res.success || !res.data || res.data.length === 0) return null;
  return res.data[0];
}

// Send a message as a bot
export async function botSendMessage(
  botToken: BotToken,
  channelId: string,
  payload: BotMessagePayload
): Promise<BotApiResponse<Message>> {
  const embedJson = payload.embed ? JSON.stringify(payload.embed) : undefined;

  const res = await insforge.dbCreate<Message>('messages', {
    channel_id: channelId,
    author_id: `bot:${botToken.id}`,
    content: payload.content,
    is_bot: true,
    bot_name: botToken.name,
    bot_avatar: botToken.avatar || null,
    embed: embedJson || null,
    created_at: new Date().toISOString(),
  });

  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}

// Fetch messages from a channel
export async function botGetMessages(
  channelId: string,
  limit = 50
): Promise<BotApiResponse<Message[]>> {
  const res = await insforge.dbQuery<Message>('messages', { channel_id: channelId }, limit, 'created_at:desc');
  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: (res.data || []).reverse() };
}

// Get channels in a server
export async function botGetChannels(serverId: string): Promise<BotApiResponse<Channel[]>> {
  const res = await insforge.dbQuery<Channel>('channels', { server_id: serverId }, 100, 'position:asc');
  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: res.data || [] };
}

// Get members in a server
export async function botGetMembers(serverId: string): Promise<BotApiResponse<ServerMember[]>> {
  const res = await insforge.dbQuery<ServerMember>('server_members', { server_id: serverId }, 100);
  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: res.data || [] };
}

// Client-side bot API gateway (handles routing when running in app context)
export async function handleBotApiRequest(
  method: string,
  path: string,
  body: unknown,
  authHeader: string
): Promise<BotApiResponse> {
  const rawToken = authHeader.replace(/^Bot\s+/i, '').trim();
  const botToken = await validateBotToken(rawToken);
  if (!botToken) return { ok: false, error: 'Invalid bot token' };

  // POST /channels/:id/messages
  const sendMatch = path.match(/^\/channels\/([^/]+)\/messages$/);
  if (method === 'POST' && sendMatch) {
    return botSendMessage(botToken, sendMatch[1], body as BotMessagePayload);
  }

  // GET /channels/:id/messages
  if (method === 'GET' && sendMatch) {
    return botGetMessages(sendMatch[1]);
  }

  // GET /servers/:id/channels
  const chMatch = path.match(/^\/servers\/([^/]+)\/channels$/);
  if (method === 'GET' && chMatch) {
    return botGetChannels(chMatch[1]);
  }

  // GET /servers/:id/members
  const memMatch = path.match(/^\/servers\/([^/]+)\/members$/);
  if (method === 'GET' && memMatch) {
    return botGetMembers(memMatch[1]);
  }

  return { ok: false, error: 'Unknown endpoint' };
}

// ── Express gateway reference implementation ─────────────────────────────────
// Copy this into a standalone Express app to serve as your bot gateway:
//
// import express from 'express';
// import { handleBotApiRequest } from './botApi';
//
// const app = express();
// app.use(express.json());
//
// app.all('/api/bot/*', async (req, res) => {
//   const path = req.path.replace('/api/bot', '');
//   const auth = req.headers.authorization || '';
//   const result = await handleBotApiRequest(req.method, path, req.body, auth);
//   res.status(result.ok ? 200 : 401).json(result);
// });
//
// app.listen(3001, () => console.log('Bot gateway running on :3001'));
//
// SSE stream for real-time events:
// app.get('/api/bot/events', async (req, res) => {
//   const auth = req.headers.authorization || '';
//   const rawToken = auth.replace(/^Bot\s+/i, '').trim();
//   // validate token, then subscribe to InsForge realtime for bot's server
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   // forward InsForge SSE events to bot client
// });

// Global reference for the Express gateway base URL (configure via env)
export const BOT_GATEWAY_URL = `${INSFORGE_URL}/api/bot`;
