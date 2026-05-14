import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PriorityInbox from './pages/PriorityInbox';
import { CssBaseline, Box, Container } from '@mui/material';

export default function App() {
  return (
    <Router>
      <CssBaseline />
      <Box sx={{ backgroundColor: '#f0f4f8', minHeight: '100vh', paddingBottom: 6 }}>
        <Navbar />
        <Container maxWidth="md" sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/priority" element={<PriorityInbox />} />
          </Routes>
        </Container>
      </Box>
    </Router>
  );
}
