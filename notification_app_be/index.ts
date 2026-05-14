import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { Log, initLogger, getAuthToken } from 'logging_middleware';

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
}

interface PriorityNotification extends Notification {
  Score: number;
}

const EVALUATION_API_BASE_URL = process.env.EVALUATION_API_BASE_URL || 'http://4.224.186.213/evaluation-service';
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 10_000);

const fallbackNotifications: Notification[] = [
  {
    ID: 'fallback-placement-001',
    Type: 'Placement',
    Message: 'Placement drive opened for Software Engineer roles. Register before the deadline.',
    Timestamp: '2026-05-14T09:30:00.000Z'
  },
  {
    ID: 'fallback-result-001',
    Type: 'Result',
    Message: 'Mid-term result update is available in the student portal.',
    Timestamp: '2026-05-14T06:45:00.000Z'
  },
  {
    ID: 'fallback-event-001',
    Type: 'Event',
    Message: 'Cloud computing workshop starts tomorrow in Seminar Hall A.',
    Timestamp: '2026-05-13T12:00:00.000Z'
  },
  {
    ID: 'fallback-placement-002',
    Type: 'Placement',
    Message: 'Resume shortlisting round begins for the campus recruitment program.',
    Timestamp: '2026-05-13T08:15:00.000Z'
  },
  {
    ID: 'fallback-result-002',
    Type: 'Result',
    Message: 'Project evaluation marks have been published by the department.',
    Timestamp: '2026-05-12T14:20:00.000Z'
  },
  {
    ID: 'fallback-event-002',
    Type: 'Event',
    Message: 'Coding club is hosting a mock interview practice session this week.',
    Timestamp: '2026-05-12T10:00:00.000Z'
  },
  {
    ID: 'fallback-placement-003',
    Type: 'Placement',
    Message: 'Pre-placement talk scheduled for final year students.',
    Timestamp: '2026-05-11T15:30:00.000Z'
  },
  {
    ID: 'fallback-result-003',
    Type: 'Result',
    Message: 'Internal assessment recheck window is now open.',
    Timestamp: '2026-05-11T07:50:00.000Z'
  },
  {
    ID: 'fallback-event-003',
    Type: 'Event',
    Message: 'Department hackathon registrations close tonight.',
    Timestamp: '2026-05-10T16:10:00.000Z'
  },
  {
    ID: 'fallback-placement-004',
    Type: 'Placement',
    Message: 'Aptitude test slot booking is available for eligible students.',
    Timestamp: '2026-05-10T05:25:00.000Z'
  }
];

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

const getFallbackPage = (limit: number, page: number, notificationType?: string) => {
  const filtered = isNotificationType(notificationType)
    ? fallbackNotifications.filter(notification => notification.Type === notificationType)
    : fallbackNotifications;
  const startIndex = (page - 1) * limit;
  const notifications = filtered.slice(startIndex, startIndex + limit);

  return {
    success: true,
    source: 'fallback',
    message: 'Using local fallback notifications because the upstream evaluation service is unavailable.',
    page,
    limit,
    total: filtered.length,
    notifications
  };
};

const fetchRemoteNotifications = async (limit?: number, page?: number, notificationType?: string) => {
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

  try {
    const limit = readPositiveInt(req.query.limit, 10);
    const page = readPositiveInt(req.query.page, 1);
    const notificationType = String(req.query.notification_type || '');

    const data = await fetchRemoteNotifications(limit, page, notificationType);

    safeLog("info", "service", `Successfully fetched notifications page ${page}`);
    res.status(200).json({ ...data, source: 'remote' });

  } catch (error: unknown) {
    const limit = readPositiveInt(req.query.limit, 10);
    const page = readPositiveInt(req.query.page, 1);
    const notificationType = String(req.query.notification_type || '');
    const message = getErrorMessage(error);

    safeLog("warn", "handler", `Notifications route using fallback: ${message}`);
    res.status(200).json(getFallbackPage(limit, page, notificationType));
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
      source = 'fallback';
      notifications = fallbackNotifications;
      safeLog("warn", "handler", `Priority route using fallback: ${getErrorMessage(error)}`);
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  safeLog("info", "config", `Server is running on port ${PORT}`);
});
