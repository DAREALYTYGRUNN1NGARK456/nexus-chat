import { useState, useEffect, useRef, FormEvent } from 'react';
import { Spinner } from 'react-bootstrap';
import { Send, Hash, Megaphone, Edit2, Trash2, Check, X, Bot } from 'lucide-react';
import { format } from 'date-fns';
import type { Channel, Message, User } from '../types';
import { useMessages } from '../hooks/useMessages';

interface Props {
  channel: Channel | null;
  currentUser: User | null;
}

export default function MessageArea({ channel, currentUser }: Props) {
  const { messages, loading, sendMessage, deleteMessage, editMessage } = useMessages(channel?.id || null);
  const [input, setInput]           = useState('');
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentUser || !channel) return;
    await sendMessage(input, currentUser.id);
    setInput('');
  };

  const startEdit  = (msg: Message) => { setEditingId(msg.id); setEditContent(msg.content); };
  const saveEdit   = async (id: string) => { if (!editContent.trim()) return; await editMessage(id, editContent); setEditingId(null); };
  const cancelEdit = () => { setEditingId(null); setEditContent(''); };

  if (!channel) {
    return (
      <div className="d-flex flex-fill align-items-center justify-content-center" style={{ background: '#0b0d14' }}>
        <div className="text-center" style={{ color: '#6b7280' }}>
          <Hash size={48} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
          <p className="fw-semibold mb-0" style={{ fontSize: 18, color: '#4b5563' }}>Select a channel</p>
        </div>
      </div>
    );
  }

  const grouped = groupMessages(messages);

  return (
    <div className="d-flex flex-column flex-fill overflow-hidden" style={{ background: '#0b0d14' }}>
      {/* Channel header */}
      <div
        className="d-flex align-items-center gap-2 px-3"
        style={{
          height: 48, minHeight: 48,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(11,13,20,0.95)',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
        }}
      >
        {channel.type === 'announcement'
          ? <Megaphone size={18} color="#5865F2" />
          : <Hash      size={18} color="#5865F2" />
        }
        <span
          className="fw-bold"
          style={{ color: '#e5e7eb', fontSize: 15, fontFamily: "'JetBrains Mono', monospace" }}
        >
          {channel.name}
        </span>
        {channel.topic && (
          <>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ color: '#6b7280', fontSize: 13 }}>{channel.topic}</span>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-fill overflow-y-auto py-3 d-flex flex-column">
        {loading ? (
          <div className="text-center py-5" style={{ color: '#6b7280' }}>
            <Spinner animation="border" size="sm" className="me-2" style={{ color: '#5865F2' }} />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <WelcomeMessage channel={channel} />
        ) : (
          grouped.map((group, gi) => (
            <MessageGroup
              key={gi}
              group={group}
              currentUserId={currentUser?.id || ''}
              editingId={editingId}
              editContent={editContent}
              onEdit={startEdit}
              onDelete={deleteMessage}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEdit}
              onEditContentChange={setEditContent}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <form onSubmit={handleSend}>
          <div
            className="d-flex align-items-center gap-3 px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
            }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={`Message #${channel.name}`}
              className="flex-fill border-0 bg-transparent outline-none"
              style={{ color: '#e5e7eb', fontSize: 15, fontFamily: "'Inter', sans-serif", outline: 'none' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as FormEvent); }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="d-flex align-items-center justify-content-center border-0"
              style={{
                background: input.trim() ? '#5865F2' : 'transparent',
                borderRadius: 8, padding: '6px 10px',
                cursor: input.trim() ? 'pointer' : 'default',
                color: input.trim() ? '#fff' : '#4b5563',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface MessageGroupData {
  author_id: string;
  author_name: string;
  is_bot: boolean;
  bot_name?: string;
  timestamp: string;
  messages: Message[];
}

function groupMessages(messages: Message[]): MessageGroupData[] {
  const groups: MessageGroupData[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    const sameAuthor  = last && last.author_id === msg.author_id;
    const closeInTime = last && (new Date(msg.created_at).getTime() - new Date(last.timestamp).getTime()) < 5 * 60 * 1000;
    if (sameAuthor && closeInTime) {
      last.messages.push(msg);
    } else {
      groups.push({
        author_id:   msg.author_id,
        author_name: msg.bot_name || msg.author?.display_name || msg.author?.username || msg.author_id,
        is_bot:      !!msg.is_bot,
        bot_name:    msg.bot_name,
        timestamp:   msg.created_at,
        messages:    [msg],
      });
    }
  }
  return groups;
}

function MessageGroup({ group, currentUserId, editingId, editContent, onEdit, onDelete, onSaveEdit, onCancelEdit, onEditContentChange }: {
  group: MessageGroupData; currentUserId: string;
  editingId: string | null; editContent: string;
  onEdit: (m: Message) => void; onDelete: (id: string) => void;
  onSaveEdit: (id: string) => void; onCancelEdit: () => void;
  onEditContentChange: (v: string) => void;
}) {
  const isMe     = group.author_id === currentUserId;
  const initials = group.author_name.charAt(0).toUpperCase();

  return (
    <div className="d-flex gap-3 px-3 py-1 position-relative msg-group">
      {/* Avatar */}
      <div
        className="d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
        style={{
          width: 40, height: 40,
          borderRadius: group.is_bot ? 10 : 20,
          background: group.is_bot
            ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
            : `hsl(${hashColor(group.author_id)}, 60%, 45%)`,
          color: '#fff', fontSize: 16, marginTop: 2,
        }}
      >
        {group.is_bot ? <Bot size={18} /> : initials}
      </div>

      <div className="flex-fill overflow-hidden">
        {/* Author line */}
        <div className="d-flex align-items-baseline gap-2 mb-1">
          <span className="fw-bold" style={{ color: isMe ? '#818cf8' : '#e5e7eb', fontSize: 14 }}>
            {group.author_name}
          </span>
          {group.is_bot && (
            <span
              className="text-uppercase fw-bold"
              style={{
                background: '#5865F2', color: '#fff',
                fontSize: 10, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.05em',
              }}
            >
              BOT
            </span>
          )}
          <span style={{ color: '#4b5563', fontSize: 11 }}>
            {format(new Date(group.timestamp), 'MMM d, h:mm a')}
          </span>
        </div>

        {/* Messages */}
        {group.messages.map(msg => (
          <MessageRow
            key={msg.id} msg={msg}
            isMe={msg.author_id === currentUserId}
            isEditing={editingId === msg.id}
            editContent={editContent}
            onEdit={() => onEdit(msg)}
            onDelete={() => onDelete(msg.id)}
            onSave={() => onSaveEdit(msg.id)}
            onCancel={onCancelEdit}
            onEditChange={onEditContentChange}
          />
        ))}
      </div>
    </div>
  );
}

function MessageRow({ msg, isMe, isEditing, editContent, onEdit, onDelete, onSave, onCancel, onEditChange }: {
  msg: Message; isMe: boolean; isEditing: boolean;
  editContent: string; onEdit: () => void; onDelete: () => void;
  onSave: () => void; onCancel: () => void; onEditChange: (v: string) => void;
}) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="position-relative mb-1"
    >
      {isEditing ? (
        <div>
          <input
            value={editContent}
            onChange={e => onEditChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
            autoFocus
            className="w-100"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid #5865F2', borderRadius: 6,
              padding: '6px 10px', color: '#e5e7eb', fontSize: 14,
              fontFamily: "'Inter', sans-serif", outline: 'none',
            }}
          />
          <div className="d-flex gap-2 mt-1">
            <button onClick={onSave}   className="d-flex align-items-center gap-1 border-0 rounded-2 px-2" style={{ background: '#5865F2', color: '#fff', cursor: 'pointer', fontSize: 12, padding: '3px 8px', fontFamily: 'inherit' }}><Check size={12} /> Save</button>
            <button onClick={onCancel} className="d-flex align-items-center gap-1 rounded-2 px-2" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#9ca3af', cursor: 'pointer', fontSize: 12, padding: '3px 8px', fontFamily: 'inherit' }}><X size={12} /> Cancel</button>
          </div>
        </div>
      ) : (
        <p className="mb-0" style={{ color: '#c9d1d9', fontSize: 14.5, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
          {msg.content}
          {msg.edited_at && <span style={{ color: '#4b5563', fontSize: 11, marginLeft: 6 }}>(edited)</span>}
        </p>
      )}

      {/* Action buttons */}
      {hov && !isEditing && isMe && (
        <div
          className="position-absolute d-flex gap-1"
          style={{
            right: 0, top: -4,
            background: '#18191c', borderRadius: 6, padding: '3px 6px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <ActionBtn icon={<Edit2  size={13} />} onClick={onEdit}   />
          <ActionBtn icon={<Trash2 size={13} />} onClick={onDelete} danger />
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, onClick, danger }: { icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="d-flex align-items-center border-0 rounded-2"
      style={{
        background: hov ? (danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)') : 'none',
        padding: '3px 5px', cursor: 'pointer',
        color: danger ? (hov ? '#f87171' : '#ef4444') : (hov ? '#e5e7eb' : '#9ca3af'),
        transition: 'all 0.15s', fontFamily: 'inherit',
      }}
    >
      {icon}
    </button>
  );
}

function WelcomeMessage({ channel }: { channel: Channel }) {
  return (
    <div className="text-center px-4 py-5">
      <div
        className="d-flex align-items-center justify-content-center mx-auto mb-4"
        style={{
          width: 72, height: 72, borderRadius: 24,
          background: 'linear-gradient(135deg, #5865F2, #7c3aed)', fontSize: 32,
        }}
      >
        {channel.type === 'announcement' ? '📣' : '#'}
      </div>
      <h2 className="fw-bold mb-2" style={{ color: '#e5e7eb', fontSize: 22 }}>
        Welcome to #{channel.name}!
      </h2>
      <p className="mb-0" style={{ color: '#6b7280', fontSize: 15 }}>
        {channel.topic || `This is the beginning of the #${channel.name} channel.`}
      </p>
    </div>
  );
}

function hashColor(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}
