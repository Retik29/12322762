import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Typography,
  Select,
  MenuItem,
  FormControl,
  Pagination,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import { Notifications } from '@mui/icons-material';
import NotificationCard, { NotificationData } from '../components/NotificationCard';
import { frontendLog, getAuthToken } from '../utils/logger';

const NOTIFICATION_TYPES = ['All', 'Event', 'Result', 'Placement'];
const TYPE_COLORS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  All: 'default', Event: 'info', Result: 'warning', Placement: 'error'
};

export default function Home() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('All');
  const limit = 10;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      let url = `http://4.224.186.213/evaluation-service/notifications?limit=${limit}&page=${page}`;
      if (filterType !== 'All') {
        url += `&notification_type=${filterType}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.notifications) {
        setNotifications(response.data.notifications);
        await frontendLog("info", "page", `Fetched page ${page} notifications`);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      // Removed console.error
      setError("Failed to load notifications. Please try again later.");
      await frontendLog("error", "page", `Failed to fetch notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <Box>
      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)', borderRadius: 3, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Notifications sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight="bold">All Notifications</Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          Stay updated with placements, events, and results from your campus.
        </Typography>
      </Paper>

      {/* Filters */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={1}>
          {NOTIFICATION_TYPES.map(type => (
            <Chip
              key={type}
              label={type}
              color={filterType === type ? TYPE_COLORS[type] : 'default'}
              variant={filterType === type ? 'filled' : 'outlined'}
              onClick={() => {
                setFilterType(type);
                setPage(1);
                frontendLog("info", "component", `User filtered by type: ${type}`);
              }}
              sx={{ cursor: 'pointer', fontWeight: filterType === type ? 'bold' : 'normal', transition: '0.2s' }}
            />
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Page {page} · {limit} per page
        </Typography>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 6 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">Fetching notifications...</Typography>
        </Box>
      ) : notifications.length === 0 && !error ? (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '2px dashed #e0e0e0' }}>
          <Typography color="text.secondary">No notifications found for this filter.</Typography>
        </Paper>
      ) : (
        <>
          {notifications.map((notif) => (
            <NotificationCard
              key={notif.ID}
              notification={notif}
              onMarkRead={async (id) => {
                await frontendLog("info", "component", `User marked notification as read`);
              }}
            />
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 2 }}>
            <Pagination
              count={10}
              page={page}
              onChange={(_, value) => setPage(value)}
              color="primary"
              shape="rounded"
            />
          </Box>
        </>
      )}
    </Box>
  );
}
