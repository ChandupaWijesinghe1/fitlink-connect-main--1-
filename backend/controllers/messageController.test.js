import { describe, test, expect, jest } from '@jest/globals';
import * as messageController from './messageController.js';

describe('Message Controller - Basic Structure Tests', () => {
  // ✅ Test 1: Check if functions are exported
  test('should export sendMessage function', () => {
    expect(messageController.sendMessage).toBeDefined();
    expect(typeof messageController.sendMessage).toBe('function');
  });

  test('should export shareSchedule function', () => {
    expect(messageController.shareSchedule).toBeDefined();
    expect(typeof messageController.shareSchedule).toBe('function');
  });

  test('should export markAsRead function', () => {
    expect(messageController.markAsRead).toBeDefined();
    expect(typeof messageController.markAsRead).toBe('function');
  });

  // ✅ Test 2: Verify request/response handling
  test('should handle missing message content', async () => {
    const req = { 
      body: { receiverId: '507f1f77bcf86cd799439011' },
      user: { _id: '507f1f77bcf86cd799439010' }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await messageController.sendMessage(req, res);

    expect(res.status).toHaveBeenCalled();
  }, 10000);
});

