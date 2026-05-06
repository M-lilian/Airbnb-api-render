import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Airbnb API',
      version: '1.0.0',
      description: 'The official interactive documentation for the Airbnb API. Built with ENHYPEN data 🎵',
    },
    servers: [
      {
        url: 'https://airbnb-api-render.onrender.com',
        description: 'Production Server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Resource not found' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Lee Heeseung' },
            email: { type: 'string', example: 'heeseung@enhypen.com' },
            username: { type: 'string', example: 'heeseung' },
            phone: { type: 'string', example: '1234567891' },
            role: { type: 'string', enum: ['HOST', 'GUEST'], example: 'HOST' },
            avatar: { type: 'string', nullable: true, example: 'https://res.cloudinary.com/dfr7vk5tx/image/upload/airbnb/avatars/sample.jpg' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-04-30T08:32:32.323Z' },
          },
        },
        Profile: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            bio: { type: 'string', nullable: true, example: 'Late-night gaming enthusiast.' },
            website: { type: 'string', nullable: true, example: 'https://enhypen.com' },
            country: { type: 'string', nullable: true, example: 'South Korea' },
            userId: { type: 'integer', example: 1 },
          },
        },
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Seoul Penthouse with Vocal Room' },
            description: { type: 'string', example: 'Perfect for late-night gaming and singing.' },
            location: { type: 'string', example: 'Seoul, South Korea' },
            pricePerNight: { type: 'number', example: 500 },
            guests: { type: 'integer', example: 7 },
            type: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'VILLA', 'CABIN'], example: 'APARTMENT' },
            amenities: { type: 'array', items: { type: 'string' }, example: ['Wi-Fi', 'Gaming PC', 'Mic'] },
            rating: { type: 'number', nullable: true, example: 4.8 },
            hostId: { type: 'integer', example: 1 },
            host: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-04-30T08:32:32.323Z' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            checkIn: { type: 'string', format: 'date-time', example: '2026-05-10T00:00:00.000Z' },
            checkOut: { type: 'string', format: 'date-time', example: '2026-05-15T00:00:00.000Z' },
            totalPrice: { type: 'number', example: 2500 },
            status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'CANCELLED'], example: 'PENDING' },
            guestId: { type: 'integer', example: 4 },
            listingId: { type: 'integer', example: 1 },
            guest: { $ref: '#/components/schemas/User' },
            listing: { $ref: '#/components/schemas/Listing' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-04-30T08:52:57.250Z' },
          },
        },
        ListingPhoto: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            url: { type: 'string', example: 'https://res.cloudinary.com/dfr7vk5tx/image/upload/airbnb/listings/sample.jpg' },
            publicId: { type: 'string', example: 'airbnb/listings/sample' },
            listingId: { type: 'integer', example: 1 },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'username', 'phone', 'password', 'role'],
          properties: {
            name: { type: 'string', example: 'Park Sunghoon' },
            email: { type: 'string', example: 'sunghoon@enhypen.com' },
            username: { type: 'string', example: 'sunghoon' },
            phone: { type: 'string', example: '1234567894' },
            password: { type: 'string', example: 'ot7forever123' },
            role: { type: 'string', enum: ['HOST', 'GUEST'], example: 'GUEST' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'heeseung@enhypen.com' },
            password: { type: 'string', example: 'ot7forever123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        CreateListingInput: {
          type: 'object',
          required: ['title', 'description', 'location', 'pricePerNight', 'guests', 'type', 'amenities'],
          properties: {
            title: { type: 'string', example: 'Seoul Penthouse with Vocal Room' },
            description: { type: 'string', example: 'Perfect for late-night gaming and singing.' },
            location: { type: 'string', example: 'Seoul, South Korea' },
            pricePerNight: { type: 'number', example: 500 },
            guests: { type: 'integer', example: 7 },
            type: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'VILLA', 'CABIN'], example: 'APARTMENT' },
            amenities: { type: 'array', items: { type: 'string' }, example: ['Wi-Fi', 'Gaming PC', 'Mic'] },
          },
        },
        UpdateListingInput: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Updated Penthouse' },
            description: { type: 'string', example: 'Updated description.' },
            location: { type: 'string', example: 'Seoul, South Korea' },
            pricePerNight: { type: 'number', example: 600 },
            guests: { type: 'integer', example: 5 },
            type: { type: 'string', enum: ['APARTMENT', 'HOUSE', 'VILLA', 'CABIN'], example: 'APARTMENT' },
            amenities: { type: 'array', items: { type: 'string' }, example: ['Wi-Fi', 'Pool'] },
          },
        },
        CreateBookingInput: {
          type: 'object',
          required: ['listingId', 'checkIn', 'checkOut'],
          properties: {
            listingId: { type: 'integer', example: 1 },
            checkIn: { type: 'string', format: 'date-time', example: '2026-05-10T00:00:00Z' },
            checkOut: { type: 'string', format: 'date-time', example: '2026-05-15T00:00:00Z' },
          },
        },
        UpdateUserInput: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Lee Heeseung' },
            email: { type: 'string', example: 'heeseung@enhypen.com' },
            username: { type: 'string', example: 'heeseung' },
            phone: { type: 'string', example: '1234567891' },
            role: { type: 'string', enum: ['HOST', 'GUEST'], example: 'HOST' },
          },
        },
        ProfileInput: {
          type: 'object',
          properties: {
            bio: { type: 'string', example: 'Late-night gaming enthusiast.' },
            website: { type: 'string', example: 'https://enhypen.com' },
            country: { type: 'string', example: 'South Korea' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('💅 Swagger Docs are live at: http://localhost:3000/api-docs');
};