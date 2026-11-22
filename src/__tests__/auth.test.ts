import { signToken, verifyToken } from '../lib/auth';

describe('Auth Utility Tests', () => {
  it('should sign and verify token successfully', () => {
    const payload = { id: 1, username: 'testuser', role: 'user' };
    const token = signToken(payload);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const verified = verifyToken(token);
    expect(verified).not.toBeNull();
    const payloadVerified = verified as any;
    expect(payloadVerified.id).toBe(1);
    expect(payloadVerified.username).toBe('testuser');
    expect(payloadVerified.role).toBe('user');
  });

  it('should return null for invalid token signature', () => {
    const payload = { id: 1, username: 'testuser' };
    const token = signToken(payload);
    
    const tamperedToken = token + 'tampered';
    const verified = verifyToken(tamperedToken);
    
    expect(verified).toBeNull();
  });
});
