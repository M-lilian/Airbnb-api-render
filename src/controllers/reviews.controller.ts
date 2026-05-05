import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getCache, setCache, clearCachePrefix } from '../config/cache';

export const addReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.id as string);
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ error: 'Rating and comment are required' });
    }

    // Rubric requirement: Rating must be between 1 and 5
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const review = await prisma.review.create({
      data: {
        rating,
        comment,
        guestId: req.userId as number,
        listingId,
      }
    });

    // Invalidate cache for this listing's reviews
    clearCachePrefix(`reviews_${listingId}`);
    res.status(201).json(review);
  } catch (error) { next(error); }
};

export const getReviewsByListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.id as string);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `reviews_${listingId}_${page}_${limit}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { listingId },
        skip,
        take: limit,
        include: { guest: { select: { name: true, avatar: true } } }
      }),
      prisma.review.count({ where: { listingId } })
    ]);

    const response = {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };

    setCache(cacheKey, response, 30); // Cache for 30 seconds
    res.json(response);
  } catch (error) { next(error); }
};

export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reviewId = parseInt(req.params.id as string);

    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    if (review.guestId !== req.userId && req.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this review' });
    }

    await prisma.review.delete({ where: { id: reviewId } });
    
    clearCachePrefix(`reviews_${review.listingId}`);
    res.json({ message: 'Review successfully deleted' });
  } catch (error) { next(error); }
};