import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Notifications, PriorityHigh } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar position="sticky">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Campus Notifications
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            color="inherit" 
            startIcon={<Notifications />}
            onClick={() => navigate('/')}
            sx={{ fontWeight: location.pathname === '/' ? 'bold' : 'normal', borderBottom: location.pathname === '/' ? '2px solid white' : 'none', borderRadius: 0 }}
          >
            All Notifications
          </Button>
          <Button 
            color="inherit" 
            startIcon={<PriorityHigh />}
            onClick={() => navigate('/priority')}
            sx={{ fontWeight: location.pathname === '/priority' ? 'bold' : 'normal', borderBottom: location.pathname === '/priority' ? '2px solid white' : 'none', borderRadius: 0 }}
          >
            Priority Inbox
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
