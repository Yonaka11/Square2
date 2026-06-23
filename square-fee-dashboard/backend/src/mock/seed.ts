// CLI entry point to (re)seed the local SQLite database with mock data.
// Usage: npm run seed
import 'dotenv/config';
import { initDb } from '../db/database.js';
import { generateMockData } from './mockData.js';

initDb();
console.log('Seeding mock Square data (this clears existing transactional data)...');
const result = generateMockData();
console.log('Mock data seeded:');
console.table(result);
console.log('Done.');
