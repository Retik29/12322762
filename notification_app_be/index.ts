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

app.get('/api/priority-inbox', async (req: Request, res: Response) => {
  await Log("backend", "info", "route", "Received priority inbox request");

  try {
    const topN = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 50);

    const token = await getAuthToken();
    const response = await axios.get("http://4.224.186.213/evaluation-service/notifications", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const notifications: Notification[] = response.data.notifications;
    
    if (!notifications || !Array.isArray(notifications)) {
      throw new Error("Invalid response format from notification API");
    }

    await Log("backend", "info", "service", `Fetched ${notifications.length} notifications`);

    const topNHeap = new MinHeap(topN);
    notifications.forEach(notif => {
      const score = calculateScore(notif);
      topNHeap.insert({ ...notif, Score: score });
    });

    const topNotifications = topNHeap.getSortedArray();

    await Log("backend", "info", "service", `Processed top ${topN} priority notifications`);
    
    res.status(200).json({
      success: true,
      count: topNotifications.length,
      data: topNotifications
    });

  } catch (error: any) {
    await Log("backend", "error", "handler", `Priority route error`);
    res.status(500).json({ success: false, message: "Internal server error fetching notifications" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await Log("backend", "info", "config", `Server is running on port ${PORT}`);
});
