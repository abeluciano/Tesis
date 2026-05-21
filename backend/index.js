require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const { apiReference } = require('@scalar/express-api-reference');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tesis API',
      version: '1.0.0',
      description: 'API documentation for Tesis project',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./index.js'],
};

const openapiSpecification = swaggerJsdoc(options);

app.get(
  '/api-docs',
  apiReference({
    spec: {
      content: openapiSpecification,
    },
  })
);

/**
 * @swagger
 * /:
 *   get:
 *     summary: API info
 *     security: []
 *     responses:
 *       200:
 *         description: API info and endpoints
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Tesis API',
    version: '1.0.0',
    endpoints: {
      'POST /auth/register': 'Register a new user',
      'POST /auth/login': 'Login and get JWT',
      'GET /auth/me': 'Get current user info (requires JWT)',
      'GET /reportes': 'Get all reportes with GeoJSON',
    },
  });
});

// Middleware for auth using Firebase Admin SDK
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    const email = decodedToken.email;
    const nombre = decodedToken.name || email.split('@')[0];

    // Find or automatically create user in PostgreSQL
    let result = await pool.query('SELECT id, nombre, email FROM usuarios WHERE email = $1', [email]);
    let user;

    if (result.rows.length === 0) {
      // Auto-register user in PostgreSQL
      const insertResult = await pool.query(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email',
        [nombre, email, 'firebase_auth_managed', 'ciudadano']
      );
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Firebase Auth Error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - email
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Missing fields or email already exists
 */
app.post('/auth/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
      [nombre, email, hash]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and get JWT
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, nombre: user.nombre, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user info
 *     responses:
 *       200:
 *         description: Current user information
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
app.get('/auth/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email, created_at FROM usuarios WHERE id = $1', [req.user.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /reportes:
 *   get:
 *     summary: Get all reportes
 *     security: []
 *     responses:
 *       200:
 *         description: List of reportes
 */
app.get('/reportes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, usuario_id, direccion_aprox, categoria, urgencia, descripcion, foto_url, estado, validado_por, validado_at, created_at, updated_at,
        ST_AsGeoJSON(ubicacion)::json AS geojson
      FROM reportes
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /reportes:
 *   post:
 *     summary: Create a new report
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - categoria
 *               - urgencia
 *               - descripcion
 *               - latitud
 *               - longitud
 *             properties:
 *               categoria:
 *                 type: string
 *               urgencia:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               latitud:
 *                 type: number
 *               longitud:
 *                 type: number
 *     responses:
 *       201:
 *         description: Report created successfully
 *       400:
 *         description: Missing fields or invalid coordinates
 *       401:
 *         description: Unauthorized
 */
app.post('/reportes', authenticate, async (req, res) => {
  try {
    const { categoria, urgencia, descripcion, latitud, longitud } = req.body;
    if (!categoria || !urgencia || !descripcion || latitud === undefined || longitud === undefined) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const result = await pool.query(
      `INSERT INTO reportes (
        usuario_id, 
        ubicacion, 
        categoria, 
        urgencia, 
        descripcion, 
        estado, 
        created_at, 
        updated_at
      ) VALUES (
        $1, 
        ST_SetSRID(ST_MakePoint($2, $3), 4326), 
        $4, 
        $5, 
        $6, 
        'pendiente', 
        NOW(), 
        NOW()
      ) RETURNING 
        id, usuario_id, categoria, urgencia, descripcion, estado, created_at, updated_at,
        ST_AsGeoJSON(ubicacion)::json AS geojson`,
      [req.user.id, lng, lat, categoria, urgencia, descripcion]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
