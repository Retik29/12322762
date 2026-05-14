import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar position="sticky" elevation={0} sx={{ background: 'linear-gradient(90deg, #0d47a1 0%, #1565c0 100%)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            <NotificationsIcon sx={{ fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 'bold', letterSpacing: 0.5 }}>
              Campus Notify
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              color="inherit"
              startIcon={<NotificationsIcon />}
              onClick={() => navigate('/')}
              sx={{
                borderRadius: 2,
                px: 2,
                fontWeight: isActive('/') ? 'bold' : 'normal',
                background: isActive('/') ? 'rgba(255,255,255,0.2)' : 'transparent',
                '&:hover': { background: 'rgba(255,255,255,0.15)' },
                transition: '0.2s'
              }}
            >
              All Notifications
            </Button>
            <Button
              color="inherit"
              startIcon={<PriorityHighIcon />}
              onClick={() => navigate('/priority')}
              sx={{
                borderRadius: 2,
                px: 2,
                fontWeight: isActive('/priority') ? 'bold' : 'normal',
                background: isActive('/priority') ? 'rgba(255,255,255,0.2)' : 'transparent',
                '&:hover': { background: 'rgba(255,255,255,0.15)' },
                transition: '0.2s'
              }}
            >
              Priority Inbox
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
