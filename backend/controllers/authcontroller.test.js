import { describe, test, expect, jest } from '@jest/globals';
import * as authController from './authController.js';

describe('Auth Controller - Basic Structure Tests', () => {
  // ✅ Test 1: Check if functions are exported
  test('should export signup function', () => {
    expect(authController.signup).toBeDefined();
    expect(typeof authController.signup).toBe('function');
  });

  test('should export login function', () => {
    expect(authController.login).toBeDefined();
    expect(typeof authController.login).toBe('function');
  });

  test('should export trainerSignup function', () => {
    expect(authController.trainerSignup).toBeDefined();
    expect(typeof authController.trainerSignup).toBe('function');
  });

  test('should export trainerLogin function', () => {
    expect(authController.trainerLogin).toBeDefined();
    expect(typeof authController.trainerLogin).toBe('function');
  });

  // ✅ Test 2: Verify request/response handling
  test('should handle missing request body gracefully', async () => {
    const req = { body: null, headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalled();
  });

  test('should reject request without email', async () => {
    const req = { body: { password: 'pass123' }, headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('should reject request without password', async () => {
    const req = { body: { email: 'test@example.com' }, headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});