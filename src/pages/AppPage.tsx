import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useServers, useChannels } from '../hooks/useServers';
import ServerRail from '../components/ServerRail';
import ChannelSidebar from '../components/ChannelSidebar';
import MessageArea from '../components/MessageArea';
import {
  CreateServerModal,
  JoinServerModal,
  CreateChannelModal,
  BotTokenModal,
} from '../components/Modals';
import type { Channel } from '../types';

type ModalType = 'create-server' | 'join-server' | 'create-channel' | 'bots' | null;

export default function AppPage() {
  const { user, logout } = useAuth();
  const { servers, createServer, joinServer, leaveServer } = useServers(user?.id || null);
  const [activeServerId,  setActiveServerId]  = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);

  const { channels, createChannel } = useChannels(activeServerId);

  const activeServer  = servers.find(s => s.id === activeServerId)  || null;
  const activeChannel = channels.find(c => c.id === activeChannelId) || null;

  const handleSelectServer = (id: string) => {
    setActiveServerId(id || null);
    setActiveChannelId(null);
  };

  const handleSelectChannel = (id: string) => setActiveChannelId(id);

  // Auto-select first channel when channels load
  if (channels.length > 0 && activeServerId && !activeChannelId) {
    setActiveChannelId(channels[0].id);
  }

  const handleCreateServer = async (name: string) => {
    if (!user) return;
    const server = await createServer(name, user.id);
    if (server) { setActiveServerId(server.id); setActiveChannelId(null); }
  };

  const handleJoinServer = async (code: string): Promise<string | null> => {
    if (!user) return 'Not logged in';
    const server = await joinServer(code, user.id);
    if (!server) return 'Invalid invite code';
    setActiveServerId(server.id);
    return null;
  };

  const handleCreateChannel = async (name: string, type: 'text' | 'announcement') => {
    if (!activeServerId) return;
    const ch = await createChannel(activeServerId, name, type);
    if (ch) setActiveChannelId((ch as Channel).id);
  };

  const handleLeaveServer = async () => {
    if (!activeServerId || !user) return;
    await leaveServer(activeServerId, user.id);
    setActiveServerId(null);
    setActiveChannelId(null);
  };

  return (
    <div
      className="d-flex overflow-hidden"
      style={{ height: '100vh', background: '#0b0d14', fontFamily: "'Inter', sans-serif" }}
    >
      <ServerRail
        servers={servers}
        activeServerId={activeServerId}
        onSelectServer={handleSelectServer}
        onCreateServer={() => setModal('create-server')}
        onJoinServer={() => setModal('join-server')}
        onOpenSettings={() => logout()}
        userAvatar={user?.avatar}
        userName={user?.display_name || user?.username}
      />

      <ChannelSidebar
        server={activeServer}
        channels={channels}
        activeChannelId={activeChannelId}
        onSelectChannel={handleSelectChannel}
        onCreateChannel={() => setModal('create-channel')}
        onOpenServerSettings={() => setModal('create-server')}
        onOpenBotSettings={() => setModal('bots')}
        onLeaveServer={handleLeaveServer}
        currentUser={user}
      />

      <div className="d-flex flex-column flex-fill overflow-hidden">
        {activeServer ? (
          <MessageArea channel={activeChannel} currentUser={user} />
        ) : (
          <HomeScreen
            userName={user?.display_name || user?.username || ''}
            onJoin={() => setModal('join-server')}
            onCreate={() => setModal('create-server')}
          />
        )}
      </div>

      {modal === 'create-server' && (
        <CreateServerModal onClose={() => setModal(null)} onCreate={handleCreateServer} />
      )}
      {modal === 'join-server' && (
        <JoinServerModal onClose={() => setModal(null)} onJoin={handleJoinServer} />
      )}
      {modal === 'create-channel' && (
        <CreateChannelModal onClose={() => setModal(null)} onCreate={handleCreateChannel} />
      )}
      {modal === 'bots' && activeServerId && user && (
        <BotTokenModal serverId={activeServerId} userId={user.id} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function HomeScreen({ userName, onJoin, onCreate }: {
  userName: string; onJoin: () => void; onCreate: () => void;
}) {
  return (
    <div
      className="d-flex align-items-center justify-content-center flex-fill p-5"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1f3a 0%, #0b0d14 60%)' }}
    >
      <div className="text-center" style={{ maxWidth: 480 }}>
        <div
          className="d-flex align-items-center justify-content-center mx-auto mb-4"
          style={{
            width: 80, height: 80, borderRadius: 24, fontSize: 36,
            background: 'linear-gradient(135deg, #5865F2, #8b5cf6)',
            boxShadow: '0 16px 48px rgba(88,101,242,0.4)',
          }}
        >
          ✦
        </div>
        <h1 className="fw-bold mb-3" style={{ color: '#e5e7eb', fontSize: 28 }}>
          Welcome back, {userName}!
        </h1>
        <p className="mb-4" style={{ color: '#6b7280', fontSize: 16, lineHeight: 1.6 }}>
          Join a server or create your own to start chatting.
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <button
            onClick={onCreate}
            className="border-0 fw-semibold"
            style={{
              background: 'linear-gradient(135deg, #5865F2, #7c3aed)',
              borderRadius: 10, padding: '12px 24px', color: '#fff',
              fontSize: 15, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(88,101,242,0.4)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Create a Server
          </button>
          <button
            onClick={onJoin}
            className="fw-semibold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '12px 24px',
              color: '#e5e7eb', fontSize: 15, cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Join with Code
          </button>
        </div>
      </div>
    </div>
  );
}
