import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(cors({
  origin: [

    process.env.FRONTEND_URL || "http://localhost:3000"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json());

// Configure Clerk middleware with proper environment variables


// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

console.log(`WebSocket server running on port ${PORT}`);