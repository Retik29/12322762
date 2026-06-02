# Notification System Design

This submission follows a MERN stack:

- **MongoDB** for notification persistence.
- **Express.js** for REST APIs.
- **React** for the frontend.
- **Node.js** for the backend runtime.

The implementation also keeps the remote evaluation logging middleware required by the assignment.

---

## Stage 1

### REST API Design

The notification platform supports fetching notifications, filtering by type, marking notifications as read, and creating new notifications.

#### 1. Get All Notifications

- **Endpoint**: `GET /api/notifications`
- **Query Parameters**:
  - `limit`: Number of items per page.
  - `page`: Page number.
  - `notification_type`: Optional filter by `Event`, `Result`, or `Placement`.
- **Response**:

```json
{
  "success": true,
  "source": "mongo",
  "page": 1,
  "limit": 10,
  "total": 25,
  "notifications": [
    {
      "ID": "uuid",
      "Type": "Placement",
      "Message": "Company XYZ hiring",
      "Timestamp": "2026-04-22T17:51:18.000Z",
      "isRead": false
    }
  ]
}
```

#### 2. Get Unread Notifications

- **Endpoint**: `GET /api/notifications/unread`
- **Response**: Same shape as the list API, but only includes notifications where `isRead !== true`.

#### 3. Mark Notification as Read

- **Endpoint**: `PATCH /api/notifications/:id/read`
- **Response**:

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### 4. Create Notification

- **Endpoint**: `POST /api/notifications`
- **Request Body**:

```json
{
  "type": "Event",
  "message": "Tech Fest 2026"
}
```

- **Response**:

```json
{
  "success": true,
  "message": "Notification created",
  "notification": {
    "ID": "local-1778767164000",
    "Type": "Event",
    "Message": "Tech Fest 2026",
    "Timestamp": "2026-06-02T12:00:00.000Z",
    "isRead": false
  }
}
```

### Delivery Model

For this assignment demo, the frontend fetches notifications through REST APIs. In a production MERN app, real-time delivery can be added with Node.js server-sent events or WebSocket support, while still keeping MongoDB as the source of truth.

---

## Stage 2

### Persistent Storage

**Choice**: **MongoDB**

MongoDB fits the notification use case well because each notification is naturally represented as a document. The schema can evolve without relational migrations, and MongoDB indexes support fast reads by type, read status, and timestamp.

### MongoDB Collection

Collection name: `notifications`

```json
{
  "ID": "fallback-placement-001",
  "Type": "Placement",
  "Message": "Placement drive opened for Software Engineer roles.",
  "Timestamp": "2026-05-14T09:30:00.000Z",
  "isRead": false
}
```

### Indexes

```javascript
db.notifications.createIndex({ ID: 1 }, { unique: true })
db.notifications.createIndex({ Type: 1, Timestamp: -1 })
db.notifications.createIndex({ isRead: 1, Timestamp: -1 })
```

These indexes support:

- Fast lookup when marking a notification as read.
- Fast filtering by notification type.
- Fast unread notification queries ordered by newest first.

---

## Stage 3

### Query Optimization Analysis

Original query:

```javascript
db.notifications.find({
  studentID: 1042,
  isRead: false
}).sort({ createdAt: 1 })
```

### Accuracy

The query is logically close, but sorting by `createdAt: 1` returns the oldest notifications first. For notification inbox UX, newest-first sorting is usually better.

Recommended query:

```javascript
db.notifications.find({
  studentID: 1042,
  isRead: false
}).sort({ createdAt: -1 })
```

### Performance Problem

With millions of notification documents, MongoDB may scan too many documents unless the query fields and sort field are indexed together.

Recommended compound index:

```javascript
db.notifications.createIndex({
  studentID: 1,
  isRead: 1,
  createdAt: -1
})
```

With this index, MongoDB can locate one student's unread notifications and return them in newest-first order without an expensive in-memory sort.

### Placement Query

Find all placement notifications created in the last 7 days:

```javascript
db.notifications.find({
  Type: "Placement",
  Timestamp: {
    $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
}).sort({ Timestamp: -1 })
```

---

## Stage 4

### Performance Improvements Inside MERN

1. **MongoDB compound indexes**
   Use indexes that match the most common query patterns: unread notifications, type filters, and timestamp sorting.

2. **Pagination**
   Keep `limit` and `page` for the assignment UI. For very large datasets, cursor pagination using the last `Timestamp` would scale better than large `skip` values.

3. **Lean API responses**
   Return only fields needed by the frontend: `ID`, `Type`, `Message`, `Timestamp`, and `isRead`.

4. **Backend fallback behavior**
   The implemented backend uses MongoDB when available. If MongoDB or the remote evaluation service is down, it falls back to in-memory seed data so the app remains demo-ready.

---

## Stage 5

### Reliable Bulk Notifications

The original synchronous pseudocode is risky because sending thousands of notifications one by one can block the Node.js process and fail halfway without recovery.

### MERN-Only Redesign

Use MongoDB to persist notification jobs and process them in small batches from a Node.js worker loop.

```javascript
async function notifyAll(studentIds, message) {
  const jobs = studentIds.map(studentId => ({
    studentId,
    message,
    status: "pending",
    attempts: 0,
    createdAt: new Date()
  }))

  await db.collection("notification_jobs").insertMany(jobs)
}

async function processPendingJobs() {
  const jobs = await db.collection("notification_jobs")
    .find({ status: "pending", attempts: { $lt: 3 } })
    .limit(100)
    .toArray()

  for (const job of jobs) {
    try {
      await db.collection("notifications").insertOne({
        ID: crypto.randomUUID(),
        Type: "Event",
        Message: job.message,
        Timestamp: new Date().toISOString(),
        isRead: false,
        studentId: job.studentId
      })

      await db.collection("notification_jobs").updateOne(
        { _id: job._id },
        { $set: { status: "completed" } }
      )
    } catch {
      await db.collection("notification_jobs").updateOne(
        { _id: job._id },
        { $inc: { attempts: 1 }, $set: { status: "pending" } }
      )
    }
  }
}
```

This keeps the system inside the MERN stack while still supporting retryable bulk notification processing.

---

## Stages 6 and 7

### Backend

The Express backend implements:

- `GET /api/notifications`
- `GET /api/notifications/unread`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications`
- `GET /api/priority-inbox`
- `GET /api/health`

The priority inbox uses a Min-Heap to rank notifications by:

1. Placement
2. Result
3. Event
4. Newer timestamp inside the same type

### Frontend

The React frontend implements:

- All notifications view.
- Type filtering.
- Priority inbox view.
- Mark-as-read action connected to the backend.
- Loading and error states.
