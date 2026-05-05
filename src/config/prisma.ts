import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;

// 💅 Lesson 6: Connection Pooling setup
const pool = new Pool({ 
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Keeping your OT7 connection tester!
export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('🔥 Database connected successfully. OT7 forever.');
  } catch (error) {
    console.error('Database connection failed', error);
    process.exit(1);
  }
};

export default prisma;