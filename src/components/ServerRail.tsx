import { useState } from 'react';
import { Plus, Compass, Settings } from 'lucide-react';
import type { Server } from '../types';

interface Props {
  servers: Server[];
  activeServerId: string | null;
  onSelectServer: (id: string) => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
  onOpenSettings: () => void;
  userAvatar?: string;
  userName?: string;
}

export default function ServerRail({
  servers, activeServerId, onSelectServer,
  onCreateServer, onJoinServer, onOpenSettings,
  userAvatar, userName,
}: Props) {
  return (
    <div
      className="d-flex flex-column align-items-center py-3 gap-1 overflow-y-auto"
      style={{
        width: 72, minWidth: 72,
        background: '#070810',
        borderRight: '1px solid rgba(255,255,255,0.03)',
      }}
    >
      {/* Home */}
      <ServerIcon
        label="Home"
        active={!activeServerId}
        onClick={() => onSelectServer('')}
        content={<span style={{ fontSize: 22 }}>✦</span>}
        gradient="linear-gradient(135deg, #5865F2, #8b5cf6)"
      />

      {/* Divider */}
      <div className="my-1" style={{ width: 32, height: 1, background: 'rgba(255,255,255,0.07)' }} />

      {/* Servers */}
      {servers.map(server => (
        <ServerIcon
          key={server.id}
          label={server.name}
          active={activeServerId === server.id}
          onClick={() => onSelectServer(server.id)}
          content={
            server.icon
              ? <img src={server.icon} alt={server.name} className="w-100 h-100 object-fit-cover" />
              : <span className="fw-bold" style={{ fontSize: 16 }}>{server.name.charAt(0).toUpperCase()}</span>
          }
        />
      ))}

      {/* Add server */}
      <RailTooltip label="Add a Server">
        <RailIconBtn
          onClick={onCreateServer}
          hoverBg="#5865F2"
          baseBg="rgba(255,255,255,0.05)"
          style={{ border: '2px dashed rgba(88,101,242,0.4)', color: '#5865F2' }}
        >
          <Plus size={20} />
        </RailIconBtn>
      </RailTooltip>

      {/* Join server */}
      <RailTooltip label="Join Server">
        <RailIconBtn onClick={onJoinServer} hoverBg="#3ba55c" baseBg="rgba(255,255,255,0.05)">
          <Compass size={20} />
        </RailIconBtn>
      </RailTooltip>

      {/* Spacer */}
      <div className="flex-fill" />

      {/* User avatar */}
      <RailTooltip label={userName || 'Me'}>
        <RailIconBtn
          onClick={onOpenSettings}
          hoverBg="rgba(255,255,255,0.15)"
          baseBg={userAvatar ? 'transparent' : 'linear-gradient(135deg, #5865F2, #7c3aed)'}
          style={{ overflow: 'hidden' }}
        >
          {userAvatar
            ? <img src={userAvatar} alt="me" className="w-100 h-100 object-fit-cover" />
            : <span className="fw-bold" style={{ fontSize: 16 }}>{(userName || 'U').charAt(0).toUpperCase()}</span>
          }
        </RailIconBtn>
      </RailTooltip>

      {/* Settings */}
      <RailTooltip label="Settings">
        <button
          onClick={onOpenSettings}
          className="d-flex align-items-center justify-content-center border-0"
          style={{
            width: 40, height: 40, borderRadius: 20,
            background: 'transparent', cursor: 'pointer',
            color: '#6b7280', transition: 'color 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
        >
          <Settings size={18} />
        </button>
      </RailTooltip>
    </div>
  );
}

/* ── Server icon pill ── */
function ServerIcon({ label, active, onClick, content, gradient }: {
  label: string; active: boolean; onClick: () => void;
  content: React.ReactNode; gradient?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const pill = active || hovered;

  return (
    <div className="position-relative d-flex align-items-center">
      {/* Active pill */}
      <div
        className="position-absolute"
        style={{
          left: -4, width: 4,
          height: active ? 40 : hovered ? 20 : 0,
          background: '#fff', borderRadius: '0 4px 4px 0',
          transition: 'height 0.2s',
        }}
      />
      <RailTooltip label={label}>
        <button
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="d-flex align-items-center justify-content-center border-0"
          style={{
            width: 48, height: 48,
            borderRadius: pill ? 16 : 24,
            background: active
              ? (gradient || '#5865F2')
              : hovered
                ? (gradient || 'rgba(88,101,242,0.3)')
                : 'rgba(255,255,255,0.06)',
            cursor: 'pointer', color: '#fff', overflow: 'hidden',
            transition: 'border-radius 0.2s, background 0.2s',
            boxShadow: active ? '0 4px 20px rgba(88,101,242,0.4)' : 'none',
            fontFamily: 'inherit',
          }}
        >
          {content}
        </button>
      </RailTooltip>
    </div>
  );
}

/* ── Generic rail icon button ── */
function RailIconBtn({ children, onClick, hoverBg, baseBg, style = {} }: {
  children: React.ReactNode;
  onClick: () => void;
  hoverBg: string;
  baseBg: string;
  style?: React.CSSProperties;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="d-flex align-items-center justify-content-center border-0"
      style={{
        width: 48, height: 48,
        borderRadius: hov ? 16 : 24,
        background: hov ? hoverBg : baseBg,
        cursor: 'pointer', color: hov ? '#fff' : '#9ca3af',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* ── Tooltip ── */
function RailTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="position-relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="position-absolute fw-semibold"
          style={{
            left: '100%', top: '50%', transform: 'translateY(-50%)',
            marginLeft: 12, padding: '6px 12px',
            background: '#18191c', color: '#fff',
            borderRadius: 6, fontSize: 13,
            whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            zIndex: 1000,
          }}
        >
          {label}
          <div
            className="position-absolute"
            style={{
              right: '100%', top: '50%', transform: 'translateY(-50%)',
              border: '5px solid transparent',
              borderRightColor: '#18191c',
            }}
          />
        </div>
      )}
    </div>
  );
}
