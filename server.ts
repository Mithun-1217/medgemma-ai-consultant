import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    }
  });

  const PORT = 3000;

  // Mock vital signal data generation
  const patients = [
    { id: 'MC-4029', name: 'Robert Chen', condition: 'Post-Op' },
    { id: 'MC-3155', name: 'Elena Rodriguez', condition: 'Hypertension' },
    { id: 'MC-8821', name: 'Samuel L. Jackson', condition: 'COPD' },
    { id: 'MC-2291', name: 'Linda Garrison', condition: 'Arrhythmia' }
  ];

  setInterval(() => {
    patients.forEach(patient => {
      const vitals = {
        patientId: patient.id,
        heartRate: Math.floor(60 + Math.random() * 60), // 60-120
        bloodPressure: `${Math.floor(110 + Math.random() * 40)}/${Math.floor(70 + Math.random() * 20)}`,
        spo2: Math.floor(90 + Math.random() * 10), // 90-100
        timestamp: new Date().toISOString()
      };
      io.emit('vitals_update', vitals);
    });
  }, 3000);

  io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
