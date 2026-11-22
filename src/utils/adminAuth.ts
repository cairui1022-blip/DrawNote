import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface StoredAdminRecord {
  username: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

export interface AdminTokenPayload {
  sub: string;
  role: 'admin';
  jti: string;
  exp: number;
}

const SCRYPT_KEYLEN = 64;
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export function hashAdminPassword(password: string, existingSalt?: string): {
  salt: string;
  passwordHash: string;
} {
  const salt = existingSalt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return { salt, passwordHash: derived };
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyAdminPassword(password: string, salt: string, expectedHash: string): boolean {
  const { passwordHash } = hashAdminPassword(password, salt);
  return timingSafeStringEqual(passwordHash, expectedHash);
}

export function validateAdminSetupInput(username: string, password: string): {
  ok: boolean;
  cleanUsername: string;
  error?: string;
} {
  const cleanUsername = username.trim();
  if (cleanUsername.length < 3 || cleanUsername.length > 24) {
    return { ok: false, cleanUsername, error: '管理员账号需为 3–24 位字符。' };
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(cleanUsername)) {
    return {
      ok: false,
      cleanUsername,
      error: '管理员账号仅支持英文字母、数字、点、下划线或短横线。',
    };
  }
  if (password.length < 8 || password.length > 72) {
    return { ok: false, cleanUsername, error: '管理员密码长度需在 8–72 位之间。' };
  }
  return { ok: true, cleanUsername };
}

export class AdminAuthManager {
  private readonly storePath: string;
  private readonly signingSecret: Buffer;
  private readonly revokedJtis = new Set<string>();
  private storedRecord: StoredAdminRecord | null;

  constructor(storePath: string, envSigningSecret?: string) {
    this.storePath = storePath;
    this.signingSecret =
      envSigningSecret && envSigningSecret.trim().length >= 16
        ? Buffer.from(envSigningSecret.trim(), 'utf8')
        : crypto.randomBytes(32);
    this.storedRecord = this.loadFromDisk();
  }

  private getEnvPasscode(): string {
    return (process.env.ADMIN_PASSCODE ?? '').trim();
  }

  private getEnvUsername(): string {
    return (process.env.ADMIN_USERNAME ?? '').trim() || 'admin';
  }

  private loadFromDisk(): StoredAdminRecord | null {
    try {
      if (!fs.existsSync(this.storePath)) return null;
      const raw = JSON.parse(fs.readFileSync(this.storePath, 'utf-8')) as Partial<StoredAdminRecord>;
      if (
        typeof raw.username === 'string' &&
        typeof raw.salt === 'string' &&
        typeof raw.passwordHash === 'string'
      ) {
        return {
          username: raw.username,
          salt: raw.salt,
          passwordHash: raw.passwordHash,
          createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private saveToDisk(record: StoredAdminRecord): void {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storePath, JSON.stringify(record, null, 2), 'utf-8');
    this.storedRecord = record;
  }

  getStatus(): {
    initialized: boolean;
    envConfigured: boolean;
    adminUsername?: string;
  } {
    const envPasscode = this.getEnvPasscode();
    if (envPasscode.length > 0) {
      return {
        initialized: true,
        envConfigured: true,
        adminUsername: this.getEnvUsername(),
      };
    }
    if (this.storedRecord) {
      return {
        initialized: true,
        envConfigured: false,
        adminUsername: this.storedRecord.username,
      };
    }
    return {
      initialized: false,
      envConfigured: false,
    };
  }

  /**
   * One-time atomic bootstrap route when ADMIN_PASSCODE is unset and no admin has been claimed yet.
   */
  claimInitialAdmin(
    username: string,
    password: string
  ): { ok: true; token: string; username: string } | { ok: false; status: number; error: string } {
    if (this.getEnvPasscode().length > 0 || this.storedRecord) {
      return {
        ok: false,
        status: 409,
        error: '管理员账号已初始化完成，请直接登录。',
      };
    }
    const validation = validateAdminSetupInput(username, password);
    if (!validation.ok) {
      return {
        ok: false,
        status: 400,
        error: validation.error || '管理员账号或密码格式无效。',
      };
    }

    const { salt, passwordHash } = hashAdminPassword(password);
    this.saveToDisk({
      username: validation.cleanUsername,
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    });
    const token = this.issueToken(validation.cleanUsername);
    return { ok: true, token, username: validation.cleanUsername };
  }

  login(
    username: string,
    password: string
  ): { ok: true; token: string; username: string } | { ok: false; status: number; error: string } {
    const cleanUser = username.trim();
    const envPasscode = this.getEnvPasscode();

    // Configured process.env passcode always overrides any claimed fallback hash
    if (envPasscode.length > 0) {
      const expectedUser = this.getEnvUsername();
      const userOk = timingSafeStringEqual(cleanUser.toLowerCase(), expectedUser.toLowerCase());
      const passOk = timingSafeStringEqual(password, envPasscode);
      if (!userOk || !passOk) {
        return { ok: false, status: 401, error: '管理员账号或密码不正确。' };
      }
      return { ok: true, token: this.issueToken(expectedUser), username: expectedUser };
    }

    if (!this.storedRecord) {
      return {
        ok: false,
        status: 403,
        error: '尚未创建管理员账号，请先完成首次管理员初始化。',
      };
    }

    const userOk = timingSafeStringEqual(
      cleanUser.toLowerCase(),
      this.storedRecord.username.toLowerCase()
    );
    const passOk = verifyAdminPassword(
      password,
      this.storedRecord.salt,
      this.storedRecord.passwordHash
    );
    if (!userOk || !passOk) {
      return { ok: false, status: 401, error: '管理员账号或密码不正确。' };
    }
    return {
      ok: true,
      token: this.issueToken(this.storedRecord.username),
      username: this.storedRecord.username,
    };
  }

  issueToken(username: string): string {
    const payload: AdminTokenPayload = {
      sub: username,
      role: 'admin',
      jti: crypto.randomBytes(12).toString('hex'),
      exp: Date.now() + TOKEN_TTL_MS,
    };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto
      .createHmac('sha256', this.signingSecret)
      .update(encoded)
      .digest('base64url');
    return `${encoded}.${sig}`;
  }

  verifyToken(token: string): AdminTokenPayload | null {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.signingSecret)
      .update(encoded)
      .digest('base64url');
    if (!timingSafeStringEqual(sig, expectedSig)) return null;

    try {
      const payload = JSON.parse(
        Buffer.from(encoded, 'base64url').toString('utf8')
      ) as Partial<AdminTokenPayload>;
      if (
        payload.role !== 'admin' ||
        typeof payload.sub !== 'string' ||
        typeof payload.jti !== 'string' ||
        typeof payload.exp !== 'number'
      ) {
        return null;
      }
      if (Date.now() > payload.exp) return null;
      if (this.revokedJtis.has(payload.jti)) return null;
      return payload as AdminTokenPayload;
    } catch {
      return null;
    }
  }

  revokeToken(token: string): void {
    const payload = this.verifyToken(token);
    if (payload) {
      this.revokedJtis.add(payload.jti);
    }
  }
}
