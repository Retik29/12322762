// Shared notification types used across the frontend

export interface NotificationData {
  ID: string;
  Type: 'Event' | 'Result' | 'Placement';
  Message: string;
  Timestamp: string;
  Score?: number;
}
