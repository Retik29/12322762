import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  Typography, Box, CircularProgress, Alert,
  FormControl, Select, MenuItem, Chip, Paper, Divider
} from '@mui/material';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import NotificationCard from '../components/NotificationCard';
import { frontendLog } from '../utils/logger';
import { NotificationData } from '../types';

const TOP_N_OPTIONS = [5, 10, 15, 20];

export default function PriorityInbox() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topN, setTopN] = useState(10);

  const fetchPriorityInbox = useCallback(async (n: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:4000/api/priority-inbox?limit=${n}`);
      if (response.data?.success && response.data?.data) {
        setNotifications(response.data.data);
        await frontendLog('info', 'page', `Fetched top ${n} priority notifications`);
      } else {
        setNotifications([]);
      }
    } catch (err: any) {
      setError('Failed to load priority inbox. Ensure the backend server is running on port 4000.');
      await frontendLog('error', 'page', `Priority fetch failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriorityInbox(topN);
  }, [fetchPriorityInbox, topN]);

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)', borderRadius: 3, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <PriorityHighIcon sx={{ fontSize: 28 }} />
          <Typography variant="h5" fontWeight="bold">Priority Inbox</Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
          Top notifications ranked by importance (Placement &gt; Result &gt; Event) and recency.
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>Show top:</Typography>
          <FormControl size="small" sx={{ minWidth: 90, background: 'rgba(255,255,255,0.15)', borderRadius: 1 }}>
            <Select
              value={topN}
              onChange={(e) => {
                const n = Number(e.target.value);
                setTopN(n);
                frontendLog('info', 'component', `Priority limit changed to ${n}`);
              }}
              sx={{ color: 'white', '.MuiSvgIcon-root': { color: 'white' }, '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.4)' } }}
            >
              {TOP_N_OPTIONS.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
          {!loading && (
            <Chip
              label={`${notifications.length} results`}
              size="small"
              sx={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
            />
          )}
        </Box>
      </Paper>

      <Divider sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight="bold">RANKED RESULTS</Typography>
      </Divider>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 6 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">Computing priority scores...</Typography>
        </Box>
      ) : notifications.length === 0 && !error ? (
        <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 3, border: '2px dashed #e0e0e0' }}>
          <Typography color="text.secondary">No priority notifications found.</Typography>
        </Paper>
      ) : (
        <>
          {notifications.map((notif, index) => (
            <Box key={notif.ID} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 0.5 }}>
              <Box sx={{
                minWidth: 32, height: 32, borderRadius: '50%',
                background: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e3f2fd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: 13,
                color: index < 3 ? '#333' : '#1976d2',
                mt: 2, flexShrink: 0, boxShadow: index < 3 ? 1 : 0
              }}>
                #{index + 1}
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <NotificationCard
                  notification={notif}
                  onMarkRead={async () => { await frontendLog('info', 'component', 'Priority notification marked read'); }}
                />
              </Box>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
}
