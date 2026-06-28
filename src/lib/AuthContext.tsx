import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { insforge } from './insforge';
import { fileToAvatarDataUrl } from './avatarUpload';
import type { User } from '../types';

const DEFAULT_PFP = 'https://at.yeetdesigns.cc/Images/ProfilePictures/Default.png';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string, pfpFile?: File | null) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithDiscord: () => Promise<string | null>;
  signOut: () => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<string | null>;
  resendCode: (email: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  updateAvatar: (file: File) => Promise<string | null>;
  // Legacy aliases so existing call-sites keep working without changes
  /** @deprecated Use signIn */
  login: (email: string, password: string) => Promise<string | null>;
  /** @deprecated Use signOut */
  logout: () => Promise<void>;
  /** @deprecated Use verifyEmail */
  verify: (email: string, code: string) => Promise<string | null>;
  /** @deprecated Use signInWithDiscord — Discord is now handled entirely client-side */
  loginWithDiscordToken: (token: string, userId: string) => Promise<string | null>;
  /** @deprecated Use signUp */
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<{ requiresVerification: boolean; email?: string; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The InsForge SDK wraps the user object as { user: { id, email, profile: { name }, ... } }
function normalizeUser(data: unknown): User {
  const raw = data as Record<string, unknown>;
  const u = (raw?.user ?? raw) as Record<string, unknown>;
  const profile = u.profile as Record<string, unknown> | undefined;
  return {
    id:           String(u.id ?? u.user_id ?? u.sub ?? ''),
    // Map SDK fields → existing User type fields
    username:     String(profile?.name ?? u.name ?? u.username ?? ''),
    display_name: String(profile?.name ?? u.name ?? u.display_name ?? ''),
    avatar:       String(profile?.pfp ?? u.pfp ?? u.avatar ?? DEFAULT_PFP),
    status:       'online',
    created_at:   String(u.created_at ?? new Date().toISOString()),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('insforge_code');

    const init = async () => {
      // If there's an OAuth code in the URL, exchange it for a session first,
      // then clean the URL so the code isn't visible or reused.
      if (code) {
        const { data, error } = await insforge.auth.exchangeCodeForSession(code);
        if (!error && data) setUser(normalizeUser(data));
        window.history.replaceState({}, '', window.location.pathname);
        setLoading(false);
        return;
      }

      insforge.auth.getCurrentUser().then(({ data, error }) => {
        if (!error && data) setUser(normalizeUser(data));
        setLoading(false);
      });
    };

    init();
  }, []);

  // ── Core methods ─────────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    name: string,
    pfpFile?: File | null
  ): Promise<string | null> => {
    let pfp = DEFAULT_PFP;
    if (pfpFile) {
      try {
        pfp = await fileToAvatarDataUrl(pfpFile);
      } catch (err) {
        return err instanceof Error ? err.message : 'Could not process that image.';
      }
    }
    const { error } = await insforge.auth.signUp({ email, password, name, pfp });
    if (error) return error.message;
    // Don't set user yet — they need to verify first
    return null;
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    if (data) setUser(normalizeUser(data));
    return null;
  };

  // Discord covers both "create account" and "sign in" in one flow — if no
  // InsForge user is linked to that Discord account yet, one is created.
  // The SDK redirects the browser to Discord and, on the way back, picks
  // the `insforge_code` param out of the URL automatically (see the
  // getCurrentUser() call in the effect above) — no callback route needed.
  const signInWithDiscord = async (): Promise<string | null> => {
    const { error } = await insforge.auth.signInWithOAuth({
      provider: 'discord',
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) return error.message;
    return null; // success redirects the browser away before this matters
  };

  const verifyEmail = async (email: string, code: string): Promise<string | null> => {
    const { data, error } = await insforge.auth.verifyEmail({ email, otp: code });
    if (error) return error.message;
    if (data) setUser(normalizeUser(data));
    return null;
  };

  const resendCode = async (email: string): Promise<string | null> => {
    const { error } = await insforge.auth.resendVerificationEmail({ email });
    if (error) return error.message;
    return null;
  };

  const resetPassword = async (email: string): Promise<string | null> => {
    const { error } = await insforge.auth.sendResetPasswordEmail({ email });
    if (error) return error.message;
    return null;
  };

  const signOut = async () => {
    await insforge.auth.signOut();
    setUser(null);
  };

  // Change the avatar for an already-authenticated user (e.g. from the sidebar).
  const updateAvatar = async (file: File): Promise<string | null> => {
    let pfp: string;
    try {
      pfp = await fileToAvatarDataUrl(file);
    } catch (err) {
      return err instanceof Error ? err.message : 'Could not process that image.';
    }
    const { error } = await insforge.auth.setProfile({ pfp });
    if (error) return error.message;
    setUser(prev => (prev ? { ...prev, avatar: pfp } : prev));
    return null;
  };

  // ── Legacy aliases (keep old call-sites working) ─────────────────────────

  const login = signIn;
  const logout = signOut;
  const verify = verifyEmail;

  // The old Discord flow passed a server-issued token back through the URL;
  // the new flow handles everything via insforge_code. This shim lets the
  // old AuthPage Discord handler work unchanged during migration.
  const loginWithDiscordToken = async (_token: string, _userId: string): Promise<string | null> => {
    // No-op: Discord is now handled by the OAuth exchange in useEffect above.
    // The insforge_code in the URL will have already set the user by the time
    // any legacy call to this function is reached.
    return null;
  };

  // The old register returned { requiresVerification, email, devCode, error }.
  // Map signUp to that shape for backwards compat with AuthPage.
  const register = async (
    username: string,
    email: string,
    password: string
  ): Promise<{ requiresVerification: boolean; email?: string; error?: string }> => {
    const err = await signUp(email, password, username);
    if (err) return { requiresVerification: false, error: err };
    return { requiresVerification: true, email };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithDiscord,
        signOut,
        verifyEmail,
        resendCode,
        resetPassword,
        updateAvatar,
        // Legacy
        login,
        logout,
        verify,
        loginWithDiscordToken,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
