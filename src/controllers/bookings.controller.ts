import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { createBookingSchema } from '../validators/bookings.validator';
import { AuthRequest } from '../middlewares/auth.middleware';
import { sendEmail } from '../config/email';
import { bookingConfirmationEmail, bookingCancellationEmail } from '../templates/emails';
import { clearCachePrefix } from '../config/cache'; // 💅 NEW: Cache invalidator

export const getAllBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 💅 NEW: Pagination setup
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // 💅 NEW: Promise.all for parallel fetching
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        skip,
        take: limit,
        include: {
          guest: { select: { name: true } },
          listing: { select: { title: true } }
        }
      }),
      prisma.booking.count()
    ]);

    // 💅 NEW: Returned with required meta object
    res.json({
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) { next(error); }
};

export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id as string) },
      include: {
        guest: { select: { name: true, email: true } },
        listing: { include: { host: { select: { name: true } } } }
      }
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(booking);
  } catch (error) { next(error); }
};

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ errors: result.error.issues });

    const { listingId, checkIn, checkOut } = result.data;
    const guestId = req.userId as number;

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);

    // 💅 PART 5: THE TRANSACTION GLOW-UP (Kept exactly as you wrote it!)
    const newBooking = await prisma.$transaction(async (tx) => {
      const listing = await tx.listing.findUnique({ where: { id: listingId } });
      if (!listing) throw new Error("NOT_FOUND");

      const conflict = await tx.booking.findFirst({
        where: {
          listingId,
          status: "CONFIRMED",
          checkIn: { lt: outDate },
          checkOut: { gt: inDate }
        }
      });

      if (conflict) {
        throw new Error("BOOKING_CONFLICT");
      }

      const days = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalPrice = days * listing.pricePerNight;

      return tx.booking.create({
        data: {
          listingId,
          guestId,
          checkIn: inDate,
          checkOut: outDate,
          totalPrice,
          status: "PENDING"
        },
        include: { listing: true, guest: true } 
      });
    });

    clearCachePrefix('bookings_'); // 💅 NEW: Clear cache on success!
    res.status(201).json(newBooking);

    // 📧 Best-effort email
    try {
      await sendEmail(
        newBooking.guest.email,
        "Your Booking is Confirmed!",
        bookingConfirmationEmail(
          newBooking.guest.name,
          newBooking.listing.title,
          newBooking.listing.location,
          inDate.toDateString(),
          outDate.toDateString(),
          newBooking.totalPrice
        )
      );
    } catch (emailError) {
      console.error("[EMAIL ERROR] Confirmation email failed:", emailError);
    }

  } catch (error: any) {
    if (error.message === "BOOKING_CONFLICT") {
      return res.status(409).json({ error: "These dates are already snatched! Try a different time, bestie." });
    }
    if (error.message === "NOT_FOUND") {
      return res.status(404).json({ error: "That listing doesn't exist." });
    }
    next(error);
  }
};

export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookingId = parseInt(req.params.id as string);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: true,
        listing: true
      }
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.guestId !== req.userId && req.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden: You can only cancel your own bookings" });
    }

    if (booking.status === "CANCELLED") {
      return res.status(400).json({ error: "Booking is already cancelled" });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CANCELLED" }
    });

    clearCachePrefix('bookings_'); // 💅 NEW: Clear cache on cancel!
    res.json(updatedBooking);

    try {
      await sendEmail(
        booking.guest.email,
        "Your Booking Has Been Cancelled",
        bookingCancellationEmail(
          booking.guest.name,
          booking.listing.title,
          booking.checkIn.toDateString(),
          booking.checkOut.toDateString()
        )
      );
    } catch (emailError) {
      console.error("[EMAIL ERROR] Cancellation email failed:", emailError);
    }
  } catch (error) { next(error); }
};