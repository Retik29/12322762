import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import PriorityInbox from './pages/PriorityInbox';
import { CssBaseline, Box } from '@mui/material';

export default function App() {
  return (
    <Router>
      <CssBaseline />
      <Box sx={{ backgroundColor: '#f0f2f5', minHeight: '100vh', paddingBottom: 4 }}>
        <Navbar />
        <Box sx={{ padding: '20px', maxWidth: '800px', margin: '0 auto', mt: 3 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/priority" element={<PriorityInbox />} />
          </Routes>
        </Box>
      </Box>
    </Router>
  );
}
