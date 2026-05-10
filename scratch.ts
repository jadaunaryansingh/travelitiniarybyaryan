import { handleGenerateItinerary } from './server/routes/itinerary';
import dotenv from 'dotenv';
dotenv.config();

const req = {
  body: {
    city: 'Delhi',
    budget: 10000,
    days: 2,
    travelers: 2,
    interests: ['Culture'],
    accommodation: 'hotel',
    transportation: 'taxi'
  }
} as any;

const res = {
  json: (data: any) => console.log('SUCCESS:', JSON.stringify(data, null, 2)),
  status: (code: number) => ({
    json: (data: any) => console.error('ERROR', code, data)
  })
} as any;

handleGenerateItinerary(req, res).catch(console.error);
