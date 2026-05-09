import * as assetRepository from '../repositories/asset.repository.js';
import AppError from '../utils/appError.js';

export const getAllAssets = async () =>{
    return await assetRepository.findAll(); // This will return an array of all assets from the database
};

export const getAssetById = async (id) =>{
    const asset = await assetRepository.findById(id);
    if (!asset) {
        throw new AppError('Asset Not Found',404);
    }
    return asset;
};