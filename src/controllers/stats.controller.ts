import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { getCache, setCache, clearCachePrefix } from '../config/cache';

export const getUserStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = 'user_stats';
    const cachedData = getCache(cacheKey);
    if (cachedData) return res.json(cachedData);

    const [totalUsers, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ['role'], _count: { role: true } })
    ]);

    const stats = {
      totalUsers,
      byRole
    };

    setCache(cacheKey, stats, 300); // 5 minutes
    res.json(stats);
  } catch (error) { next(error); }
};