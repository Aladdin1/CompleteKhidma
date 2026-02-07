import express from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.js';
import pool from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
// In production, use cloud storage (S3, etc.)
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = {
      image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      voice: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
      document: ['application/pdf', 'application/msword', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    };

    const kind = req.body.kind || 'image';
    if (allowedMimes[kind]?.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${kind}. Allowed: ${allowedMimes[kind]?.join(', ')}`));
    }
  }
});

/**
 * POST /api/v1/media/upload
 * Upload media file
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const { kind } = z.object({
      kind: z.enum(['image', 'voice', 'document'])
    }).parse(req.body);

    const userId = req.user.id;
    const fileId = uuidv4();

    // In production, upload to cloud storage (S3, etc.)
    // For now, store file path
    const storageUrl = `/media/${fileId}${path.extname(req.file.originalname)}`;
    const storageKey = req.file.filename;

    // Move file to permanent location (in production, upload to cloud)
    const permanentPath = path.join('public', 'media', `${fileId}${path.extname(req.file.originalname)}`);
    fs.mkdirSync(path.dirname(permanentPath), { recursive: true });
    fs.renameSync(req.file.path, permanentPath);

    const result = await pool.query(
      `INSERT INTO media_files (id, user_id, kind, mime_type, file_size, storage_url, storage_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        fileId,
        userId,
        kind,
        req.file.mimetype,
        req.file.size,
        storageUrl,
        storageKey
      ]
    );

    res.status(201).json({
      id: result.rows[0].id,
      url: storageUrl,
      kind: result.rows[0].kind,
      mime_type: result.rows[0].mime_type,
      file_size: result.rows[0].file_size,
      created_at: result.rows[0].created_at
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

/**
 * GET /api/v1/media/:media_id
 * Get media file info
 */
router.get('/:media_id', authenticate, async (req, res, next) => {
  try {
    const { media_id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT * FROM media_files WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [media_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Media file not found'
        }
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
