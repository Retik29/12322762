import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { 
  Typography, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';
import NotificationCard, { NotificationData } from '../components/NotificationCard';
import { frontendLog } from '../utils/logger';

export default function PriorityInbox() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPriorityInbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:4000/api/priority-inbox");

      if (response.data && response.data.success && response.data.data) {
        setNotifications(response.data.data);
        await frontendLog("info", "page", "Fetched priority inbox from backend");
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load priority inbox. Ensure the backend server is running on port 4000.");
      await frontendLog("error", "page", `Priority inbox fetch failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriorityInbox();
  }, [fetchPriorityInbox]);

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Priority Inbox (Top 10)
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 && !error ? (
        <Typography color="text.secondary">No priority notifications found.</Typography>
      ) : (
        <>
          {notifications.map((notif, index) => (
            <Box key={notif.ID} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="h6" color="text.secondary" sx={{ minWidth: 30 }}>
                #{index + 1}
              </Typography>
              <Box sx={{ flexGrow: 1 }}>
                <NotificationCard 
                  notification={notif} 
                  onMarkRead={async (id) => {
                    await frontendLog("info", "component", `User marked priority notification ${id} as read`);
                  }}
                />
              </Box>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
}
