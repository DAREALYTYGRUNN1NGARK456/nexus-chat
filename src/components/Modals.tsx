import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { Copy, Check, Plus, Trash2, Eye, EyeOff, Bot } from 'lucide-react';
import insforge from '../lib/insforge';
import type { BotToken } from '../types';

// ── Shared form field ──────────────────────────────────────────────────────────
function NexusField({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string;
}) {
  return (
    <Form.Group className="mb-3">
      <Form.Label
        className="text-uppercase fw-semibold"
        style={{ color: '#9ca3af', fontSize: 12, letterSpacing: '0.06em' }}
      >
        {label}
      </Form.Label>
      <Form.Control
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="nexus-input"
      />
    </Form.Group>
  );
}

// ── Create Server ──────────────────────────────────────────────────────────────
export function CreateServerModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName]     = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim());
    setLoading(false);
    onClose();
  };

  return (
    <Modal show onHide={onClose} centered dialogClassName="nexus-modal">
      <Modal.Header closeButton>
        <Modal.Title>Create a Server</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>
          Give your server a name. You can always change it later.
        </p>
        <NexusField label="Server Name" value={name} onChange={setName} placeholder="My Awesome Server" />
        <button
          onClick={handle}
          disabled={loading || !name.trim()}
          className="nexus-btn-primary"
        >
          {loading ? 'Creating…' : 'Create Server'}
        </button>
      </Modal.Body>
    </Modal>
  );
}

// ── Join Server ────────────────────────────────────────────────────────────────
export function JoinServerModal({ onClose, onJoin }: {
  onClose: () => void;
  onJoin: (code: string) => Promise<string | null>;
}) {
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handle = async () => {
    if (!code.trim()) return;
    setLoading(true); setError('');
    const err = await onJoin(code.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    onClose();
  };

  return (
    <Modal show onHide={onClose} centered dialogClassName="nexus-modal">
      <Modal.Header closeButton>
        <Modal.Title>Join a Server</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>
          Enter an invite code to join an existing server.
        </p>
        <NexusField label="Invite Code" value={code} onChange={setCode} placeholder="ABC12345" />
        {error && (
          <Alert variant="danger" className="py-2 px-3 mb-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: 13, borderRadius: 6 }}>
            {error}
          </Alert>
        )}
        <button onClick={handle} disabled={loading || !code.trim()} className="nexus-btn-primary">
          {loading ? 'Joining…' : 'Join Server'}
        </button>
      </Modal.Body>
    </Modal>
  );
}

// ── Create Channel ─────────────────────────────────────────────────────────────
export function CreateChannelModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, type: 'text' | 'announcement') => Promise<void>;
}) {
  const [name, setName]     = useState('');
  const [type, setType]     = useState<'text' | 'announcement'>('text');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await onCreate(name.trim(), type);
    setLoading(false);
    onClose();
  };

  return (
    <Modal show onHide={onClose} centered dialogClassName="nexus-modal">
      <Modal.Header closeButton>
        <Modal.Title>Create Channel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <NexusField label="Channel Name" value={name} onChange={setName} placeholder="new-channel" />

        <Form.Group className="mb-4">
          <Form.Label
            className="text-uppercase fw-semibold"
            style={{ color: '#9ca3af', fontSize: 12, letterSpacing: '0.06em' }}
          >
            Channel Type
          </Form.Label>
          {(['text', 'announcement'] as const).map(t => (
            <label
              key={t}
              className="d-flex align-items-center gap-2 rounded-3 mb-1"
              style={{
                cursor: 'pointer', padding: '8px 12px',
                background: type === t ? 'rgba(88,101,242,0.15)' : 'transparent',
              }}
            >
              <Form.Check
                type="radio"
                checked={type === t}
                onChange={() => setType(t)}
                style={{ accentColor: '#5865F2' }}
                className="mb-0"
              />
              <span className="text-capitalize" style={{ color: '#e5e7eb', fontSize: 14 }}>{t}</span>
            </label>
          ))}
        </Form.Group>

        <button onClick={handle} disabled={loading || !name.trim()} className="nexus-btn-primary">
          {loading ? 'Creating…' : 'Create Channel'}
        </button>
      </Modal.Body>
    </Modal>
  );
}

// ── Bot Token Manager ─────────────────────────────────────────────────────────
export function BotTokenModal({ serverId, userId, onClose }: {
  serverId: string; userId: string; onClose: () => void;
}) {
  const [bots, setBots]           = useState<BotToken[]>([]);
  const [newBotName, setNewBotName] = useState('');
  const [loading, setLoading]     = useState(false);
  const [creating, setCreating]   = useState(false);
  const [revealedTokens, setRevealedTokens] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    insforge.dbQuery<BotToken>('bot_tokens', { server_id: serverId }).then(res => {
      if (res.success && res.data) setBots(res.data);
      setLoading(false);
    });
  }, [serverId]);

  const createBot = async () => {
    if (!newBotName.trim()) return;
    setCreating(true);
    const token = `nxb_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    const res = await insforge.dbCreate<BotToken>('bot_tokens', {
      server_id: serverId, name: newBotName.trim(),
      token, created_by: userId, created_at: new Date().toISOString(),
    });
    if (res.success && res.data) {
      setBots(prev => [...prev, res.data!]);
      setRevealedTokens(prev => new Set(prev).add(res.data!.id));
    }
    setNewBotName(''); setCreating(false);
  };

  const deleteBot = async (id: string) => {
    await insforge.dbDelete('bot_tokens', id);
    setBots(prev => prev.filter(b => b.id !== id));
  };

  const copyToken = (id: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleReveal = (id: string) => {
    setRevealedTokens(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Modal show onHide={onClose} centered dialogClassName="nexus-modal">
      <Modal.Header closeButton>
        <Modal.Title>Bot Tokens</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 16 }}>
          Create bot tokens for this server. Bots authenticate with{' '}
          <code style={{ fontFamily: "'JetBrains Mono', monospace", background: 'rgba(88,101,242,0.15)', padding: '1px 6px', borderRadius: 4, color: '#818cf8' }}>
            Authorization: Bot &lt;token&gt;
          </code>
        </p>

        {/* API hint */}
        <div
          className="rounded-3 mb-4 p-3"
          style={{ background: 'rgba(88,101,242,0.08)', border: '1px solid rgba(88,101,242,0.2)', fontSize: 12, color: '#818cf8', fontFamily: "'JetBrains Mono', monospace" }}
        >
          POST /api/bot/channels/:id/messages<br />
          GET  /api/bot/channels/:id/messages<br />
          GET  /api/bot/servers/:id/channels
        </div>

        {/* Create new */}
        <div className="d-flex gap-2 mb-4">
          <input
            value={newBotName}
            onChange={e => setNewBotName(e.target.value)}
            placeholder="My Bot Name"
            className="flex-fill nexus-input"
            style={{ fontSize: 14 }}
            onKeyDown={e => e.key === 'Enter' && createBot()}
          />
          <Button
            onClick={createBot}
            disabled={!newBotName.trim() || creating}
            className="d-flex align-items-center gap-2 border-0 fw-semibold"
            style={{ background: '#5865F2', borderRadius: 8, fontSize: 14, padding: '9px 14px', cursor: 'pointer' }}
          >
            <Plus size={16} /> Create
          </Button>
        </div>

        {/* Bot list */}
        {loading ? (
          <p className="text-center" style={{ color: '#6b7280' }}>Loading…</p>
        ) : bots.length === 0 ? (
          <div className="text-center py-4" style={{ color: '#4b5563' }}>
            <Bot size={32} className="mx-auto mb-2" style={{ opacity: 0.4 }} />
            <p className="mb-0">No bots yet. Create one above.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-2">
            {bots.map(bot => (
              <div
                key={bot.id}
                className="rounded-3 p-3"
                style={{ background: '#0f111a', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-2"
                      style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
                    >
                      <Bot size={14} color="#fff" />
                    </div>
                    <span className="fw-semibold" style={{ color: '#e5e7eb', fontSize: 14 }}>{bot.name}</span>
                  </div>
                  <button
                    onClick={() => deleteBot(bot.id)}
                    className="border-0 rounded-2 p-1"
                    style={{ background: 'none', cursor: 'pointer', color: '#6b7280', transition: 'color 0.2s', fontFamily: 'inherit' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <code
                    className="flex-fill text-truncate rounded-2 px-2 py-1"
                    style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#818cf8', background: 'rgba(88,101,242,0.1)' }}
                  >
                    {revealedTokens.has(bot.id) ? bot.token : `nxb_${'•'.repeat(32)}`}
                  </code>
                  <button
                    onClick={() => toggleReveal(bot.id)}
                    className="border-0 p-1"
                    style={{ background: 'none', cursor: 'pointer', color: '#6b7280', fontFamily: 'inherit' }}
                    title={revealedTokens.has(bot.id) ? 'Hide' : 'Reveal'}
                  >
                    {revealedTokens.has(bot.id) ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    onClick={() => copyToken(bot.id, bot.token)}
                    className="border-0 p-1"
                    style={{ background: 'none', cursor: 'pointer', color: copiedId === bot.id ? '#3ba55c' : '#6b7280', fontFamily: 'inherit' }}
                  >
                    {copiedId === bot.id ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
}
