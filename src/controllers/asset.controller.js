import * as userService from '../services/asset.service.js';

export const getAssets = async (req, res, next) => {
  try {
    const assets = await userService.getAllAssets();
    res.json(assets);
  } catch (error) {
    next(error);
  }
};