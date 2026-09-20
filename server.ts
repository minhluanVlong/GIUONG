import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { INITIAL_BEDS, INITIAL_DISCHARGE_HISTORY } from './src/data/initialBeds';
import { Bed, DischargeRecord, SyncPayloadLog } from './src/types';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'hospital_db.json');

interface DatabaseSchema {
  beds: Bed[];
  dischargeHistory: DischargeRecord[];
  syncLogs: SyncPayloadLog[];
  lastUpdated: string;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// Helper: load database from file or initialize with defaults
function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.beds) && parsed.beds.length > 0) {
        return {
          beds: parsed.beds,
          dischargeHistory: Array.isArray(parsed.dischargeHistory) ? parsed.dischargeHistory : INITIAL_DISCHARGE_HISTORY,
          syncLogs: Array.isArray(parsed.syncLogs) ? parsed.syncLogs : [],
          lastUpdated: parsed.lastUpdated || new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.error('Error reading hospital DB file, re-initializing defaults:', err);
  }

  // Default initial data
  const defaultData: DatabaseSchema = {
    beds: INITIAL_BEDS,
    dischargeHistory: INITIAL_DISCHARGE_HISTORY,
    syncLogs: [
      {
        id: 'sync-init-1',
        timestamp: '07:30',
        action: 'DISCHARGE',
        payload: {
          action: 'DISCHARGE',
          bedId: 'H002',
          note: 'Xuất viện (Khóa giường trong ngày)',
        },
        summary: 'Xuất viện BN LÊ VĂN TÁM khỏi H002',
      },
    ],
    lastUpdated: new Date().toISOString(),
  };

  saveDatabase(defaultData);
  return defaultData;
}

// Helper: save database to file
function saveDatabase(data: DatabaseSchema): boolean {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing hospital DB file:', err);
    return false;
  }
}

let db = loadDatabase();

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', bedsCount: db.beds.length, lastUpdated: db.lastUpdated });
  });

  // GET all hospital data (beds, dischargeHistory, syncLogs)
  app.get('/api/data', (req, res) => {
    res.json({
      success: true,
      beds: db.beds,
      dischargeHistory: db.dischargeHistory,
      syncLogs: db.syncLogs,
      lastUpdated: db.lastUpdated,
    });
  });

  // POST save all hospital data
  app.post('/api/data', (req, res) => {
    const { beds, dischargeHistory, syncLogs } = req.body;

    if (Array.isArray(beds) && beds.length > 0) {
      db.beds = beds;
    }
    if (Array.isArray(dischargeHistory)) {
      db.dischargeHistory = dischargeHistory;
    }
    if (Array.isArray(syncLogs)) {
      db.syncLogs = syncLogs.slice(0, 100);
    }

    const saved = saveDatabase(db);
    res.json({
      success: saved,
      bedsCount: db.beds.length,
      lastUpdated: db.lastUpdated,
    });
  });

  // POST save beds specifically
  app.post('/api/beds', (req, res) => {
    const { beds } = req.body;
    if (!Array.isArray(beds) || beds.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid beds array' });
    }
    db.beds = beds;
    const saved = saveDatabase(db);
    res.json({
      success: saved,
      bedsCount: db.beds.length,
      lastUpdated: db.lastUpdated,
    });
  });

  // POST save single bed update
  app.post('/api/beds/:bedId', (req, res) => {
    const bedId = req.params.bedId.toUpperCase();
    const updatedBed = req.body;

    const index = db.beds.findIndex(b => b.maGiuong.toUpperCase() === bedId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: `Bed ${bedId} not found` });
    }

    db.beds[index] = { ...db.beds[index], ...updatedBed };
    const saved = saveDatabase(db);
    res.json({
      success: saved,
      bed: db.beds[index],
      lastUpdated: db.lastUpdated,
    });
  });

  // POST save discharge history
  app.post('/api/history', (req, res) => {
    const { dischargeHistory } = req.body;
    if (!Array.isArray(dischargeHistory)) {
      return res.status(400).json({ success: false, message: 'Invalid history array' });
    }
    db.dischargeHistory = dischargeHistory;
    const saved = saveDatabase(db);
    res.json({
      success: saved,
      historyCount: db.dischargeHistory.length,
      lastUpdated: db.lastUpdated,
    });
  });

  // POST reset database back to initial hospital dataset
  app.post('/api/reset', (req, res) => {
    db = {
      beds: INITIAL_BEDS,
      dischargeHistory: INITIAL_DISCHARGE_HISTORY,
      syncLogs: [],
      lastUpdated: new Date().toISOString(),
    };
    const saved = saveDatabase(db);
    res.json({
      success: saved,
      message: 'Reset back to 93 initial beds successfully',
      bedsCount: db.beds.length,
      lastUpdated: db.lastUpdated,
    });
  });

  // Vite middleware for development vs static build for production
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Bed Management Server running on port ${PORT}`);
  });
}

startServer();
