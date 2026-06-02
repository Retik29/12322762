import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { Log, initLogger, getAuthToken } from 'logging_middleware';
import { Collection, MongoClient } from 'mongodb';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize the logger using environment variables
initLogger({
  email: process.env.USER_EMAIL || '',
  name: process.env.USER_NAME || '',
  rollNo: process.env.USER_ROLLNO || '',
  accessCode: process.env.USER_ACCESS_CODE || '',
  clientID: process.env.USER_CLIENT_ID || '',
  clientSecret: process.env.USER_CLIENT_SECRET || ''
});

interface Notification {
  ID: string;
  Type: "Event" | "Result" | "Placement";
  Message: string;
  Timestamp: string;
  isRead?: boolean;
}

interface PriorityNotification extends Notification {
  Score: number;
}

const EVALUATION_API_BASE_URL = process.env.EVALUATION_API_BASE_URL || 'http://4.224.186.213/evaluation-service';
const USE_REMOTE_NOTIFICATIONS = process.env.USE_REMOTE_NOTIFICATIONS === 'true';
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 10_000);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'campus_notify';
const MONGO_CONNECT_TIMEOUT_MS = Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 2_000);

const fallbackNotifications: Notification[] = [
  {
    ID: 'fallback-placement-001',
    Type: 'Placement',
    Message: 'Placement drive opened for Software Engineer roles. Register before the deadline.',
    Timestamp: '2026-05-14T09:30:00.000Z',
    isRead: false
  },
  {
    ID: 'fallback-result-001',
    Type: 'Result',
    Message: 'Mid-term result update is available in the student portal.',
    Timestamp: '2026-05-14T06:45:00.000Z',
    isRead: false
  },
  {
    ID: 'fallback-event-001',
    Type: 'Event',
    Message: 'Cloud computing workshop starts tomorrow in Seminar Hall A.',
    Timestamp: '2026-05-13T12:00:00.000Z',
    isRead: false
  },
  {
    ID: 'fallback-placement-002',
    Type: 'Placement',
    Message: 'Resume shortlisting round begins for the campus recruitment program.',
    Timestamp: '2026-05-13T08:15:00.000Z',
    isRead: false
  },
  {
    ID: 'fallback-result-002',
    Type: 'Result',
    Message: 'Project evaluation marks have been published by the department.',
    Timestamp: '2026-05-12T14:20:00.000Z',
    isRead: false
  },
  {
    ID: 'fallback-event-002',
    Type: 'Event',
    Message: 'Coding club is hosting a mock interview practice session this week.',
    Timestamp: '2026-05-12T10:00:00.000Z',
    isRead: false
  },
  {
    ID: 'fallback-placement-003',
    Type: 'Placement',
    Message: 'Pre-placement talk scheduled for final year students.',
    Timestamp: '2026-05-11T15:30:00.000Z',
    isRead: false
  },
  {
    ID: 'fallback-result-003',
    Type: 'Result',
    Message: 'Internal assessment recheck window is now open.',
    Timestamp: '2026-05-11T07:50:00.000Z',
    isRead: true
  },
  {
    ID: 'fallback-event-003',
    Type: 'Event',
    Message: 'Department hackathon registrations close tonight.',
    Timestamp: '2026-05-10T16:10:00.000Z',
    isRead: false
  },
  {
    ID: 'fallback-placement-004',
    Type: 'Placement',
    Message: 'Aptitude test slot booking is available for eligible students.',
    Timestamp: '2026-05-10T05:25:00.000Z',
    isRead: true
  }
];

let memoryNotifications = [...fallbackNotifications];
let mongoClient: MongoClient | null = null;
let mongoCollection: Collection<Notification> | null = null;
let mongoConnectAttempted = false;

const safeLog = (level: 'debug' | 'info' | 'warn' | 'error' | 'fatal', pkg: Parameters<typeof Log>[2], message: string) => {
  void Log('backend', level, pkg, message);
};

const getWeight = (type: Notification['Type']): number => {
  switch (type) {
    case 'Placement': return 3;
    case 'Result': return 2;
    case 'Event': return 1;
    default: return 0;
  }
};

const calculateScore = (notification: Notification): number => {
  const weight = getWeight(notification.Type);
  const timestampMs = new Date(notification.Timestamp).getTime();
  return (weight * 10_000_000_000_000) + timestampMs;
};

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const upstreamMessage = typeof error.response?.data === 'object'
      ? JSON.stringify(error.response.data)
      : error.response?.data;
    return [status ? `status ${status}` : undefined, upstreamMessage || error.message]
      .filter(Boolean)
      .join(': ');
  }

  return error instanceof Error ? error.message : 'Unknown error';
};

const readPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isNotificationType = (value: unknown): value is Notification['Type'] => {
  return value === 'Event' || value === 'Result' || value === 'Placement';
};

const getMongoCollection = async (): Promise<Collection<Notification> | null> => {
  if (mongoCollection) return mongoCollection;
  if (mongoConnectAttempted) return null;

  mongoConnectAttempted = true;
  try {
    mongoClient = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: MONGO_CONNECT_TIMEOUT_MS
    });
    await mongoClient.connect();
    mongoCollection = mongoClient.db(MONGO_DB_NAME).collection<Notification>('notifications');
    await mongoCollection.createIndex({ ID: 1 }, { unique: true });
    await mongoCollection.createIndex({ Type: 1, Timestamp: -1 });
    await mongoCollection.createIndex({ isRead: 1, Timestamp: -1 });

    const existingCount = await mongoCollection.countDocuments();
    if (existingCount === 0) {
      await mongoCollection.insertMany(fallbackNotifications);
    }

    safeLog('info', 'db', 'MongoDB connected for notification persistence');
    return mongoCollection;
  } catch (error: unknown) {
    mongoCollection = null;
    if (mongoClient) {
      await mongoClient.close().catch(() => undefined);
      mongoClient = null;
    }
    safeLog('warn', 'db', `MongoDB unavailable, using memory store: ${getErrorMessage(error)}`);
    return null;
  }
};

const filterAndPageNotifications = (
  notifications: Notification[],
  limit: number,
  page: number,
  notificationType?: string,
  unreadOnly = false
) => {
  const filtered = notifications
    .filter(notification => !isNotificationType(notificationType) || notification.Type === notificationType)
    .filter(notification => !unreadOnly || notification.isRead !== true)
    .sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());

  const startIndex = (page - 1) * limit;
  const pagedNotifications = filtered.slice(startIndex, startIndex + limit);

  return {
    success: true,
    page,
    limit,
    total: filtered.length,
    notifications: pagedNotifications
  };
};

const getLocalPage = async (limit: number, page: number, notificationType?: string, unreadOnly = false) => {
  const collection = await getMongoCollection();
  if (collection) {
    const query: Record<string, unknown> = {};
    if (isNotificationType(notificationType)) query.Type = notificationType;
    if (unreadOnly) query.isRead = { $ne: true };

    const total = await collection.countDocuments(query);
    const notifications = await collection
      .find(query, { projection: { _id: 0 } })
      .sort({ Timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return {
      success: true,
      source: 'mongo',
      page,
      limit,
      total,
      notifications
    };
  }

  return {
    ...filterAndPageNotifications(memoryNotifications, limit, page, notificationType, unreadOnly),
    source: 'memory'
  };
};

const saveNotifications = async (notifications: Notification[]) => {
  const collection = await getMongoCollection();
  const normalized = notifications.map(notification => ({
    ...notification,
    isRead: notification.isRead ?? false
  }));

  if (collection) {
    await Promise.all(normalized.map(notification =>
      collection.updateOne(
        { ID: notification.ID },
        { $set: notification },
        { upsert: true }
      )
    ));
    return;
  }

  normalized.forEach(notification => {
    const existingIndex = memoryNotifications.findIndex(item => item.ID === notification.ID);
    if (existingIndex >= 0) {
      memoryNotifications[existingIndex] = notification;
    } else {
      memoryNotifications.push(notification);
    }
  });
};

const createLocalNotification = async (type: Notification['Type'], message: string): Promise<Notification> => {
  const notification: Notification = {
    ID: `local-${Date.now()}`,
    Type: type,
    Message: message,
    Timestamp: new Date().toISOString(),
    isRead: false
  };

  await saveNotifications([notification]);
  return notification;
};

const markLocalNotificationRead = async (id: string): Promise<boolean> => {
  const collection = await getMongoCollection();
  if (collection) {
    const result = await collection.updateOne({ ID: id }, { $set: { isRead: true } });
    return result.matchedCount > 0;
  }

  const notification = memoryNotifications.find(item => item.ID === id);
  if (!notification) return false;
  notification.isRead = true;
  return true;
};

const fetchRemoteNotifications = async (limit?: number, page?: number, notificationType?: string) => {
  if (!USE_REMOTE_NOTIFICATIONS) {
    throw new Error('Remote notifications disabled for MERN demo mode');
  }

  const params: Record<string, string | number> = {};
  if (limit) params.limit = limit;
  if (page) params.page = page;
  if (isNotificationType(notificationType)) params.notification_type = notificationType;

  const token = await getAuthToken();
  const response = await axios.get(`${EVALUATION_API_BASE_URL}/notifications`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    params,
    timeout: UPSTREAM_TIMEOUT_MS
  });

  if (!Array.isArray(response.data?.notifications)) {
    throw new Error('Invalid response format from notification API');
  }

  await saveNotifications(response.data.notifications);
  return response.data;
};

class MinHeap {
  private heap: PriorityNotification[] = [];

  constructor(private maxSize: number) {}

  public insert(item: PriorityNotification) {
    if (this.heap.length < this.maxSize) {
      this.heap.push(item);
      this.bubbleUp(this.heap.length - 1);
    } else if (item.Score > this.heap[0].Score) {
      this.heap[0] = item;
      this.sinkDown(0);
    }
  }

  public getSortedArray(): PriorityNotification[] {
    return [...this.heap].sort((a, b) => b.Score - a.Score);
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (this.heap[parentIdx].Score <= this.heap[index].Score) break;
      this.swap(index, parentIdx);
      index = parentIdx;
    }
  }

  private sinkDown(index: number) {
    const length = this.heap.length;
    while (true) {
      let leftIdx = 2 * index + 1;
      let rightIdx = 2 * index + 2;
      let smallestIdx = index;

      if (leftIdx < length && this.heap[leftIdx].Score < this.heap[smallestIdx].Score) {
        smallestIdx = leftIdx;
      }
      if (rightIdx < length && this.heap[rightIdx].Score < this.heap[smallestIdx].Score) {
        smallestIdx = rightIdx;
      }
      if (smallestIdx === index) break;

      this.swap(index, smallestIdx);
      index = smallestIdx;
    }
  }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}

app.get('/api/notifications', async (req: Request, res: Response) => {
  safeLog("info", "route", "Received notifications request");
  const limit = readPositiveInt(req.query.limit, 10);
  const page = readPositiveInt(req.query.page, 1);
  const notificationType = String(req.query.notification_type || '');

  try {
    const data = await fetchRemoteNotifications(limit, page, notificationType);

    safeLog("info", "service", `Successfully fetched notifications page ${page}`);
    res.status(200).json({ ...data, source: 'remote' });

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const data = await getLocalPage(limit, page, notificationType);

    safeLog("warn", "handler", `Notifications route using local store: ${message}`);
    res.status(200).json({
      ...data,
      message: 'Using MERN local store because the upstream evaluation service is unavailable.'
    });
  }
});

app.get('/api/notifications/unread', async (req: Request, res: Response) => {
  safeLog("info", "route", "Received unread notifications request");

  try {
    const limit = readPositiveInt(req.query.limit, 10);
    const page = readPositiveInt(req.query.page, 1);
    const notificationType = String(req.query.notification_type || '');
    const data = await getLocalPage(limit, page, notificationType, true);

    res.status(200).json(data);
  } catch (error: unknown) {
    safeLog("error", "handler", `Unread route error: ${getErrorMessage(error)}`);
    res.status(500).json({ success: false, message: "Internal server error fetching unread notifications" });
  }
});

app.patch('/api/notifications/:id/read', async (req: Request, res: Response) => {
  const notificationId = String(req.params.id);
  safeLog("info", "route", `Received mark-read request for ${notificationId}`);

  try {
    const updated = await markLocalNotificationRead(notificationId);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error: unknown) {
    safeLog("error", "handler", `Mark-read route error: ${getErrorMessage(error)}`);
    res.status(500).json({ success: false, message: "Internal server error marking notification as read" });
  }
});

app.post('/api/notifications', async (req: Request, res: Response) => {
  safeLog("info", "route", "Received create notification request");

  try {
    const { type, message } = req.body;
    if (!isNotificationType(type) || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({
        success: false,
        message: 'Request body must include type as Event, Result, or Placement and a non-empty message.'
      });
      return;
    }

    const notification = await createLocalNotification(type, message.trim());
    res.status(201).json({
      success: true,
      message: 'Notification created',
      notification
    });
  } catch (error: unknown) {
    safeLog("error", "handler", `Create route error: ${getErrorMessage(error)}`);
    res.status(500).json({ success: false, message: "Internal server error creating notification" });
  }
});

app.get('/api/priority-inbox', async (req: Request, res: Response) => {
  safeLog("info", "route", "Received priority inbox request");

  try {
    const topN = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);

    let notifications: Notification[];
    let source = 'remote';

    try {
      const response = await fetchRemoteNotifications();
      notifications = response.notifications;
    } catch (error: unknown) {
      const localPage = await getLocalPage(50, 1);
      source = localPage.source;
      notifications = localPage.notifications;
      safeLog("warn", "handler", `Priority route using local store: ${getErrorMessage(error)}`);
    }

    safeLog("info", "service", `Fetched ${notifications.length} notifications`);

    const topNHeap = new MinHeap(topN);
    notifications.forEach(notif => {
      const score = calculateScore(notif);
      topNHeap.insert({ ...notif, Score: score });
    });

    const topNotifications = topNHeap.getSortedArray();

    safeLog("info", "service", `Processed top ${topN} priority notifications`);
    
    res.status(200).json({
      success: true,
      source,
      count: topNotifications.length,
      data: topNotifications
    });

  } catch (error: unknown) {
    safeLog("error", "handler", `Priority route error: ${getErrorMessage(error)}`);
    res.status(500).json({ success: false, message: "Internal server error fetching notifications" });
  }
});

app.get('/api/health', async (_req: Request, res: Response) => {
  const collection = await getMongoCollection();
  res.status(200).json({
    success: true,
    stack: 'MongoDB + Express + React + Node',
    backend: 'running',
    database: collection ? 'mongodb' : 'memory fallback',
    upstream: USE_REMOTE_NOTIFICATIONS ? EVALUATION_API_BASE_URL : 'disabled'
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  safeLog("info", "config", `Server is running on port ${PORT}`);
});
