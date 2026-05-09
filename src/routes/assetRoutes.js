import express from 'express';
import * as assetController from '../controllers/asset.controller.js';

const router = express.Router();
router.get('/', assetController.getAssets);

export default router;