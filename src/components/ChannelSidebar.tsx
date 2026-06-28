import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { Hash, Megaphone, Plus, Settings, ChevronDown, Bot, LogOut } from 'lucide-react';
import type { Channel, Server, User } from '../types';

interface Props {
  server: Server | null;
  channels: Channel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  onOpenServerSettings: () => void;
  onOpenBotSettings: () => void;
  onLeaveServer: () => void;
  currentUser: User | null;
}

export default function ChannelSidebar({
  server, channels, activeChannelId,
  onSelectChannel, onCreateChannel,
  onOpenServerSettings, onOpenBotSettings,
  onLeaveServer, currentUser,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner = server?.owner_id === currentUser?.id;

  if (!server) {
    return (
      <div
        className="d-flex flex-column p-3"
        style={{
          width: 240, minWidth: 240,
          background: '#0f1117',
          borderRight: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <p style={{ color: '#6b7280', fontSize: 14 }}>Select a server</p>
      </div>
    );
  }

  const textChannels         = channels.filter(c => c.type === 'text');
  const announcementChannels = channels.filter(c => c.type === 'announcement');

  return (
    <div
      className="d-flex flex-column"
      style={{
        width: 240, minWidth: 240,
        background: '#0f1117',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Server header / dropdown toggle */}
      <Dropdown show={menuOpen} onToggle={val => setMenuOpen(val)}>
        <Dropdown.Toggle
          as="div"
          className="d-flex align-items-center justify-content-between px-3 py-3"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            background: menuOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
            transition: 'background 0.2s',
            userSelect: 'none',
          }}
        >
          <span
            className="fw-bold text-truncate"
            style={{ color: '#e5e7eb', fontSize: 15 }}
          >
            {server.name}
          </span>
          <ChevronDown
            size={16}
            color="#9ca3af"
            style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
          />
        </Dropdown.Toggle>

        <Dropdown.Menu
          className="w-100 border-0 rounded-0 p-1"
          style={{
            background: '#18191c',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            boxShadow: 'none',
            position: 'static',
            transform: 'none',
          }}
        >
          <DropItem icon={<Settings size={15} />} label="Server Settings" onClick={() => { onOpenServerSettings(); setMenuOpen(false); }} />
          <DropItem icon={<Bot size={15} />}      label="Bot Tokens"      onClick={() => { onOpenBotSettings(); setMenuOpen(false); }} />
          <Dropdown.Divider style={{ borderColor: 'rgba(255,255,255,0.06)' }} />
          <DropItem
            icon={<LogOut size={15} />}
            label={isOwner ? 'Delete Server' : 'Leave Server'}
            onClick={() => { onLeaveServer(); setMenuOpen(false); }}
            danger
          />
          <p
            className="mb-1 px-2"
            style={{ color: '#6b7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
          >
            Invite: {server.invite_code}
          </p>
        </Dropdown.Menu>
      </Dropdown>

      {/* Channel list */}
      <div className="flex-fill overflow-y-auto py-2">
        {announcementChannels.length > 0 && (
          <ChannelGroup
            label="Announcements"
            channels={announcementChannels}
            activeChannelId={activeChannelId}
            onSelect={onSelectChannel}
          />
        )}
        <ChannelGroup
          label="Text Channels"
          channels={textChannels}
          activeChannelId={activeChannelId}
          onSelect={onSelectChannel}
          onAdd={isOwner ? onCreateChannel : undefined}
        />
      </div>

      {/* User footer */}
      {currentUser && (
        <div
          className="d-flex align-items-center gap-2 px-3 py-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0b0d14' }}
        >
          <div
            className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
            style={{
              width: 32, height: 32, borderRadius: 16,
              background: 'linear-gradient(135deg, #5865F2, #7c3aed)',
              color: '#fff', fontSize: 13,
            }}
          >
            {(currentUser.display_name || currentUser.username).charAt(0).toUpperCase()}
          </div>
          <div className="flex-fill overflow-hidden">
            <div
              className="fw-semibold text-truncate"
              style={{ color: '#e5e7eb', fontSize: 13 }}
            >
              {currentUser.display_name || currentUser.username}
            </div>
            <div style={{ color: '#6b7280', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
              #{currentUser.username}
            </div>
          </div>
          <div
            className="flex-shrink-0 rounded-circle"
            style={{ width: 8, height: 8, background: '#3ba55c' }}
          />
        </div>
      )}
    </div>
  );
}

function ChannelGroup({ label, channels, activeChannelId, onSelect, onAdd }: {
  label: string; channels: Channel[];
  activeChannelId: string | null; onSelect: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="mb-2">
      <div
        className="d-flex align-items-center justify-content-between"
        style={{ padding: '4px 8px 2px 16px' }}
      >
        <span
          className="fw-bold text-uppercase"
          style={{ color: '#6b7280', fontSize: 11, letterSpacing: '0.06em' }}
        >
          {label}
        </span>
        {onAdd && (
          <button
            onClick={onAdd}
            className="border-0 d-flex align-items-center p-1 rounded-1"
            style={{ background: 'none', cursor: 'pointer', color: '#6b7280', transition: 'color 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {channels.map(ch => (
        <ChannelRow key={ch.id} channel={ch} active={activeChannelId === ch.id} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ChannelRow({ channel, active, onSelect }: {
  channel: Channel; active: boolean; onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => onSelect(channel.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-100 d-flex align-items-center gap-2 border-0 text-start"
      style={{
        padding: '6px 8px 6px 16px', marginRight: 8,
        background: active ? 'rgba(88,101,242,0.2)' : hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        borderRadius: '0 8px 8px 0',
        cursor: 'pointer', transition: 'background 0.15s',
        fontFamily: 'inherit',
      }}
    >
      {channel.type === 'announcement'
        ? <Megaphone size={15} color={active ? '#5865F2' : '#6b7280'} />
        : <Hash      size={15} color={active ? '#5865F2' : '#6b7280'} />
      }
      <span
        className="text-truncate"
        style={{
          color: active ? '#e5e7eb' : hovered ? '#c4c9d4' : '#6b7280',
          fontSize: 14, fontWeight: active ? 600 : 400,
          fontFamily: "'JetBrains Mono', monospace",
          transition: 'color 0.15s',
        }}
      >
        {channel.name}
      </span>
    </button>
  );
}

function DropItem({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-100 d-flex align-items-center gap-2 border-0 text-start rounded-2"
      style={{
        padding: '8px 10px',
        background: hov ? (danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)') : 'transparent',
        cursor: 'pointer',
        color: danger ? (hov ? '#f87171' : '#ef4444') : (hov ? '#e5e7eb' : '#9ca3af'),
        fontSize: 13, fontWeight: 500,
        transition: 'all 0.15s',
        fontFamily: 'inherit',
      }}
    >
      {icon} {label}
    </button>
  );
}
