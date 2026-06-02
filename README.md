# Full Stack Test Assignment Submission - 12322762

This repository contains a MERN-stack implementation for the Affordmed Full Stack Campus Hiring Evaluation.

## Tech Stack

- **MongoDB**: Notification persistence when MongoDB is available locally.
- **Express.js**: Backend REST API.
- **React**: Frontend UI.
- **Node.js**: Backend runtime.

Supporting tools/libraries: TypeScript, Vite, Axios, Material UI, and the required logging middleware.

## Project Structure

- `notification_system_design.md`: Stages 1-5 design answers rewritten for MERN.
- `logging_middleware/`: Reusable logging package for the evaluation service.
- `notification_app_be/`: Node.js + Express backend with MongoDB support and in-memory demo fallback.
- `notification_app_fe/`: React frontend that consumes the backend APIs.

## Backend Setup

```bash
cd notification_app_be
npm install
npm run build
npm start
```

Backend URL:

```text
http://localhost:4000
```

Useful endpoints:

- `GET /api/health`
- `GET /api/notifications?limit=10&page=1`
- `GET /api/notifications/unread`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications`
- `GET /api/priority-inbox?limit=10`

MongoDB is optional for the demo. If MongoDB is running on `mongodb://127.0.0.1:27017`, the backend uses the `campus_notify` database. If MongoDB is unavailable, the backend automatically uses in-memory seed data so the frontend still works.

## Frontend Setup

```bash
cd notification_app_fe
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:3000
```

## Demo Checklist

1. Start the backend and open `http://localhost:4000/api/health`.
2. Start the frontend and open `http://localhost:3000`.
3. Show notification filtering on the home page.
4. Open the Priority Inbox page and show the Min-Heap ranked notifications.
5. Click the mark-as-read button to show frontend-to-backend interaction.

## Notes

The remote evaluation notification service may reject requests after the evaluation session ends. The backend still attempts the remote service first, then falls back to the MERN local store so the project remains demo-ready.
