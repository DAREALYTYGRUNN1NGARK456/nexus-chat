// InsForge API client (SDK-style, matching useAuth expectations)
const INSFORGE_URL = import.meta.env.VITE_INSFORGE_URL || 'https://api.insforge.com';
const APP_ID = import.meta.env.VITE_INSFORGE_APP_ID || '';

// ── Shared types ────────────────────────────────────────────────────────────

export interface InsForgeResponse<T = unknown> {
  data?: T;
  error?: { message: string };
  success: boolean;
}

type AuthResult<T = unknown> = Promise<{ data?: T; error?: { message: string } }>;

// ── Auth sub-client ─────────────────────────────────────────────────────────

class InsForgeAuth {
  constructor(private client: InsForgeClient) {}

  private req<T>(method: string, path: string, body?: unknown, token?: string): AuthResult<T> {
    return this.client._request<T>(method, path, body, token);
  }

  /** Register a new user. The caller should wait for email verification before
   *  treating the user as signed in. */
  async signUp(params: {
    email: string;
    password: string;
    name: string;
    pfp?: string;
  }): AuthResult {
    return this.req('POST', '/auth/register', {
      username: params.name,
      display_name: params.name,
      email: params.email,
      password: params.password,
      pfp: params.pfp,
    });
  }

  async signInWithPassword(params: { email: string; password: string }): AuthResult {
    const result = await this.req<{ token: string; user_id: string; user: unknown }>(
      'POST', '/auth/login', params
    );
    if (!result.error && result.data) {
      this.client.setSession(result.data.token, result.data.user_id);
    }
    return result;
  }

  /** Kick off Discord OAuth. Redirects the browser — returns only on error. */
  async signInWithOAuth(params: { provider: 'discord'; redirectTo?: string }): AuthResult {
    // InsForge OAuth: redirect to the provider via the InsForge authorize endpoint.
    // InsForge will append ?insforge_code=... on the way back.
    const qs = new URLSearchParams({
      provider: params.provider,
      app_id: APP_ID,
      redirect_to: params.redirectTo ?? window.location.origin,
    });
    window.location.href = `${INSFORGE_URL}/auth/oauth/authorize?${qs}`;
    return {}; // never reached on success
  }

  /** Exchange the insforge_code URL param for a full session after OAuth redirect. */
  async exchangeCodeForSession(code: string): AuthResult {
    const result = await this.req<{ token: string; user_id: string; user: unknown }>(
      'POST', '/auth/oauth/exchange', { code, app_id: APP_ID }
    );
    if (!result.error && result.data) {
      this.client.setSession(result.data.token, result.data.user_id);
    }
    return result;
  }

  /** Returns the currently authenticated user, or an error if no valid session. */
  async getCurrentUser(): AuthResult {
    if (!this.client.isAuthenticated()) {
      // Try to restore from localStorage before giving up
      this.client.loadSession();
      if (!this.client.isAuthenticated()) return { error: { message: 'No session' } };
    }
    return this.req('GET', '/auth/me');
  }

  async verifyEmail(params: { email: string; otp: string }): AuthResult {
    const result = await this.req<{ token: string; user_id: string; user: unknown }>(
      'POST', '/auth/verify', { email: params.email, code: params.otp }
    );
    if (!result.error && result.data) {
      this.client.setSession(result.data.token, result.data.user_id);
    }
    return result;
  }

  async resendVerificationEmail(params: { email: string }): AuthResult {
    return this.req('POST', '/auth/resend-verification', { email: params.email });
  }

  async sendResetPasswordEmail(params: { email: string }): AuthResult {
    return this.req('POST', '/auth/forgot-password', { email: params.email });
  }

  /** Update fields on the authenticated user's profile. */
  async setProfile(fields: { pfp?: string; name?: string; [key: string]: unknown }): AuthResult {
    return this.req('PATCH', '/auth/profile', fields);
  }

  async signOut(): Promise<void> {
    await this.req('POST', '/auth/logout').catch(() => {/* ignore network errors on signout */});
    this.client.clearSession();
  }
}

// ── Main client ─────────────────────────────────────────────────────────────

class InsForgeClient {
  private token: string | null = null;
  private userId: string | null = null;

  /** Namespaced auth helpers (mirrors the new SDK surface used by useAuth) */
  readonly auth = new InsForgeAuth(this);

  setSession(token: string, userId: string) {
    this.token = token;
    this.userId = userId;
    localStorage.setItem('nexus_token', token);
    localStorage.setItem('nexus_user_id', userId);
  }

  clearSession() {
    this.token = null;
    this.userId = null;
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_user_id');
  }

  loadSession(): boolean {
    const token = localStorage.getItem('nexus_token');
    const userId = localStorage.getItem('nexus_user_id');
    if (token && userId) {
      this.token = token;
      this.userId = userId;
      return true;
    }
    return false;
  }

  getToken()        { return this.token; }
  getUserId()       { return this.userId; }
  isAuthenticated() { return !!this.token; }

  /** Internal request helper. Called by InsForgeAuth and by direct callers. */
  async _request<T>(
    method: string,
    path: string,
    body?: unknown,
    customToken?: string
  ): Promise<{ data?: T; error?: { message: string } }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-ID': APP_ID,
    };
    const authToken = customToken ?? this.token;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const res = await fetch(`${INSFORGE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: { message: data.message || data.error || 'Request failed' } };
      }
      return { data: data as T };
    } catch {
      return { error: { message: 'Network error' } };
    }
  }

  // ── Database ──────────────────────────────────────────────────────────────

  async dbGet<T>(collection: string, id: string) {
    return this._request<T>('GET', `/db/${collection}/${id}`);
  }

  async dbQuery<T>(collection: string, filters?: Record<string, unknown>, limit?: number, orderBy?: string) {
    const params = new URLSearchParams();
    if (filters)  params.set('filters', JSON.stringify(filters));
    if (limit)    params.set('limit', String(limit));
    if (orderBy)  params.set('orderBy', orderBy);
    const res = await this._request<T[]>('GET', `/db/${collection}?${params}`);
    return { success: !res.error, data: res.data, error: res.error?.message };
  }

  async dbCreate<T>(collection: string, data: Record<string, unknown>) {
    const res = await this._request<T>('POST', `/db/${collection}`, data);
    return { success: !res.error, data: res.data, error: res.error?.message };
  }

  async dbUpdate<T>(collection: string, id: string, data: Record<string, unknown>) {
    const res = await this._request<T>('PATCH', `/db/${collection}/${id}`, data);
    return { success: !res.error, data: res.data, error: res.error?.message };
  }

  async dbDelete(collection: string, id: string) {
    const res = await this._request('DELETE', `/db/${collection}/${id}`);
    return { success: !res.error, error: res.error?.message };
  }

  // ── Realtime ──────────────────────────────────────────────────────────────

  subscribe(collection: string, filters: Record<string, unknown>, callback: (event: string, data: unknown) => void): () => void {
    const params = new URLSearchParams({
      collection,
      filters: JSON.stringify(filters),
      token: this.token || '',
      app_id: APP_ID,
    });
    const es = new EventSource(`${INSFORGE_URL}/realtime/subscribe?${params}`);
    es.onmessage = (e) => {
      try { const p = JSON.parse(e.data); callback(p.event, p.data); } catch { /* ignore */ }
    };
    return () => es.close();
  }

  // ── Bot token helpers ─────────────────────────────────────────────────────

  async dbCreateWithBotToken<T>(collection: string, data: Record<string, unknown>, botToken: string) {
    const res = await this._request<T>('POST', `/db/${collection}`, data, botToken);
    return { success: !res.error, data: res.data, error: res.error?.message };
  }

  async dbQueryWithBotToken<T>(collection: string, filters?: Record<string, unknown>, botToken?: string) {
    const params = new URLSearchParams();
    if (filters) params.set('filters', JSON.stringify(filters));
    const res = await this._request<T[]>('GET', `/db/${collection}?${params}`, undefined, botToken);
    return { success: !res.error, data: res.data, error: res.error?.message };
  }

  // ── Legacy direct methods (kept so hooks/components don't need changes) ───

  /** @deprecated Access via insforge.auth.signInWithPassword instead */
  async login(email: string, password: string) {
    return this.auth.signInWithPassword({ email, password });
  }

  /** @deprecated Access via insforge.auth.getCurrentUser instead */
  async getMe() {
    const res = await this.auth.getCurrentUser();
    return { success: !res.error, data: res.data };
  }

  /** @deprecated */
  async logout() {
    return this.auth.signOut();
  }
}

export const insforge = new InsForgeClient();
export default insforge;
