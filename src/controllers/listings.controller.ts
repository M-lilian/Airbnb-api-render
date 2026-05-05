import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { createListingSchema, updateListingSchema } from '../validators/listings.validator';
import { AuthRequest } from '../middlewares/auth.middleware'; 
import { getOptimizedUrl } from '../config/cloudinary';
import { getCache, setCache, clearCachePrefix } from '../config/cache'; // 💅 NEW: Caching guards

// 💅 NEW: Search & Filtering Endpoint
export const searchListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { location, type, minPrice, maxPrice, guests, page = '1', limit = '10' } = req.query;

    const pageNumber = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (pageNumber - 1) * limitNumber;

    const where: any = {};

    if (location) where.location = { contains: location as string, mode: 'insensitive' };
    if (type) where.type = type as string;
    if (guests) where.guests = { gte: parseInt(guests as string) }; 

    if (minPrice || maxPrice) {
      where.pricePerNight = {};
      if (minPrice) where.pricePerNight.gte = parseFloat(minPrice as string);
      if (maxPrice) where.pricePerNight.lte = parseFloat(maxPrice as string);
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limitNumber,
        include: { host: { select: { name: true, email: true } } }
      }),
      prisma.listing.count({ where })
    ]);

    res.json({
      data: listings,
      meta: { total, page: pageNumber, limit: limitNumber, totalPages: Math.ceil(total / limitNumber) }
    });
  } catch (error) { next(error); }
};

export const getListingStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 💅 NEW: Check cache first!
    const cacheKey = 'listings_stats';
    const cachedData = getCache(cacheKey);
    if (cachedData) return res.json(cachedData);

    // 💅 NEW: Using Prisma aggregate & groupBy with Promise.all
    const [totalListings, priceStats, byLocation, byType] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.aggregate({ _avg: { pricePerNight: true } }),
      prisma.listing.groupBy({ by: ['location'], _count: { location: true } }),
      prisma.listing.groupBy({ by: ['type'], _count: { type: true } })
    ]);

    const stats = {
      totalListings,
      averagePrice: priceStats._avg.pricePerNight || 0,
      byLocation,
      byType
    };

    // 💅 NEW: Save to cache for 5 minutes (300 seconds)
    setCache(cacheKey, stats, 300);
    res.json(stats);
  } catch (error) { next(error); }
};

export const getAllListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // 💅 NEW: Cache the paginated results for 60 seconds
    const cacheKey = `listings_all_${page}_${limit}`;
    const cachedData = getCache(cacheKey);
    if (cachedData) return res.json(cachedData);

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        skip,
        take: limit,
        include: {
          host: { select: { name: true, avatar: true } },
          _count: { select: { bookings: true } },
          photos: true 
        }
      }),
      prisma.listing.count()
    ]);

    const formattedListings = listings.map(listing => ({
      ...listing,
      photos: listing.photos.map(photo => ({
        ...photo,
        url: getOptimizedUrl(photo.url, 500, 500)
      }))
    }));

    const response = {
      data: formattedListings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };

    setCache(cacheKey, response, 60);
    res.json(response);
  } catch (error) { next(error); }
};

export const getListingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: parseInt(req.params.id as string) },
      include: {
        host: true,
        bookings: { include: { guest: { select: { name: true, avatar: true } } } },
        photos: true 
      }
    });
    
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.host) {
      const { password, resetToken, resetTokenExpiry, ...safeHost } = listing.host as any;
      listing.host = safeHost;
    }

    const formattedListing = {
      ...listing,
      photos: listing.photos.map(photo => ({
        ...photo,
        url: getOptimizedUrl(photo.url, 500, 500)
      }))
    };

    res.json(formattedListing);
  } catch (error) { next(error); }
};

export const createListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = createListingSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ errors: result.error.issues });

    const listing = await prisma.listing.create({ 
      data: { ...result.data, hostId: req.userId as number } 
    });

    clearCachePrefix('listings_'); // 💅 INVLIDATE CACHE!
    res.status(201).json(listing);
  } catch (error) { next(error); }
};

export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.id as string);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      return res.status(403).json({ error: "You can only edit your own listings" });
    }

    const result = updateListingSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ errors: result.error.issues });

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: result.data
    });

    clearCachePrefix('listings_'); // 💅 INVLIDATE CACHE!
    res.json(updatedListing);
  } catch (error) { next(error); }
};

export const deleteListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.id as string);

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    if (listing.hostId !== req.userId && req.role !== "ADMIN") {
      return res.status(403).json({ error: "You can only delete your own listings" });
    }

    await prisma.listing.delete({ where: { id: listingId } });
    
    clearCachePrefix('listings_'); // 💅 INVLIDATE CACHE!
    res.status(204).send();
  } catch (error) { next(error); }
};