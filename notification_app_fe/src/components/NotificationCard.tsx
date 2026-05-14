import React, { useState } from 'react';
import { Card, CardContent, Typography, Chip, Box, IconButton, Tooltip } from '@mui/material';
import { CheckCircleOutline, CheckCircle } from '@mui/icons-material';
import { format } from 'date-fns';

export interface NotificationData {
  ID: string;
  Type: "Event" | "Result" | "Placement";
  Message: string;
  Timestamp: string;
  Score?: number;
}

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
        transition: '0.3s',
        '&:hover': {
          boxShadow: 3
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
              <Chip 
                label={notification.Type} 
                color={getChipColor(notification.Type) as any} 
                size="small" 
                sx={{ fontWeight: 'bold' }} 
              />
              {notification.Score && (
                <Chip label={`Score: ${notification.Score}`} size="small" variant="outlined" />
              )}
            </Box>
            <Typography variant="body1" sx={{ fontWeight: isRead ? 'normal' : 'bold', color: isRead ? 'text.secondary' : 'text.primary' }}>
              {notification.Message}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {format(new Date(notification.Timestamp), "MMM dd, yyyy 'at' hh:mm a")}
            </Typography>
          </Box>
          <Tooltip title={isRead ? "Marked as read" : "Mark as read"}>
            <IconButton onClick={handleMarkRead} color={isRead ? 'default' : 'primary'} disabled={isRead}>
              {isRead ? <CheckCircle color="action" /> : <CheckCircleOutline />}
            </IconButton>
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  );
}
