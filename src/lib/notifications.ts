// Notification types and utilities for GrowBucks

export type NotificationType = 'interest' | 'deposit' | 'withdrawal' | 'goal' | 'allowance';

export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  interest_email: boolean;
  interest_push: boolean;
  deposits_email: boolean;
  deposits_push: boolean;
  withdrawals_email: boolean;
  withdrawals_push: boolean;
  goals_email: boolean;
  goals_push: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // "HH:MM" format
  quiet_hours_end: string;   // "HH:MM" format
}

export interface Notification {
  id: string;
  user_id: string;
  child_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  emoji?: string;
  amount_cents?: number;
  read_at?: string;
  created_at: string;
}

/**
 * Default notification settings for new users
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_enabled: true,
  push_enabled: true,
  interest_email: true,
  interest_push: true,
  deposits_email: true,
  deposits_push: true,
  withdrawals_email: true,
  withdrawals_push: true,
  goals_email: true,
  goals_push: false,
  quiet_hours_enabled: false,
  quiet_hours_start: '21:00',
  quiet_hours_end: '07:00',
};

/**
 * Notification type metadata for UI display
 */
export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, {
  title: string;
  description: string;
  emoji: string;
  color: string;
}> = {
  interest: {
    title: 'Daily Interest',
    description: 'Get notified when interest is added to accounts',
    emoji: '📈',
    color: '#2ECC71', // Green
  },
  deposit: {
    title: 'Deposits',
    description: 'Notifications when GrowBucks are added',
    emoji: '💰',
    color: '#3498DB', // Blue
  },
  withdrawal: {
    title: 'Withdrawal Requests',
    description: 'Get alerted when a child requests a withdrawal',
    emoji: '🔔',
    color: '#E74C3C', // Red
  },
  goal: {
    title: 'Goals Achieved',
    description: 'Celebrate when savings goals are reached',
    emoji: '🎯',
    color: '#F39C12', // Orange
  },
  allowance: {
    title: 'Allowance',
    description: 'Notifications for recurring allowance deposits',
    emoji: '📅',
    color: '#9B59B6', // Purple
  },
};

/**
 * Parse a time string in "HH:MM" format to minutes since midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  // Validate format: must be exactly HH:MM with 2 digits each
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time values: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * Format time from "HH:MM" (24h) to "h:MM AM/PM" (12h)
 */
export function formatTimeForDisplay(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    return time24; // Return as-is if invalid
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if a given time is within quiet hours
 * Handles cases where quiet hours span midnight (e.g., 21:00 - 07:00)
 */
export function isWithinQuietHours(
  currentTime: Date,
  settings: Pick<NotificationSettings, 'quiet_hours_enabled' | 'quiet_hours_start' | 'quiet_hours_end'>
): boolean {
  if (!settings.quiet_hours_enabled) {
    return false;
  }

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const startMinutes = parseTimeToMinutes(settings.quiet_hours_start);
  const endMinutes = parseTimeToMinutes(settings.quiet_hours_end);

  if (startMinutes <= endMinutes) {
    // Normal range (e.g., 09:00 - 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Spans midnight (e.g., 21:00 - 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Check if notifications of a specific type should be sent via a specific channel
 */
export function shouldSendNotification(
  type: NotificationType,
  channel: 'email' | 'push',
  settings: NotificationSettings,
  currentTime?: Date
): boolean {
  // Check global channel toggle
  const globalEnabled = channel === 'email' ? settings.email_enabled : settings.push_enabled;
  if (!globalEnabled) {
    return false;
  }

  // Check quiet hours
  if (currentTime && isWithinQuietHours(currentTime, settings)) {
    return false;
  }

  // Check type-specific setting
  const typeKey = type === 'deposit' ? 'deposits' : type === 'withdrawal' ? 'withdrawals' : type;
  const settingKey = `${typeKey}_${channel}` as keyof NotificationSettings;
  return settings[settingKey] as boolean ?? false;
}

/**
 * Generate a notification title based on type and amount
 */
export function generateNotificationTitle(type: NotificationType, amountCents?: number): string {
  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  switch (type) {
    case 'interest':
      return amountCents ? `Interest Earned: ${formatAmount(amountCents)}` : 'Interest Added!';
    case 'deposit':
      return amountCents ? `Deposit: ${formatAmount(amountCents)}` : 'New Deposit!';
    case 'withdrawal':
      return amountCents ? `Withdrawal Request: ${formatAmount(amountCents)}` : 'Withdrawal Request';
    case 'goal':
      return 'Goal Achieved! 🎉';
    case 'allowance':
      return amountCents ? `Allowance: ${formatAmount(amountCents)}` : 'Allowance Deposited';
  }
}

/**
 * Generate a child-friendly notification message
 */
export function generateNotificationMessage(
  type: NotificationType,
  childName: string,
  amountCents?: number,
  goalName?: string
): string {
  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  
  switch (type) {
    case 'interest':
      return amountCents 
        ? `${childName} earned ${formatAmount(amountCents)} in interest today!`
        : `${childName}'s savings grew overnight!`;
    case 'deposit':
      return amountCents
        ? `${formatAmount(amountCents)} was added to ${childName}'s account.`
        : `GrowBucks were added to ${childName}'s account.`;
    case 'withdrawal':
      return amountCents
        ? `${childName} requested to withdraw ${formatAmount(amountCents)}.`
        : `${childName} made a withdrawal request.`;
    case 'goal':
      return goalName
        ? `${childName} reached their "${goalName}" savings goal!`
        : `${childName} achieved a savings goal!`;
    case 'allowance':
      return amountCents
        ? `${childName}'s weekly allowance of ${formatAmount(amountCents)} was deposited.`
        : `${childName}'s allowance was deposited.`;
  }
}

/**
 * Validate quiet hours time format
 */
export function validateQuietHoursTime(timeStr: string): { valid: boolean; error?: string } {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) {
    return { valid: false, error: 'Time must be in HH:MM format' };
  }
  try {
    parseTimeToMinutes(timeStr);
    return { valid: true };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

/**
 * Get the emoji for a notification type
 */
export function getNotificationEmoji(type: NotificationType): string {
  return NOTIFICATION_TYPE_CONFIG[type]?.emoji ?? '📣';
}

/**
 * Get the color for a notification type
 */
export function getNotificationColor(type: NotificationType): string {
  return NOTIFICATION_TYPE_CONFIG[type]?.color ?? '#7F8C8D';
}
