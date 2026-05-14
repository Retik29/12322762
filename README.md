# Full Stack Test Assignment Submission - 12322762

This repository contains the complete implementation for the Affordmed Full Stack Campus Hiring Evaluation.

![alt text](<Screenshot (140).png>) ![alt text](<Screenshot (139).png>) ![alt text](<Screenshot (138).png>)

## Project Structure

- `notification_system_design.md`: Contains the system design architecture, database schemas, query optimizations, and scaling discussions (Stages 1-5).
- `logging_middleware/`: Reusable TypeScript package for authenticated remote logging.
- `notification_app_be/`: Node.js Express server implementing the Priority Inbox algorithm using a Min-Heap (Stage 6).
- `notification_app_fe/`: Next.js App Router frontend application with Material UI, displaying paginated and priority notifications (Stage 7).

## Setup Instructions

### 1. Backend Setup

```bash
cd notification_app_be
# Install dependencies
npm install

# Build and start the backend
npx tsc
node dist/index.js
```
The backend runs on `http://localhost:4000`.

### 2. Frontend Setup

```bash
cd notification_app_fe
# Install dependencies
npm install

# Start the development server
npm run dev
```
The frontend runs on `http://localhost:3000`.

## Features
- **Centralized Logging**: Extensively logs to the remote evaluation server. No `console.log` is used.
- **Priority Inbox**: Custom Min-Heap algorithm calculated on the backend to fetch the top 10 notifications by weight and recency.
- **Frontend App**: Clean Material UI implementation, responsive, handles loading and error states gracefully.

