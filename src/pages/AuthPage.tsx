import { useState, useEffect, FormEvent } from 'react';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../lib/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const DISCORD_BLUE = '#5865F2';

type AuthMode = 'login' | 'register' | 'reset';
type AuthStep = 'form' | 'verify' | 'reset-sent';

export default function AuthPage() {
  const [mode, setMode]       = useState<AuthMode>('login');
  const [step, setStep]       = useState<AuthStep>('form');
  const [email, setEmail]     = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]       = useState('');
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp, signOut: _so, signInWithDiscord, verifyEmail, resendCode, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  /* ── Handle InsForge OAuth callback (insforge_code in URL) ─────────────── */
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    // Legacy Discord server-callback error params (kept for graceful degradation)
    const oauthError = params.get('error');
    if (oauthError) {
      const messages: Record<string, string> = {
        discord_denied:          'Discord login was cancelled.',
        discord_not_configured:  'Discord login is not set up on this server.',
        discord_token_failed:    'Failed to exchange Discord code. Please try again.',
        discord_register_failed: 'Could not create your account via Discord.',
        discord_login_failed:    'Could not sign you in via Discord.',
      };
      setError(messages[oauthError] || 'Discord login failed.');
      window.history.replaceState({}, '', '/auth');
      return;
    }

    // insforge_code is handled inside AuthProvider — if we get here the user
    // will already be set and the ProtectedRoute will redirect to /app.
  }, [location.search]);

  /* ── Form submit ─────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    if (mode === 'login') {
      const err = await signIn(email, password);
      setLoading(false);
      if (err) { setError(err); return; }
      navigate('/app');
      return;
    }

    if (mode === 'reset') {
      const err = await resetPassword(email);
      setLoading(false);
      if (err) { setError(err); return; }
      setStep('reset-sent');
      return;
    }

    // Register
    if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
    const err = await signUp(email, password, username.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    setStep('verify');
  };

  /* ── Verify submit ───────────────────────────────────────────────────────── */
  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError('Please enter the verification code.'); return; }
    setError('');
    setLoading(true);
    const err = await verifyEmail(email, code.trim());
    setLoading(false);
    if (err) { setError(err); return; }
    navigate('/app');
  };

  /* ── Resend code ─────────────────────────────────────────────────────────── */
  const handleResend = async () => {
    setError('');
    setInfo('');
    setLoading(true);
    const err = await resendCode(email);
    setLoading(false);
    if (err) { setError(err); return; }
    setInfo('A new code has been sent to your email.');
  };

  /* ── Discord OAuth ───────────────────────────────────────────────────────── */
  const handleDiscordLogin = async () => {
    setError('');
    setLoading(true);
    const err = await signInWithDiscord();
    // signInWithDiscord redirects on success; we only get here on error
    setLoading(false);
    if (err) setError(err);
  };

  /* ── Mode helpers ────────────────────────────────────────────────────────── */
  const switchMode = (m: AuthMode) => {
    setMode(m);
    setStep('form');
    setError('');
    setInfo('');
    setCode('');
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 position-relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 60% 20%, #1a1f3a 0%, #0b0d14 60%)', fontFamily: "'Inter', sans-serif" }}
    >
      {/* Background grid */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100 pe-none"
        style={{
          opacity: 0.03,
          backgroundImage: 'linear-gradient(#5865F2 1px, transparent 1px), linear-gradient(90deg, #5865F2 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <Card
        className="position-relative border-0"
        style={{
          width: '100%', maxWidth: 420,
          background: 'rgba(22, 25, 40, 0.92)',
          borderRadius: 16,
          padding: '40px 36px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div className="text-center mb-4">
          <div
            className="d-flex align-items-center justify-content-center mx-auto mb-3"
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #5865F2, #8b5cf6)',
              boxShadow: '0 8px 32px rgba(88,101,242,0.4)',
              fontSize: 24,
            }}
          >
            ✦
          </div>
          <h1 className="fw-bold mb-1" style={{ color: '#fff', fontSize: 22 }}>Nexus</h1>
          <p className="mb-0" style={{ color: '#6b7280', fontSize: 14 }}>
            {step === 'verify'      ? 'Check your email for a code'
            : step === 'reset-sent' ? 'Check your email'
            : mode === 'login'      ? 'Welcome back'
            : mode === 'reset'      ? 'Reset your password'
            :                         'Create your account'}
          </p>
        </div>

        {/* ── VERIFICATION STEP ─────────────────────────────────────────────── */}
        {step === 'verify' ? (
          <Form onSubmit={handleVerify}>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              We sent a 6-digit code to <strong style={{ color: '#e5e7eb' }}>{email}</strong>.
              Enter it below to activate your account.
            </p>

            <div className="mb-3">
              <Form.Label className="fw-semibold text-uppercase" style={{ color: '#9ca3af', fontSize: 12, letterSpacing: '0.06em' }}>
                Verification Code
              </Form.Label>
              <Form.Control
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                className="nexus-input text-center"
                style={{ fontSize: 22, letterSpacing: '0.35em', fontFamily: 'monospace', padding: '12px 14px' }}
              />
            </div>

            {error && <ErrorAlert message={error} />}
            {info  && <InfoAlert  message={info}  />}

            <Button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-100 fw-semibold border-0 nexus-btn-primary"
              style={{ fontSize: 15, padding: '12px 0', borderRadius: 10, marginBottom: 8 }}
            >
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </Button>

            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="w-100 border-0 bg-transparent py-2"
              style={{ color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className="w-100 border-0 bg-transparent py-1"
              style={{ color: '#4b5563', fontSize: 13, cursor: 'pointer' }}
            >
              ← Back to registration
            </button>
          </Form>

        /* ── RESET SENT ─────────────────────────────────────────────────────── */
        ) : step === 'reset-sent' ? (
          <div className="text-center">
            <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
              If an account exists for <strong style={{ color: '#e5e7eb' }}>{email}</strong>,
              you'll receive a password reset link shortly.
            </p>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="w-100 border-0 bg-transparent py-2"
              style={{ color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
            >
              ← Back to sign in
            </button>
          </div>

        /* ── MAIN AUTH FORM ───────────────────────────────────────────────── */
        ) : (
          <>
            {/* Mode toggle (login / register only — reset is a sub-mode) */}
            {mode !== 'reset' && (
              <div className="d-flex mb-4 p-1 rounded-3" style={{ background: '#0b0d14' }}>
                {(['login', 'register'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className="flex-fill border-0 py-2 fw-semibold"
                    style={{
                      borderRadius: 8, fontSize: 13,
                      background: mode === m ? DISCORD_BLUE : 'transparent',
                      color: mode === m ? '#fff' : '#6b7280',
                      cursor: 'pointer', transition: 'all 0.2s',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>
            )}

            {/* Discord button (only on login/register) */}
            {mode !== 'reset' && (
              <>
                <button
                  type="button"
                  onClick={handleDiscordLogin}
                  disabled={loading}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 10, padding: '11px 0', borderRadius: 10, border: 'none',
                    background: DISCORD_BLUE, color: '#fff', fontWeight: 600, fontSize: 14,
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                    marginBottom: 16, fontFamily: "'Inter', sans-serif", transition: 'opacity 0.2s, filter 0.2s',
                  }}
                  onMouseOver={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
                  onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
                >
                  <DiscordIcon />
                  Continue with Discord
                </button>

                <div className="d-flex align-items-center mb-4" style={{ gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ color: '#4b5563', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>or continue with email</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                </div>
              </>
            )}

            <Form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <NexusField label="Username" value={username} onChange={setUsername} placeholder="cooluser" />
              )}
              <NexusField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
              {mode !== 'reset' && (
                <NexusField label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              )}

              {error && <ErrorAlert message={error} />}
              {info  && <InfoAlert  message={info}  />}

              <Button
                type="submit"
                disabled={loading}
                className="w-100 fw-semibold border-0 nexus-btn-primary"
                style={{ fontSize: 15, padding: '12px 0', borderRadius: 10, marginBottom: 12 }}
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'login'    ? 'Sign In'
                  : mode === 'reset'    ? 'Send Reset Email'
                  :                       'Create Account'}
              </Button>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="w-100 border-0 bg-transparent py-1"
                  style={{ color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              )}
              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-100 border-0 bg-transparent py-1"
                  style={{ color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
                >
                  ← Back to sign in
                </button>
              )}
            </Form>
          </>
        )}
      </Card>
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function NexusField({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <Form.Group className="mb-3">
      <Form.Label className="fw-semibold text-uppercase" style={{ color: '#9ca3af', fontSize: 12, letterSpacing: '0.06em' }}>
        {label}
      </Form.Label>
      <Form.Control
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required className="nexus-input" style={{ fontSize: 15 }}
      />
    </Form.Group>
  );
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="danger" className="py-2 px-3 mb-3"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 13, borderRadius: 8 }}>
      {message}
    </Alert>
  );
}

function InfoAlert({ message }: { message: string }) {
  return (
    <Alert variant="info" className="py-2 px-3 mb-3"
      style={{ background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.3)', color: '#a5b4fc', fontSize: 13, borderRadius: 8 }}>
      {message}
    </Alert>
  );
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.105 18.1.12 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  );
}
