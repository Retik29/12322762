"use client";

import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Notifications as NotificationsIcon, PriorityHigh as PriorityHighIcon } from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Campus Notifications
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            color="inherit" 
            startIcon={<NotificationsIcon />}
            onClick={() => router.push('/')}
            sx={{ fontWeight: pathname === '/' ? 'bold' : 'normal', borderBottom: pathname === '/' ? '2px solid white' : 'none', borderRadius: 0 }}
          >
            All Notifications
          </Button>
          <Button 
            color="inherit" 
            startIcon={<PriorityHighIcon />}
            onClick={() => router.push('/priority')}
            sx={{ fontWeight: pathname === '/priority' ? 'bold' : 'normal', borderBottom: pathname === '/priority' ? '2px solid white' : 'none', borderRadius: 0 }}
          >
            Priority Inbox
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
