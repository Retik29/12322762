# Notification System Design

## Stage 1
### REST API Design
The notification platform needs to support fetching notifications, marking them as read, and receiving new ones in real-time.

#### 1. Get All Notifications (with pagination and filtering)
- **Endpoint**: `GET /notifications`
- **Headers**:
  ```json
  {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  }
  ```
- **Query Parameters**:
  - `limit`: Number of items per page.
  - `page`: Page number.
  - `notification_type`: Filter by "Event", "Result", or "Placement".
- **Response** (200 OK):
  ```json
  {
    "notifications": [
      {
        "ID": "uuid",
        "Type": "Placement",
        "Message": "Company XYZ hiring",
        "Timestamp": "2026-04-22 17:51:18",
        "isRead": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50
    }
  }
  ```

#### 2. Get Unread Notifications
- **Endpoint**: `GET /notifications/unread`
- **Headers**: Same as above.
- **Response** (200 OK): Returns a list of unread notifications matching the schema above.

#### 3. Mark Notification as Read
- **Endpoint**: `PATCH /notifications/:id/read`
- **Headers**: Same as above.
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Notification marked as read"
  }
  ```

#### 4. Create Notification
- **Endpoint**: `POST /notifications`
- **Headers**: Same as above.
- **Request Body**:
  ```json
  {
    "type": "Event",
    "message": "Tech Fest 2026",
    "studentIds": ["1042", "1043"]
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "message": "Notification queued for delivery"
  }
  ```

### Real-Time Notification Mechanism
For real-time delivery of notifications as they are created, I propose using **WebSockets** (specifically through libraries like Socket.IO). WebSockets provide a persistent, bidirectional communication channel between the client and server. When a new notification is created in the system, the server can immediately push the event payload to the connected client without requiring the client to constantly poll the server.

---

## Stage 2
### Persistent Storage (Database)
**Choice**: **PostgreSQL**
**Reasoning**: PostgreSQL is a robust, open-source relational database that offers strong ACID compliance, excellent indexing capabilities (B-tree, GIN), and support for JSONB data types if semi-structured data is ever needed. Notifications naturally form relationships with students (users), making a relational schema highly appropriate.

### Database Schema
```sql
CREATE TYPE notification_type AS ENUM ('Event', 'Result', 'Placement');

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for faster retrieval of a student's notifications
CREATE INDEX idx_notifications_student_id ON notifications(student_id);
CREATE INDEX idx_notifications_student_unread ON notifications(student_id, is_read);
```

### Scaling Challenges
As data volume increases to millions of notifications:
1. **Read/Write bottlenecks**: Fetching notifications for every user continuously can saturate DB connections and I/O.
2. **Storage Costs**: Storing old, read notifications consumes significant disk space.

**Solutions**:
1. **Caching Layer**: Introduce Redis to cache the top unread notifications per user.
2. **Data Archival / TTL**: Implement a cron job to move notifications older than 30 days to cold storage (e.g., AWS S3) or simply delete them.
3. **Database Sharding**: Partition the `notifications` table by date or hash partition by `student_id`.

### Queries Based on Stage 1
**Get Notifications (Paginated)**:
```sql
SELECT id, type, message, created_at, is_read 
FROM notifications 
WHERE student_id = 1042 
ORDER BY created_at DESC 
LIMIT 10 OFFSET 0;
```

**Mark as Read**:
```sql
UPDATE notifications SET is_read = TRUE WHERE id = 'uuid-goes-here' AND student_id = 1042;
```

---

## Stage 3
### Query Optimization Analysis
**Query**:
```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC ;
```
**Is this accurate?**
It is syntactically accurate for fetching unread notifications. However, ordering by `createdAt ASC` fetches the *oldest* notifications first. Typically, users want to see the *newest* notifications first, so `DESC` would be better for UX.

**Why is this slow?**
With 5,000,000 records, the database engine must perform a "Full Table Scan" to find rows where `studentID = 1042` and `isRead = false`, and then perform a potentially expensive sort operation in memory.

**Suggested Changes & Computation Cost:**
1. **Change the Sort Order**: Use `ORDER BY createdAt DESC`.
2. **Add a Composite Index**:
   ```sql
   CREATE INDEX idx_student_unread_created ON notifications(studentID, isRead, createdAt DESC);
   ```
   **Computation Cost**: With the composite index, the DB can perform an Index Seek. The time complexity drops from O(N) (table scan) to O(log N) (B-tree traversal). The query will execute in single-digit milliseconds.

**Is adding indexes on every column effective?**
**No.** Indexes speed up read operations but significantly slow down write operations (INSERT, UPDATE, DELETE) because every index must be updated synchronously. Furthermore, indexes consume memory and disk space. We should only index columns used frequently in `WHERE`, `JOIN`, or `ORDER BY` clauses.

### Placement Query
Find all students who got a placement notification in the last 7 days:
```sql
SELECT DISTINCT s.id, s.name, s.email 
FROM students s
JOIN notifications n ON s.id = n.student_id
WHERE n.type = 'Placement' 
  AND n.created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4
### Performance Improvements
Fetching notifications on every page load overwhelms the DB. 

**Solutions**:
1. **Redis Caching (Recommended)**: 
   Cache the most recent 50 notifications or the unread count in Redis (In-Memory Key-Value store). On page load, the API fetches from Redis first. If a cache miss occurs, it falls back to the database.
   *Tradeoff*: Cache invalidation can be tricky. There might be a slight eventual consistency delay between the DB and Redis, but for notifications, sub-second staleness is acceptable.
2. **WebSockets (Push vs Pull)**:
   Instead of the client polling the DB on every page load, load the state once and maintain an active WebSocket connection. The server pushes updates to the client.
   *Tradeoff*: Maintaining thousands of concurrent WebSocket connections requires dedicated infrastructure (like Socket.IO servers/Redis PubSub) and higher server memory.
3. **Cursor-Based Pagination**:
   Instead of `OFFSET`, which scans and skips rows linearly, use a cursor (e.g., the last `createdAt` timestamp).
   *Tradeoff*: The frontend implementation is slightly more complex, and users cannot jump to specific page numbers (e.g., "Page 5").

---

## Stage 5
### Reliable Bulk Notifications
**Shortcomings of the proposed pseudocode**:
1. **Synchronous & Blocking**: Sending 50,000 emails sequentially in a loop will take hours and block the thread.
2. **No Fault Tolerance/Retries**: The logs showed the process failed for 200 students. The script has no mechanism to resume or retry only the failed ones.
3. **Coupled Operations**: If `send_email` fails, does it still save to the DB? Should it?

**Should saving to DB and sending email happen together?**
**No.** They should be decoupled. Saving to the DB is a fast, internal operation. Sending an email relies on an external 3rd-party API (like SendGrid/AWS SES) which is comparatively slow and prone to rate limits or network outages.

**Redesign Strategy**: Use an Async Task Queue (e.g., BullMQ, RabbitMQ). 
1. The main API quickly creates "Notification Jobs" and pushes them to a message queue. 
2. Background worker processes consume the queue concurrently.
3. The queue handles retries, delays, and routes permanent failures to a Dead Letter Queue (DLQ).

### Revised Pseudocode
```python
function notify_all(student_ids: array, message: string):
    # 1. Bulk insert to database (fast operation)
    bulk_insert_notifications_to_db(student_ids, message)
    
    # 2. Push jobs to message queue for async processing
    for student_id in student_ids:
        job_payload = { "student_id": student_id, "message": message }
        MessageQueue.push("email_notification_queue", job_payload)
        
        # Real-time WebSockets can be emitted asynchronously via PubSub
        RedisPubSub.publish("realtime_notifications", job_payload)

# ----------------------------------------------------
# Worker Process (runs asynchronously in the background)
# ----------------------------------------------------
@Worker("email_notification_queue", retries=3, backoff="exponential")
function process_email_job(job):
    try:
        send_email(job.student_id, job.message)
    except Exception as e:
        Log("backend", "error", "service", f"Email failed for {job.student_id}: {e}")
        # Throwing the error triggers the queue's built-in retry mechanism
        throw e
```
