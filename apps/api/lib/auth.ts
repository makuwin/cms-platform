import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export type Role = 'admin' | 'editor' | 'author' | 'viewer';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: string[];
};

export type AuthPayload = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export const permissions: Record<Role, string[]> = {
  admin: ['*'],
  editor: ['content:*', 'media:*', 'comments:moderate'],
  author: ['content:create', 'content:edit:own', 'media:upload'],
  viewer: ['content:read', 'comments:create'],
};

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

const accessSecret = process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';

export function buildPermissions(role: Role, extras: string[] = []) {
  const rolePerms = permissions[role] ?? [];
  if (rolePerms.includes('*')) return ['*'];
  return Array.from(new Set([...rolePerms, ...extras]));
}

export async function hashPassword(password: string) {
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 10);
  return bcrypt.hash(password, rounds);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signTokens(user: AuthUser): AuthPayload {
  const payload = { user };
  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });
  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
  });
  return { user, accessToken, refreshToken };
}

export function verifyAccessToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, accessSecret) as { user: AuthUser };
    return decoded.user;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, refreshSecret) as { user: AuthUser };
    return decoded.user;
  } catch {
    return null;
  }
}

export function hasPermission(user: AuthUser | null, action: string) {
  if (!user) return false;
  if (user.permissions.includes('*')) return true;
  return (
    user.permissions.includes(action) ||
    user.permissions.some((perm) => {
      if (!perm.includes(':') || !action.includes(':')) return false;
      const [permDomain, permAction] = perm.split(':');
      const [actionDomain, actionAction] = action.split(':');
      return (
        (permDomain === '*' || permDomain === actionDomain) &&
        (permAction === '*' || permAction === actionAction)
      );
    })
  );
}

export function getBearerToken(req: NextRequest | Request) {
  const headerToken = req.headers.get('authorization');

  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.slice(7);
  }

  if (req instanceof NextRequest) {
    const cookieToken = req.cookies.get('access_token')?.value;
    if (cookieToken) return cookieToken;
  }

  return null;
}

export function getAuthUserFromRequest(req: NextRequest | Request) {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyAccessToken(token);
}
