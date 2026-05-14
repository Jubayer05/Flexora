import type { NextFunction, Request, Response } from 'express';
import rankService from '../services/rank.service';
import { sendSuccessResponse } from '../utils/response-handler';
import {
  CreateRankSchema,
  RankQuerySchema,
  UpdateRankSchema,
} from '../validations/zod/rank.schema';

/**
 * @route   POST /api/admin/ranks
 * @desc    Create a new rank
 * @access  Admin only
 */
export const createRank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = CreateRankSchema.parse(req.body);
    const rank = await rankService.create(data);

    return sendSuccessResponse(res, rank, 'Rank created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/admin/ranks
 * @desc    Get all ranks with pagination
 * @access  Admin/Moderator
 */
export const getRanks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = RankQuerySchema.parse(req.query);
    const result = await rankService.findMany(query);

    return sendSuccessResponse(res, result, `Retrieved ${result.ranks.length} rank(s)`);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/admin/ranks/all
 * @desc    Get all ranks without pagination (for dropdowns)
 * @access  Admin/Moderator
 */
export const getAllRanks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ranks = await rankService.findAll();

    return sendSuccessResponse(res, ranks, `Retrieved ${ranks.length} rank(s)`);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/admin/ranks/:id
 * @desc    Get rank by ID
 * @access  Admin/Moderator
 */
export const getRankById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id!, 10);
    const rank = await rankService.findById(id);

    return sendSuccessResponse(res, rank, 'Rank retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/admin/ranks/:id
 * @desc    Update rank
 * @access  Admin only
 */
export const updateRank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id!, 10);
    const data = UpdateRankSchema.parse(req.body);
    const rank = await rankService.update(id, data);

    return sendSuccessResponse(res, rank, 'Rank updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/admin/ranks/:id
 * @desc    Delete rank
 * @access  Admin only
 */
export const deleteRank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id!, 10);
    const result = await rankService.delete(id);

    return sendSuccessResponse(res, result, 'Rank deleted successfully');
  } catch (error) {
    next(error);
  }
};
