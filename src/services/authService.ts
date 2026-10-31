import { db } from '@/db/dexie';
import { hashPassword, verifyPassword } from '@/db/crypto';
import { auditService } from './auditService';
import type { User, UserRole } from '@/types';

const SESSION_KEY = 'nidhi_auth_session';

export interface AuthSession {
  user: User;
  token: string;
  loginTime: string;
}

export const authService = {
  /**
   * Authenticates user against IndexedDB users table
   */
  async login(email: string, plainTextPassword: string): Promise<User> {
    const user = await db.users.where('email').equalsIgnoreCase(email.trim()).first();
    if (!user) {
      throw new Error('Invalid email or password. No account registered with this email.');
    }

    if (!user.isActive) {
      throw new Error('Account deactivated. Contact system administrator.');
    }

    const isValid = await verifyPassword(plainTextPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    // Update last login
    const now = new Date().toISOString();
    await db.users.update(user.id, { lastLogin: now, updatedAt: now });

    // Save session in localStorage (session persistence)
    const session: AuthSession = {
      user: { ...user, lastLogin: now },
      token: `NIDHI-TOK-${Date.now()}`,
      loginTime: now,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Audit log
    await auditService.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      institutionId: user.institutionId,
      action: 'USER_LOGIN',
      category: 'AUTH',
      description: `User ${user.name} (${user.role}) successfully authenticated.`,
    });

    return session.user;
  },

  /**
   * Restores session from localStorage and verifies user is still active in DB
   */
  async getStoredSession(): Promise<User | null> {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session: AuthSession = JSON.parse(stored);
      if (!session.user?.id) return null;

      // Verify user exists and is active in IndexedDB
      const current = await db.users.get(session.user.id);
      if (!current || !current.isActive) {
        this.logout();
        return null;
      }

      return current;
    } catch {
      this.logout();
      return null;
    }
  },

  /**
   * Logs out user, clears session and records audit event
   */
  async logout(currentUser?: User | null): Promise<void> {
    if (currentUser) {
      await auditService.log({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        institutionId: currentUser.institutionId,
        action: 'USER_LOGOUT',
        category: 'AUTH',
        description: `User ${currentUser.name} (${currentUser.role}) logged out.`,
      });
    }
    localStorage.removeItem(SESSION_KEY);
  },

  /**
   * Updates password after verifying old password
   */
  async changePassword(userId: string, oldPlain: string, newPlain: string): Promise<void> {
    const user = await db.users.get(userId);
    if (!user) throw new Error('User not found.');

    const isValid = await verifyPassword(oldPlain, user.passwordHash);
    if (!isValid) throw new Error('Current password does not match.');

    if (newPlain.length < 6) throw new Error('New password must be at least 6 characters long.');

    const newHash = await hashPassword(newPlain);
    await db.users.update(userId, { passwordHash: newHash, updatedAt: new Date().toISOString() });

    await auditService.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'PASSWORD_CHANGED',
      category: 'AUTH',
      description: `User ${user.name} updated their account password.`,
    });
  },

  /**
   * Quick role-switch login helper for hackathon live demo
   */
  async quickDemoLogin(role: UserRole): Promise<User> {
    const user = await db.users.where('role').equals(role).first();
    if (!user) {
      throw new Error(`No demo user found for role ${role}`);
    }

    const now = new Date().toISOString();
    await db.users.update(user.id, { lastLogin: now, updatedAt: now });

    const session: AuthSession = {
      user: { ...user, lastLogin: now },
      token: `NIDHI-DEMO-TOK-${Date.now()}`,
      loginTime: now,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    await auditService.log({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      institutionId: user.institutionId,
      action: 'DEMO_QUICK_SWITCH',
      category: 'AUTH',
      description: `Demo actor switched to ${user.name} (${role}).`,
    });

    return session.user;
  },
};
