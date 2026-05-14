import { useState } from 'react';
import { Card, CardContent, Typography, Chip, Box, IconButton, Tooltip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { format } from 'date-fns';
import type { NotificationData } from '../types';

interface NotificationCardProps {
  notification: NotificationData;
  onMarkRead?: (id: string) => void;
}

export default function NotificationCard({ notification, onMarkRead }: NotificationCardProps) {
  const [isRead, setIsRead] = useState(false);

  const getChipColor = (type: string) => {
    switch (type) {
      case 'Placement': return 'error';
      case 'Result': return 'warning';
      case 'Event': return 'info';
      default: return 'default';
    }
  };

  const handleMarkRead = () => {
    if (!isRead) {
      setIsRead(true);
      if (onMarkRead) onMarkRead(notification.ID);
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        backgroundColor: isRead ? '#f5f5f5' : '#ffffff',
        borderLeft: isRead ? '4px solid #ccc' : '4px solid #1976d2',
        transition: 'all 0.3s ease',
        '&:hover': { boxShadow: 4, transform: 'translateY(-1px)' }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={notification.Type}
                color={getChipColor(notification.Type) as any}
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
              {notification.Score !== undefined && (
                <Chip label={`Score: ${notification.Score}`} size="small" variant="outlined" />
              )}
              {isRead && (
                <Chip label="Read" size="small" variant="outlined" color="default" sx={{ opacity: 0.6 }} />
              )}
            </Box>
            <Typography
              variant="body1"
              sx={{ fontWeight: isRead ? 'normal' : 'bold', color: isRead ? 'text.secondary' : 'text.primary' }}
            >
              {notification.Message}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {format(new Date(notification.Timestamp), "MMM dd, yyyy 'at' hh:mm a")}
            </Typography>
          </Box>
          <Tooltip title={isRead ? 'Already read' : 'Mark as read'}>
            <span>
              <IconButton onClick={handleMarkRead} color={isRead ? 'default' : 'primary'} disabled={isRead} size="small">
                {isRead ? <CheckCircleIcon color="disabled" /> : <CheckCircleOutlineIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}
