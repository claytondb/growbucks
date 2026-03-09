import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_TYPE_CONFIG,
  parseTimeToMinutes,
  formatTimeForDisplay,
  isWithinQuietHours,
  shouldSendNotification,
  generateNotificationTitle,
  generateNotificationMessage,
  validateQuietHoursTime,
  getNotificationEmoji,
  getNotificationColor,
  type NotificationSettings,
  type NotificationType,
} from './notifications';

describe('DEFAULT_NOTIFICATION_SETTINGS', () => {
  it('has all required fields', () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('email_enabled');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('push_enabled');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('interest_email');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('interest_push');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('deposits_email');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('deposits_push');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('withdrawals_email');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('withdrawals_push');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('goals_email');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('goals_push');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('quiet_hours_enabled');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('quiet_hours_start');
    expect(DEFAULT_NOTIFICATION_SETTINGS).toHaveProperty('quiet_hours_end');
  });

  it('has sensible defaults', () => {
    expect(DEFAULT_NOTIFICATION_SETTINGS.email_enabled).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.push_enabled).toBe(true);
    expect(DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_enabled).toBe(false);
    expect(DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_start).toBe('21:00');
    expect(DEFAULT_NOTIFICATION_SETTINGS.quiet_hours_end).toBe('07:00');
  });

  it('has goals_push disabled by default', () => {
    // Less urgent notifications default to off for push
    expect(DEFAULT_NOTIFICATION_SETTINGS.goals_push).toBe(false);
  });
});

describe('NOTIFICATION_TYPE_CONFIG', () => {
  it('has config for all notification types', () => {
    const types: NotificationType[] = ['interest', 'deposit', 'withdrawal', 'goal', 'allowance'];
    types.forEach(type => {
      expect(NOTIFICATION_TYPE_CONFIG[type]).toBeDefined();
      expect(NOTIFICATION_TYPE_CONFIG[type].title).toBeDefined();
      expect(NOTIFICATION_TYPE_CONFIG[type].description).toBeDefined();
      expect(NOTIFICATION_TYPE_CONFIG[type].emoji).toBeDefined();
      expect(NOTIFICATION_TYPE_CONFIG[type].color).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});

describe('parseTimeToMinutes', () => {
  it('parses valid times correctly', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('01:00')).toBe(60);
    expect(parseTimeToMinutes('12:30')).toBe(750);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('throws for invalid format', () => {
    expect(() => parseTimeToMinutes('9:00')).toThrow();
    expect(() => parseTimeToMinutes('09:0')).toThrow();
    expect(() => parseTimeToMinutes('abc')).toThrow();
    expect(() => parseTimeToMinutes('')).toThrow();
  });

  it('throws for invalid values', () => {
    expect(() => parseTimeToMinutes('24:00')).toThrow();
    expect(() => parseTimeToMinutes('12:60')).toThrow();
    expect(() => parseTimeToMinutes('-1:00')).toThrow();
  });
});

describe('formatTimeForDisplay', () => {
  it('formats midnight correctly', () => {
    expect(formatTimeForDisplay('00:00')).toBe('12:00 AM');
  });

  it('formats noon correctly', () => {
    expect(formatTimeForDisplay('12:00')).toBe('12:00 PM');
  });

  it('formats morning times correctly', () => {
    expect(formatTimeForDisplay('09:30')).toBe('9:30 AM');
    expect(formatTimeForDisplay('11:59')).toBe('11:59 AM');
  });

  it('formats afternoon/evening times correctly', () => {
    expect(formatTimeForDisplay('13:00')).toBe('1:00 PM');
    expect(formatTimeForDisplay('21:00')).toBe('9:00 PM');
    expect(formatTimeForDisplay('23:59')).toBe('11:59 PM');
  });

  it('pads single-digit minutes', () => {
    expect(formatTimeForDisplay('09:05')).toBe('9:05 AM');
  });

  it('returns original string for invalid format', () => {
    expect(formatTimeForDisplay('invalid')).toBe('invalid');
    expect(formatTimeForDisplay('abc:def')).toBe('abc:def');
  });
});

describe('isWithinQuietHours', () => {
  it('returns false when quiet hours disabled', () => {
    const time = new Date('2026-03-04T22:00:00');
    const settings = {
      quiet_hours_enabled: false,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
    };
    expect(isWithinQuietHours(time, settings)).toBe(false);
  });

  it('handles overnight quiet hours (21:00-07:00)', () => {
    const settings = {
      quiet_hours_enabled: true,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
    };

    // During quiet hours
    expect(isWithinQuietHours(new Date('2026-03-04T22:00:00'), settings)).toBe(true);
    expect(isWithinQuietHours(new Date('2026-03-04T23:59:00'), settings)).toBe(true);
    expect(isWithinQuietHours(new Date('2026-03-05T00:00:00'), settings)).toBe(true);
    expect(isWithinQuietHours(new Date('2026-03-05T06:59:00'), settings)).toBe(true);

    // Outside quiet hours
    expect(isWithinQuietHours(new Date('2026-03-04T07:00:00'), settings)).toBe(false);
    expect(isWithinQuietHours(new Date('2026-03-04T12:00:00'), settings)).toBe(false);
    expect(isWithinQuietHours(new Date('2026-03-04T20:59:00'), settings)).toBe(false);
  });

  it('handles daytime quiet hours (09:00-17:00)', () => {
    const settings = {
      quiet_hours_enabled: true,
      quiet_hours_start: '09:00',
      quiet_hours_end: '17:00',
    };

    // During quiet hours
    expect(isWithinQuietHours(new Date('2026-03-04T09:00:00'), settings)).toBe(true);
    expect(isWithinQuietHours(new Date('2026-03-04T12:00:00'), settings)).toBe(true);
    expect(isWithinQuietHours(new Date('2026-03-04T16:59:00'), settings)).toBe(true);

    // Outside quiet hours
    expect(isWithinQuietHours(new Date('2026-03-04T08:59:00'), settings)).toBe(false);
    expect(isWithinQuietHours(new Date('2026-03-04T17:00:00'), settings)).toBe(false);
    expect(isWithinQuietHours(new Date('2026-03-04T22:00:00'), settings)).toBe(false);
  });

  it('handles boundary cases at exactly start time', () => {
    const settings = {
      quiet_hours_enabled: true,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
    };
    expect(isWithinQuietHours(new Date('2026-03-04T21:00:00'), settings)).toBe(true);
  });

  it('handles boundary cases at exactly end time', () => {
    const settings = {
      quiet_hours_enabled: true,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
    };
    expect(isWithinQuietHours(new Date('2026-03-04T07:00:00'), settings)).toBe(false);
  });
});

describe('shouldSendNotification', () => {
  const enabledSettings: NotificationSettings = {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    quiet_hours_enabled: false,
  };

  it('respects global email toggle', () => {
    const disabled = { ...enabledSettings, email_enabled: false };
    expect(shouldSendNotification('interest', 'email', disabled)).toBe(false);
    expect(shouldSendNotification('interest', 'email', enabledSettings)).toBe(true);
  });

  it('respects global push toggle', () => {
    const disabled = { ...enabledSettings, push_enabled: false };
    expect(shouldSendNotification('interest', 'push', disabled)).toBe(false);
  });

  it('respects type-specific settings', () => {
    const disabled = { ...enabledSettings, interest_email: false };
    expect(shouldSendNotification('interest', 'email', disabled)).toBe(false);
    expect(shouldSendNotification('deposit', 'email', disabled)).toBe(true);
  });

  it('handles deposit type correctly (plural key)', () => {
    const disabled = { ...enabledSettings, deposits_push: false };
    expect(shouldSendNotification('deposit', 'push', disabled)).toBe(false);
    expect(shouldSendNotification('deposit', 'email', disabled)).toBe(true);
  });

  it('handles withdrawal type correctly (plural key)', () => {
    const disabled = { ...enabledSettings, withdrawals_email: false };
    expect(shouldSendNotification('withdrawal', 'email', disabled)).toBe(false);
  });

  it('respects quiet hours', () => {
    const quietSettings = {
      ...enabledSettings,
      quiet_hours_enabled: true,
      quiet_hours_start: '21:00',
      quiet_hours_end: '07:00',
    };
    const duringQuiet = new Date('2026-03-04T22:00:00');
    const outsideQuiet = new Date('2026-03-04T12:00:00');

    expect(shouldSendNotification('interest', 'email', quietSettings, duringQuiet)).toBe(false);
    expect(shouldSendNotification('interest', 'email', quietSettings, outsideQuiet)).toBe(true);
  });

  it('works without currentTime (no quiet hours check)', () => {
    const quietSettings = {
      ...enabledSettings,
      quiet_hours_enabled: true,
    };
    // Without time, quiet hours aren't checked
    expect(shouldSendNotification('interest', 'email', quietSettings)).toBe(true);
  });
});

describe('generateNotificationTitle', () => {
  it('generates interest titles', () => {
    expect(generateNotificationTitle('interest')).toBe('Interest Added!');
    expect(generateNotificationTitle('interest', 150)).toBe('Interest Earned: $1.50');
  });

  it('generates deposit titles', () => {
    expect(generateNotificationTitle('deposit')).toBe('New Deposit!');
    expect(generateNotificationTitle('deposit', 2500)).toBe('Deposit: $25.00');
  });

  it('generates withdrawal titles', () => {
    expect(generateNotificationTitle('withdrawal')).toBe('Withdrawal Request');
    expect(generateNotificationTitle('withdrawal', 1000)).toBe('Withdrawal Request: $10.00');
  });

  it('generates goal titles', () => {
    expect(generateNotificationTitle('goal')).toBe('Goal Achieved! 🎉');
    expect(generateNotificationTitle('goal', 5000)).toBe('Goal Achieved! 🎉');
  });

  it('generates allowance titles', () => {
    expect(generateNotificationTitle('allowance')).toBe('Allowance Deposited');
    expect(generateNotificationTitle('allowance', 500)).toBe('Allowance: $5.00');
  });
});

describe('generateNotificationMessage', () => {
  it('generates interest messages', () => {
    expect(generateNotificationMessage('interest', 'Emma')).toBe("Emma's savings grew overnight!");
    expect(generateNotificationMessage('interest', 'Emma', 42)).toBe('Emma earned $0.42 in interest today!');
  });

  it('generates deposit messages', () => {
    expect(generateNotificationMessage('deposit', 'Jake')).toBe("GrowBucks were added to Jake's account.");
    expect(generateNotificationMessage('deposit', 'Jake', 1500)).toBe("$15.00 was added to Jake's account.");
  });

  it('generates withdrawal messages', () => {
    expect(generateNotificationMessage('withdrawal', 'Mia')).toBe('Mia made a withdrawal request.');
    expect(generateNotificationMessage('withdrawal', 'Mia', 500)).toBe('Mia requested to withdraw $5.00.');
  });

  it('generates goal messages', () => {
    expect(generateNotificationMessage('goal', 'Leo')).toBe('Leo achieved a savings goal!');
    expect(generateNotificationMessage('goal', 'Leo', undefined, 'New Bike')).toBe('Leo reached their "New Bike" savings goal!');
  });

  it('generates allowance messages', () => {
    expect(generateNotificationMessage('allowance', 'Zoe')).toBe("Zoe's allowance was deposited.");
    expect(generateNotificationMessage('allowance', 'Zoe', 500)).toBe("Zoe's weekly allowance of $5.00 was deposited.");
  });
});

describe('validateQuietHoursTime', () => {
  it('accepts valid times', () => {
    expect(validateQuietHoursTime('00:00')).toEqual({ valid: true });
    expect(validateQuietHoursTime('12:30')).toEqual({ valid: true });
    expect(validateQuietHoursTime('23:59')).toEqual({ valid: true });
  });

  it('rejects invalid format', () => {
    expect(validateQuietHoursTime('9:00').valid).toBe(false);
    expect(validateQuietHoursTime('09:0').valid).toBe(false);
    expect(validateQuietHoursTime('0900').valid).toBe(false);
    expect(validateQuietHoursTime('').valid).toBe(false);
  });

  it('rejects invalid values', () => {
    expect(validateQuietHoursTime('24:00').valid).toBe(false);
    expect(validateQuietHoursTime('12:60').valid).toBe(false);
  });

  it('includes error message', () => {
    const result = validateQuietHoursTime('bad');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('getNotificationEmoji', () => {
  it('returns correct emoji for each type', () => {
    expect(getNotificationEmoji('interest')).toBe('📈');
    expect(getNotificationEmoji('deposit')).toBe('💰');
    expect(getNotificationEmoji('withdrawal')).toBe('🔔');
    expect(getNotificationEmoji('goal')).toBe('🎯');
    expect(getNotificationEmoji('allowance')).toBe('📅');
  });

  it('returns fallback for unknown type', () => {
    expect(getNotificationEmoji('unknown' as NotificationType)).toBe('📣');
  });
});

describe('getNotificationColor', () => {
  it('returns correct color for each type', () => {
    expect(getNotificationColor('interest')).toBe('#2ECC71');
    expect(getNotificationColor('deposit')).toBe('#3498DB');
    expect(getNotificationColor('withdrawal')).toBe('#E74C3C');
    expect(getNotificationColor('goal')).toBe('#F39C12');
    expect(getNotificationColor('allowance')).toBe('#9B59B6');
  });

  it('returns fallback color for unknown type', () => {
    expect(getNotificationColor('unknown' as NotificationType)).toBe('#7F8C8D');
  });
});
