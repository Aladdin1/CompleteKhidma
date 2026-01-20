import express from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth.js';
import pool from '../../config/database.js';

const router = express.Router();

/**
 * GET /api/v1/categories
 * List all task categories
 */
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { parent_id, active } = req.query;

    let query = 'SELECT * FROM task_categories WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (parent_id) {
      query += ` AND parent_id = $${paramIndex++}`;
      params.push(parent_id);
    } else {
      query += ` AND parent_id IS NULL`;
    }

    if (active !== undefined) {
      query += ` AND active = $${paramIndex++}`;
      params.push(active === 'true');
    }

    query += ' ORDER BY sort_order ASC, name_en ASC';

    const result = await pool.query(query, params);

    res.json({
      categories: result.rows.map(row => ({
        id: row.id,
        name_en: row.name_en,
        name_ar: row.name_ar,
        parent_id: row.parent_id,
        icon_url: row.icon_url,
        active: row.active
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/categories/:category_id/pricing
 * Get pricing bands for category
 */
router.get('/:category_id/pricing', optionalAuth, async (req, res, next) => {
  try {
    const { category_id } = req.params;
    const { city } = req.query;

    let query = `
      SELECT * FROM pricing_bands
      WHERE category_id = $1 AND active = true
    `;
    const params = [category_id];

    if (city) {
      query += ` AND (city = $2 OR city IS NULL)`;
      params.push(city);
    }

    query += ' ORDER BY min_amount ASC';

    const result = await pool.query(query, params);

    res.json({
      bands: result.rows.map(row => ({
        id: row.id,
        category_id: row.category_id,
        city: row.city,
        min_amount: row.min_amount,
        max_amount: row.max_amount,
        currency: row.currency
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/pricing/estimate
 * Estimate task price
 */
router.post('/estimate', optionalAuth, async (req, res, next) => {
  try {
    const { category_id, city, estimated_minutes, pricing_model } = req.body;

    // Get pricing band
    const bandResult = await pool.query(
      `SELECT * FROM pricing_bands
       WHERE category_id = $1 AND active = true
       AND (city = $2 OR city IS NULL)
       ORDER BY city DESC NULLS LAST
       LIMIT 1`,
      [category_id, city]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NO_PRICING',
          message: 'No pricing band found for this category and city'
        }
      });
    }

    const band = bandResult.rows[0];
    const model = pricing_model || 'hourly';

    let estimate;
    if (model === 'hourly') {
      const hours = Math.ceil((estimated_minutes || 60) / 60);
      estimate = {
        min_total: {
          currency: band.currency,
          amount: band.min_amount * hours
        },
        max_total: {
          currency: band.currency,
          amount: band.max_amount * hours
        },
        estimated_minutes: estimated_minutes || 60
      };
    } else {
      estimate = {
        min_total: {
          currency: band.currency,
          amount: band.min_amount
        },
        max_total: {
          currency: band.currency,
          amount: band.max_amount
        },
        estimated_minutes: estimated_minutes || 60
      };
    }

    res.json({
      estimate,
      pricing_model: model,
      band_id: band.id
    });
  } catch (error) {
    next(error);
  }
});

export default router;
