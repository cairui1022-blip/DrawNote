import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AdminAuthManager } from './adminAuth';

function makeTempStorePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'drawnote-admin-test-'));
  return path.join(dir, 'admin-auth.json');
}

test('AdminAuthManager enforces one-time scrypt claim, verifies login, and revokes Bearer tokens', () => {
  const prevPass = process.env.ADMIN_PASSCODE;
  const prevUser = process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSCODE;
  delete process.env.ADMIN_USERNAME;

  try {
    const storePath = makeTempStorePath();
    const mgr = new AdminAuthManager(storePath);

    assert.deepEqual(mgr.getStatus(), {
      initialized: false,
      envConfigured: false,
    });

    // Reject weak password on setup
    const weak = mgr.claimInitialAdmin('admin', 'short');
    assert.equal(weak.ok, false);

    // One-time claim succeeds and stores scrypt hash (never plaintext)
    const claimed = mgr.claimInitialAdmin('chief_admin', 'MyStrongPass2026!');
    assert.equal(claimed.ok, true);
    if (!claimed.ok) return;

    const rawOnDisk = fs.readFileSync(storePath, 'utf-8');
    assert.equal(rawOnDisk.includes('MyStrongPass2026!'), false);

    // Subsequent claim attempt is locked with 409
    const secondClaim = mgr.claimInitialAdmin('attacker', 'AnotherPass2026!');
    assert.equal(secondClaim.ok, false);
    if (!secondClaim.ok) {
      assert.equal(secondClaim.status, 409);
    }

    // Token verification & revocation
    const verified = mgr.verifyToken(claimed.token);
    assert.equal(verified?.sub, 'chief_admin');
    assert.equal(verified?.role, 'admin');

    mgr.revokeToken(claimed.token);
    assert.equal(mgr.verifyToken(claimed.token), null);

    // Wrong password rejected; correct password succeeds
    const badLogin = mgr.login('chief_admin', 'WrongPass123!');
    assert.equal(badLogin.ok, false);
    const goodLogin = mgr.login('chief_admin', 'MyStrongPass2026!');
    assert.equal(goodLogin.ok, true);
  } finally {
    if (prevPass !== undefined) process.env.ADMIN_PASSCODE = prevPass;
    if (prevUser !== undefined) process.env.ADMIN_USERNAME = prevUser;
  }
});

test('ADMIN_PASSCODE env var always overrides claimed fallback hash', () => {
  const prevPass = process.env.ADMIN_PASSCODE;
  const prevUser = process.env.ADMIN_USERNAME;
  delete process.env.ADMIN_PASSCODE;
  delete process.env.ADMIN_USERNAME;

  try {
    const storePath = makeTempStorePath();
    const mgr = new AdminAuthManager(storePath);
    const claimed = mgr.claimInitialAdmin('local_admin', 'LocalPass2026!');
    assert.equal(claimed.ok, true);

    process.env.ADMIN_USERNAME = 'superadmin';
    process.env.ADMIN_PASSCODE = 'EnvOverrideSecret99!';

    const status = mgr.getStatus();
    assert.equal(status.initialized, true);
    assert.equal(status.envConfigured, true);
    assert.equal(status.adminUsername, 'superadmin');

    // Old claimed credentials must now fail
    assert.equal(mgr.login('local_admin', 'LocalPass2026!').ok, false);
    // Env credentials must succeed
    const envOk = mgr.login('superadmin', 'EnvOverrideSecret99!');
    assert.equal(envOk.ok, true);
  } finally {
    if (prevPass !== undefined) {
      process.env.ADMIN_PASSCODE = prevPass;
    } else {
      delete process.env.ADMIN_PASSCODE;
    }
    if (prevUser !== undefined) {
      process.env.ADMIN_USERNAME = prevUser;
    } else {
      delete process.env.ADMIN_USERNAME;
    }
  }
});
