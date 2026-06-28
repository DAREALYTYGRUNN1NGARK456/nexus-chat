import { useState, useEffect, useCallback } from 'react';
import insforge from '../lib/insforge';
import type { Server, Channel, ServerMember } from '../types';

export function useServers(userId: string | null) {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchServers = useCallback(async (uid: string) => {
    setLoading(true);
    // Get all server memberships for user
    const memberRes = await insforge.dbQuery<ServerMember>('server_members', { user_id: uid });
    if (!memberRes.success || !memberRes.data) { setLoading(false); return; }

    // Fetch each server
    const serverPromises = memberRes.data.map(m =>
      insforge.dbGet<Server>('servers', m.server_id)
    );
    const results = await Promise.all(serverPromises);
    const fetched = results.filter(r => r.success && r.data).map(r => r.data as Server);
    setServers(fetched);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userId) fetchServers(userId);
    else setServers([]);
  }, [userId, fetchServers]);

  const createServer = async (name: string, ownerId: string): Promise<Server | null> => {
    const inviteCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const res = await insforge.dbCreate<Server>('servers', {
      name,
      owner_id: ownerId,
      invite_code: inviteCode,
      created_at: new Date().toISOString(),
    });
    if (!res.success || !res.data) return null;

    const server = res.data;

    // Add owner as member
    await insforge.dbCreate('server_members', {
      server_id: server.id,
      user_id: ownerId,
      role: 'owner',
      joined_at: new Date().toISOString(),
    });

    // Create default channels
    await insforge.dbCreate('channels', {
      server_id: server.id,
      name: 'general',
      type: 'text',
      topic: 'General discussion',
      position: 0,
      created_at: new Date().toISOString(),
    });
    await insforge.dbCreate('channels', {
      server_id: server.id,
      name: 'announcements',
      type: 'announcement',
      position: 1,
      created_at: new Date().toISOString(),
    });

    setServers(prev => [...prev, server]);
    return server;
  };

  const joinServer = async (inviteCode: string, userId: string): Promise<Server | null> => {
    const res = await insforge.dbQuery<Server>('servers', { invite_code: inviteCode.toUpperCase() });
    if (!res.success || !res.data || res.data.length === 0) return null;
    const server = res.data[0];

    // Check not already a member
    const memCheck = await insforge.dbQuery<ServerMember>('server_members', {
      server_id: server.id, user_id: userId
    });
    if (memCheck.data && memCheck.data.length > 0) return server;

    await insforge.dbCreate('server_members', {
      server_id: server.id,
      user_id: userId,
      role: 'member',
      joined_at: new Date().toISOString(),
    });

    setServers(prev => [...prev, server]);
    return server;
  };

  const leaveServer = async (serverId: string, userId: string) => {
    const memRes = await insforge.dbQuery<ServerMember & { id: string }>('server_members', {
      server_id: serverId, user_id: userId
    });
    if (memRes.data && memRes.data.length > 0) {
      await insforge.dbDelete('server_members', memRes.data[0].id);
    }
    setServers(prev => prev.filter(s => s.id !== serverId));
  };

  return { servers, loading, createServer, joinServer, leaveServer, refetch: fetchServers };
}

export function useChannels(serverId: string | null) {
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    if (!serverId) { setChannels([]); return; }
    insforge.dbQuery<Channel>('channels', { server_id: serverId }, 50, 'position:asc').then(res => {
      if (res.success && res.data) setChannels(res.data);
    });
  }, [serverId]);

  const createChannel = async (serverId: string, name: string, type: 'text' | 'announcement' = 'text') => {
    const position = channels.length;
    const res = await insforge.dbCreate<Channel>('channels', {
      server_id: serverId,
      name: name.toLowerCase().replace(/\s+/g, '-'),
      type,
      position,
      created_at: new Date().toISOString(),
    });
    if (res.success && res.data) setChannels(prev => [...prev, res.data!]);
    return res.data || null;
  };

  const deleteChannel = async (channelId: string) => {
    await insforge.dbDelete('channels', channelId);
    setChannels(prev => prev.filter(c => c.id !== channelId));
  };

  return { channels, createChannel, deleteChannel };
}

export function useMembers(serverId: string | null) {
  const [members, setMembers] = useState<ServerMember[]>([]);

  useEffect(() => {
    if (!serverId) { setMembers([]); return; }
    insforge.dbQuery<ServerMember>('server_members', { server_id: serverId }, 200).then(res => {
      if (res.success && res.data) setMembers(res.data);
    });
  }, [serverId]);

  return { members };
}
