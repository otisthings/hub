import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import helmet from 'helmet';
import MySQLStore from 'express-mysql-session';
import { getDatabase } from './config/database.js';

import { initializeDatabase, closeDatabase } from './config/database.js';
import { initializeStaffDatabase } from './config/staffDatabase.js';
import { initializeTimeclockDatabase } from './config/timeclockDatabase.js';
import { configurePassport } from './config/passport.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import profileRoutes from './routes/profile.js';
import timeclockRoutes from './routes/timeclock.js';
import departmentsRoutes from './routes/departments.js';
import { featureFlags, requireFeature } from './config/features.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CRITICAL: Trust proxy MUST be set FIRST and ALWAYS for NGINX reverse proxy
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = NODE_ENV === 'production' 
      ? [process.env.VITE_APP_URL || 'http://localhost:5173']
      : ['http://localhost:5173', 'http://localhost:3002'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// CRITICAL: Add CORS headers manually for extra safety in production
app.use((req, res, next) => {
  if (NODE_ENV === 'production') {
    const origin = req.get('Origin');
    const allowedOrigin = process.env.VITE_APP_URL || 'http://localhost:5173';
    if (origin && origin === allowedOrigin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Cookie');
    }
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize databases and passport
async function startServer() {
  try {
    // Initialize main database
    await initializeDatabase();
    
    // Initialize MySQL session store
    const MySQLStoreSession = MySQLStore(session);
    const sessionStore = new MySQLStoreSession({}, getDatabase());

    // Get domain from VITE_APP_URL
    let domain;
    try {
      domain = NODE_ENV === 'production' ? new URL(process.env.VITE_APP_URL).hostname : undefined;
    } catch (error) {
      domain = undefined;
    }

    // CRITICAL: Fixed session configuration for NGINX SSL termination
    const sessionConfig = {
      secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        secure: NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
        domain: domain,
        path: '/'
      },
      name: 'sessionId',
      proxy: true,
      rolling: true
    };

    app.use(session(sessionConfig));
    
    // Initialize staff database (optional)
    if (featureFlags.enablePlayerRecord) {
      try {
        await initializeStaffDatabase();
      } catch (error) {
        console.error('? Staff database connection failed - player record features will be disabled:', error);
        featureFlags.enablePlayerRecord = false;
      }
    } else {
      console.log('?? Staff database connection skipped - player record features are disabled');
    }
    
    // Initialize timeclock database (optional)
    if (featureFlags.enableDepartments || featureFlags.enableOrganizations || featureFlags.enableTimeclock) {
      try {
        await initializeTimeclockDatabase();
      } catch (error) {
        console.error('? Timeclock database connection failed - timeclock related features will be disabled:', error);
        featureFlags.enableDepartments = false;
        featureFlags.enableOrganizations = false;
        featureFlags.enableTimeclock = false;
      }
    } else {
      console.log('?? Timeclock database connection skipped - timeclock related features are disabled');
    }
    
    // Configure passport
    await configurePassport();
    
    // Passport configuration
    app.use(passport.initialize());
    app.use(passport.session());

    // Serve static files from React build in production
    if (NODE_ENV === 'production') {
      const buildPath = path.join(__dirname, '../dist');
      app.use(express.static(buildPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true
      }));
    }

    // API Routes
    app.use('/auth', authRoutes);
    app.use('/api', apiRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/timeclock', requireFeature('enableTimeclock'), timeclockRoutes);
    app.use('/api/departments', requireFeature('enableDepartments'), departmentsRoutes);
    
    // Health check endpoint with enhanced session info
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        uptime: process.uptime(),
        port: PORT,
        features: featureFlags,
        session: {
          configured: !!req.sessionID,
          authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
          cookieConfig: sessionConfig.cookie,
          hasUser: !!req.user,
          sessionID: req.sessionID
        },
        cors: {
          origin: req.get('Origin'),
          allowedOrigins: 'Dynamic based on environment'
        },
        proxy: {
          trustProxy: app.get('trust proxy'),
          secure: req.secure,
          protocol: req.protocol,
          ip: req.ip,
          headers: {
            'x-forwarded-proto': req.get('X-Forwarded-Proto'),
            'x-forwarded-for': req.get('X-Forwarded-For'),
            'x-forwarded-host': req.get('X-Forwarded-Host')
          }
        }
      });
    });

    // Serve React app for all other routes in production
    if (NODE_ENV === 'production') {
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
      });
    }
    
    // Global error handling middleware
    app.use((err, req, res, next) => {
      console.error('? Server Error:', err);
      
      // Don't leak error details in production
      const errorMessage = NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;
      
      res.status(err.status || 500).json({ 
        error: errorMessage,
        ...(NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // 404 handler for API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
    
    const server = app.listen(PORT, () => {
      console.log(`?? Server running on port ${PORT}`);
      console.log(`?? Environment: ${NODE_ENV}`);
      if (NODE_ENV === 'development') {
        console.log(`?? Auth URL: http://localhost:${PORT}/auth/discord`);
      } else {
        console.log(`?? Production API: ${process.env.VITE_API_URL}`);
        console.log(`?? Production Frontend: ${process.env.VITE_APP_URL}`);
        console.log(`?? Auth URL: ${process.env.VITE_API_URL}/auth/discord`);
      }
    });

    // Add MySQL session store cleanup on server shutdown
    process.on('SIGINT', async () => {
      await sessionStore.close();
      await closeDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await sessionStore.close();
      await closeDatabase();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();