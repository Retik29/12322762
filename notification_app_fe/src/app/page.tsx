"use client";

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { 
  Typography, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Pagination, 
  Box, 
  CircularProgress,
  Alert
} from '@mui/material';
import NotificationCard, { NotificationData } from '@/components/NotificationCard';
import { frontendLog, getAuthToken } from '@/utils/logger';

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
        await frontendLog("info", "page", `Fetched page ${page} of notifications`);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load notifications. Please try again later.");
      await frontendLog("error", "page", `Failed to fetch notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, filterType]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">All Notifications</Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => {
              setFilterType(e.target.value);
              setPage(1); // reset to page 1 on filter change
            }}
          >
            <MenuItem value="All">All</MenuItem>
            <MenuItem value="Event">Event</MenuItem>
            <MenuItem value="Result">Result</MenuItem>
            <MenuItem value="Placement">Placement</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length === 0 && !error ? (
        <Typography color="text.secondary">No notifications found.</Typography>
      ) : (
        <>
          {notifications.map((notif) => (
            <NotificationCard 
              key={notif.ID} 
              notification={notif} 
              onMarkRead={async (id) => {
                await frontendLog("info", "component", `User marked notification ${id} as read`);
              }}
            />
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
            {/* Hardcoding count to 10 assuming total pages is unknown or large */}
            <Pagination count={10} page={page} onChange={handlePageChange} color="primary" />
          </Box>
        </>
      )}
    </Box>
  );
}
