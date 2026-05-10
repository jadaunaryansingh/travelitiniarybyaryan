import { Request, Response } from 'express';

interface ItineraryRequest {
  city: string;
  budget: number;
  days: number;
  travelers: number;
  interests: string[];
  accommodation: string;
  transportation: string;
}

interface ItineraryDay {
  day: number;
  activities: string[];
  meals: string[];
  accommodation: string;
  estimatedCost: number;
}

interface ItineraryResponse {
  city: string;
  summary: string;
  totalBudget: number;
  days: ItineraryDay[];
  tips: string[];
  emergencyContacts: string[];
}

export async function handleGenerateItinerary(req: Request, res: Response) {
  try {
    const {
      city,
      budget,
      days,
      travelers,
      interests,
      accommodation,
      transportation
    }: ItineraryRequest = req.body;

    // Validate input
    if (!city || budget <= 0 || days <= 0 || travelers <= 0 || !interests || interests.length === 0) {
      return res.status(400).json({
        error: 'Invalid input parameters. Please provide city, budget, days, travelers, and at least one interest.'
      });
    }

    // Generate itinerary using real places from Google Places API
    const structuredItinerary = await generateGoogleItinerary({
      city,
      budget,
      days,
      travelers,
      interests,
      accommodation,
      transportation
    });

    res.json(structuredItinerary);
  } catch (error) {
    console.error('Error generating itinerary:', error);
    res.status(500).json({
      error: 'Failed to generate itinerary'
    });
  }
}

function createItineraryPrompt(request: ItineraryRequest): string {
  const { city, budget, days, travelers, interests, accommodation, transportation } = request;
  
  return `Create a detailed ${days}-day travel itinerary for ${city} with the following requirements:

Budget: ₹${budget} INR total for ${travelers} traveler${travelers > 1 ? 's' : ''}
Accommodation preference: ${accommodation}
Transportation preference: ${transportation}
Interests: ${interests.join(', ')}

IMPORTANT: You must provide REAL, SPECIFIC places, restaurants, and activities that actually exist in ${city}. Do not use generic placeholders like "local restaurant" or "city attraction". Research and provide actual names of:

- Real restaurants with specific cuisines
- Actual tourist attractions and landmarks
- Specific neighborhoods and areas
- Real hotels/accommodations in that price range
- Authentic local experiences

CRITICAL VARIETY REQUIREMENT: Each day must be COMPLETELY UNIQUE with different:
- Different restaurants for each meal (never repeat the same restaurant)
- Different activities and attractions (never visit the same place twice)
- Different neighborhoods/areas to explore
- Varied experiences based on the time of day
- Mix of popular tourist spots and hidden local gems

Please provide a comprehensive itinerary that includes:

1. A brief summary of the trip highlighting real places in ${city}
2. Daily breakdown for each of the ${days} days including:
   - 3-4 SPECIFIC activities with real place names (e.g., "Visit Taj Mahal", "Explore Connaught Place", not "visit local attractions")
   - SPECIFIC meal suggestions with DIFFERENT real restaurant names for each day (e.g., "Lunch at Karim's in Old Delhi", "Dinner at Punjab Grill in Connaught Place", "Breakfast at The Coffee House")
   - Specific accommodation details with real hotel names or areas
   - Realistic estimated daily cost in INR
3. 5-7 practical travel tips specific to ${city} considering ${transportation} transportation
4. Emergency contact information for ${city}

Make sure the total cost fits within the ₹${budget} INR budget. Focus on authentic local experiences and practical information that matches the traveler's preferences for ${accommodation} accommodation, ${transportation} transportation, and interests in ${interests.join(', ')}.

CRITICAL: Use REAL PLACE NAMES, RESTAURANT NAMES, and SPECIFIC LOCATIONS. For example:
- Instead of "visit a museum": "Visit the National Museum" or "Explore the British Museum"
- Instead of "eat at a local restaurant": "Have dinner at Punjab Grill" or "Try street food at Chandni Chowk"
- Instead of "stay in a hotel": "Stay at The Oberoi" or "Check into Hotel Taj Palace"

VARIETY EXAMPLES FOR ${city}:
Day 1: Focus on historical sites and Old Delhi experiences
Day 2: Modern areas, shopping districts, and contemporary attractions  
Day 3: Nature parks, gardens, and outdoor activities
Day 4+: Mix of cultural experiences, local markets, and unique neighborhoods

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "city": "${city}",
  "summary": "brief summary here mentioning real places",
  "totalBudget": ${budget},
  "days": [
    {
      "day": 1,
      "activities": ["Visit Taj Mahal and explore the surrounding gardens", "Take a rickshaw ride through Old Delhi", "Watch the sunset at India Gate"],
      "meals": ["Breakfast at hotel", "Lunch at Karim's in Old Delhi", "Dinner at Punjab Grill in Connaught Place"],
      "accommodation": "Stay at The Oberoi in central Delhi",
      "estimatedCost": 5000
    },
    {
      "day": 2,
      "activities": ["Explore Humayun's Tomb and gardens", "Visit Lodhi Gardens for a peaceful walk", "Shop at local markets in Hauz Khas"],
      "meals": ["Breakfast at The Coffee House", "Lunch at The Spice Route in Aerocity", "Dinner at Indian Accent in Lodhi Road"],
      "accommodation": "Continue stay at The Oberoi",
      "estimatedCost": 4500
    }
  ],
  "tips": ["Use Delhi Metro for efficient travel", "Carry cash for street vendors", "Visit during cooler months"],
  "emergencyContacts": ["Police: 100", "Tourist Police: Contact hotel", "Medical: 102"]
}

Do not include any other text, explanations, or formatting outside of this JSON structure.`;
}

async function callGroqAPI(prompt: string): Promise<any> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set');
  
  try {
    console.log('Sending Groq API request with prompt:', prompt.substring(0, 100) + '...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error response:', errorData);
      throw new Error(`Groq API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Groq API call failed:', error);
    throw error;
  }
}

function parseGroqResponse(apiResponse: string, request: ItineraryRequest): ItineraryResponse {
  try {
    console.log('Raw Groq response:', apiResponse.substring(0, 200) + '...');
    const jsonMatch = apiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return structureItinerary(parsed, request);
    }
    const parsed = JSON.parse(apiResponse);
    return structureItinerary(parsed, request);
  } catch (error) {
    console.error('Failed to parse Groq response, returning default structure:', error);
    const { city, budget, days } = request;
    return {
      city,
      summary: `A ${days}-day adventure in ${city} tailored to your interests and budget.`,
      totalBudget: budget,
      days: generateDefaultDays(days, city),
      tips: generateDefaultTips(city),
      emergencyContacts: generateDefaultContacts(city)
    };
  }
}

function structureItinerary(parsed: any, request: ItineraryRequest): ItineraryResponse {
  const { city, budget, days, travelers } = request;
  
  return {
    city: parsed.city || city,
    summary: parsed.summary || `A ${days}-day adventure in ${city} tailored to your interests and budget.`,
    totalBudget: parsed.totalBudget || budget,
    days: parsed.days || generateDefaultDays(days, city),
    tips: parsed.tips || generateDefaultTips(city),
    emergencyContacts: parsed.emergencyContacts || generateDefaultContacts(city)
  };
}

// Kept for compatibility; now unused but safe to leave
async function createStructuredItinerary(apiResponse: string, request: ItineraryRequest): Promise<ItineraryResponse> {
  return generateGoogleItinerary(request);
}

async function generateGoogleItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
  const { city, budget, days, interests, accommodation, transportation } = request;

  let cityPlaces: any = null;
  try {
    cityPlaces = await getCitySpecificAttractions(city);
  } catch (err) {
    console.warn('Google Places API failed, falling back to Groq AI:', err);
  }

  // If Google Places returned sufficient data, use it
  if (cityPlaces && cityPlaces.landmarks.length > 0 && cityPlaces.restaurants.length > 0) {
    return {
      city,
      summary: `A ${days}-day itinerary for ${city} built using real restaurants and attractions from Google Places.`,
      totalBudget: budget,
      days: generateGoogleDays(days, city, interests, accommodation, transportation, budget, cityPlaces),
      tips: generateEnhancedTips(city, interests),
      emergencyContacts: generateEnhancedContacts(city)
    };
  }

  // Fallback: use Groq LLM to generate the itinerary
  console.log('Falling back to Groq AI for itinerary generation...');
  const prompt = createItineraryPrompt(request);
  const groqResponse = await callGroqAPI(prompt);
  return parseGroqResponse(groqResponse, request);
}

function generateGoogleDays(days: number, city: string, interests: string[], accommodation: string, transportation: string, budget: number, places: any): ItineraryDay[] {
  const dailyBudget = Math.max(1, Math.floor(budget / days));
  const hotelSuggestion = places.lodgings.length
    ? `${places.lodgings[0].name} in ${places.lodgings[0].location}`
    : `${accommodation} accommodation in ${city}`;

  return Array.from({ length: days }, (_, index) => {
    const dayNumber = index + 1;
    const daySchedule = generateDailySchedule(dayNumber, city, interests, places, accommodation, days);

    const accommodationDesc = dayNumber === 1
      ? `Check in at ${hotelSuggestion}`
      : dayNumber === days
        ? `Final night at ${hotelSuggestion}`
        : `Continue your stay at ${hotelSuggestion}`;

    const costVariation = 0.95 + Math.random() * 0.1;
    const finalDailyCost = Math.max(1, Math.round(dailyBudget * costVariation));

    return {
      day: dayNumber,
      activities: daySchedule.activities,
      meals: daySchedule.meals,
      accommodation: accommodationDesc,
      estimatedCost: finalDailyCost
    };
  });
}

async function generateEnhancedDays(days: number, city: string, interests: string[], accommodation: string, dailyCost: number): Promise<ItineraryDay[]> {
  // City-specific attractions and activities
  const cityAttractions = await getCitySpecificAttractions(city);
  
  return Array.from({ length: days }, (_, index) => {
    const dayNumber = index + 1;
    const selectedInterests = interests.length > 0 ? interests : ['Local Experiences'];
    
    // Generate specific daily schedule with times and locations - make each day unique
    const daySchedule = generateDailySchedule(dayNumber, city, selectedInterests, cityAttractions, accommodation, days);
    
    // Vary accommodation description by day
    let accommodationDesc = `${accommodation.charAt(0).toUpperCase() + accommodation.slice(1)} accommodation in ${city}`;
    if (dayNumber === 1) accommodationDesc = `Check-in at your ${accommodation} in ${city}`;
    else if (dayNumber === days) accommodationDesc = `Final night at your ${accommodation} in ${city}`;
    else accommodationDesc = `Continue your stay at ${accommodation} in ${city}`;
    
    // Calculate daily cost with some variation but stay within budget
    const costVariation = 0.9 + (Math.random() * 0.2); // 90% to 110% of daily cost
    const finalDailyCost = Math.round(dailyCost * costVariation);
    
    return {
      day: dayNumber,
      activities: daySchedule.activities,
      meals: daySchedule.meals,
      accommodation: accommodationDesc,
      estimatedCost: finalDailyCost
    };
  });
}

async function getCitySpecificAttractions(city: string): Promise<any> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY environment variable is not set');
  }

  const cityCoords = await getCityCoordinates(city, apiKey);
  if (!cityCoords) {
    throw new Error(`Could not resolve coordinates for ${city}`);
  }

  const [landmarks, restaurants, activities, parks, shopping, cafes, lodgings] = await Promise.all([
    getPlacesByType(cityCoords, 'tourist_attraction', apiKey),
    getPlacesByType(cityCoords, 'restaurant', apiKey),
    getPlacesByType(cityCoords, 'museum', apiKey),
    getPlacesByType(cityCoords, 'park', apiKey),
    getPlacesByType(cityCoords, 'shopping_mall', apiKey),
    getPlacesByType(cityCoords, 'cafe', apiKey),
    getPlacesByType(cityCoords, 'lodging', apiKey)
  ]);

  const allActivities = [...activities, ...parks, ...shopping, ...cafes];

  return {
    landmarks: landmarks.slice(0, 8),
    restaurants: restaurants.slice(0, 8),
    activities: allActivities.slice(0, 8),
    lodgings: lodgings.slice(0, 6)
  };
}

async function getCityCoordinates(city: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${apiKey}`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Error getting city coordinates:', error);
    return null;
  }
}

async function getPlacesByType(coords: { lat: number; lng: number }, type: string, apiKey: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coords.lat},${coords.lng}&radius=5000&type=${type}&key=${apiKey}`
    );
    const data = await response.json();
    
    if (data.status === 'OK' && data.results) {
      return data.results
        .filter((place: any) => place.rating && place.rating >= 3.5) // Places with decent ratings
        .map((place: any) => ({
          name: place.name,
          address: place.vicinity || 'Address not available',
          rating: place.rating || 0,
          price_level: place.price_level || 0,
          types: place.types || [],
          place_id: place.place_id,
          location: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          }
        }))
        .sort((a: any, b: any) => b.rating - a.rating); // Sort by rating
    } else if (data.status === 'ZERO_RESULTS') {
      console.log(`No ${type} places found at given coordinates`);
      return [];
    } else {
      console.error(`Google Places API error for ${type}:`, data.status, data.error_message);
      return [];
    }
  } catch (error) {
    console.error(`Error fetching ${type} places:`, error);
    return [];
  }
}

function getDefaultAttractions(city: string): any {
  return {
    landmarks: [
      { name: `${city} City Center`, address: 'City Center', rating: 4.0, price_level: 0, types: ['Local Experiences'] },
      { name: `${city} Main Square`, address: 'Main Square', rating: 4.2, price_level: 0, types: ['Culture & History'] },
      { name: `${city} Local Market`, address: 'Local Market', rating: 4.1, price_level: 0, types: ['Shopping'] }
    ],
    restaurants: [
      { name: `${city} Local Cafe`, address: 'City Center', rating: 4.0, price_level: 1, types: ['breakfast'] },
      { name: `${city} Traditional Restaurant`, address: 'City Center', rating: 4.2, price_level: 2, types: ['lunch'] },
      { name: `${city} Fine Dining`, address: 'City Center', rating: 4.5, price_level: 3, types: ['dinner'] }
    ],
    activities: [
      { name: `${city} Walking Tour`, address: 'City Center', rating: 4.3, price_level: 1, types: ['Culture & History'] },
      { name: `${city} Evening Entertainment`, address: 'City Center', rating: 4.1, price_level: 2, types: ['Nightlife'] }
    ]
  };
}

function generateDailySchedule(day: number, city: string, interests: string[], attractions: any, accommodation: string, totalDays: number): any {
  const landmarks = attractions.landmarks;
  const restaurants = attractions.restaurants;
  const activities = attractions.activities;
  
  // Create a structured daily schedule - make each day unique
  const dailyActivities = [];
  const dailyMeals = [];
  
  // Different time patterns for different days to create variety
  const dayPatterns = {
    1: { // Day 1: Early start, full day of exploration
      slots: [
        { start: '8:00 AM', end: '10:00 AM', label: 'Early Morning' },
        { start: '10:30 AM', end: '12:30 PM', label: 'Late Morning' },
        { start: '2:00 PM', end: '4:00 PM', label: 'Afternoon' },
        { start: '4:30 PM', end: '6:30 PM', label: 'Late Afternoon' },
        { start: '7:00 PM', end: '9:00 PM', label: 'Evening' }
      ]
    },
    2: { // Day 2: Relaxed morning, focus on afternoon/evening
      slots: [
        { start: '9:30 AM', end: '11:30 AM', label: 'Morning' },
        { start: '12:00 PM', end: '2:00 PM', label: 'Midday' },
        { start: '3:00 PM', end: '5:00 PM', label: 'Afternoon' },
        { start: '5:30 PM', end: '7:30 PM', label: 'Evening' },
        { start: '8:00 PM', end: '10:00 PM', label: 'Night' }
      ]
    },
    3: { // Day 3: Mid-morning start, evening focus
      slots: [
        { start: '10:00 AM', end: '12:00 PM', label: 'Late Morning' },
        { start: '1:00 PM', end: '3:00 PM', label: 'Early Afternoon' },
        { start: '4:00 PM', end: '6:00 PM', label: 'Late Afternoon' },
        { start: '6:30 PM', end: '8:30 PM', label: 'Evening' },
        { start: '9:00 PM', end: '11:00 PM', label: 'Late Night' }
      ]
    },
    4: { // Day 4: Balanced day
      slots: [
        { start: '9:00 AM', end: '11:00 AM', label: 'Morning' },
        { start: '11:30 AM', end: '1:30 PM', label: 'Late Morning' },
        { start: '2:00 PM', end: '4:00 PM', label: 'Afternoon' },
        { start: '4:30 PM', end: '6:30 PM', label: 'Late Afternoon' },
        { start: '7:00 PM', end: '9:00 PM', label: 'Evening' }
      ]
    },
    5: { // Day 5: Late start, night focus
      slots: [
        { start: '10:30 AM', end: '12:30 PM', label: 'Late Morning' },
        { start: '1:00 PM', end: '3:00 PM', label: 'Afternoon' },
        { start: '4:00 PM', end: '6:00 PM', label: 'Late Afternoon' },
        { start: '6:30 PM', end: '8:30 PM', label: 'Evening' },
        { start: '9:00 PM', end: '11:00 PM', label: 'Night' }
      ]
    }
  };
  
  // Use day-specific pattern or default pattern
  const timeSlots = dayPatterns[day as keyof typeof dayPatterns]?.slots || dayPatterns[1].slots;
  
  // Rotate through attractions based on day number to ensure variety
  const startIndex = (day - 1) * 2; // Start from different attractions each day
  const rotatedLandmarks = [...landmarks.slice(startIndex), ...landmarks.slice(0, startIndex)];
  const rotatedRestaurants = [...restaurants.slice(startIndex % restaurants.length), ...restaurants.slice(0, startIndex % restaurants.length)];
  const rotatedActivities = [...activities.slice(startIndex % activities.length), ...activities.slice(0, startIndex % activities.length)];
  
  // Assign landmarks to time slots with day-specific logic
  const availableLandmarks = [...rotatedLandmarks];
  timeSlots.forEach((slot, index) => {
    if (availableLandmarks.length > 0 && index < 4) {
      const landmark = availableLandmarks.shift();
      if (landmark) {
        // Vary duration based on day and time
        let duration = '2 hours';
        if (day === 1 && index === 0) duration = '2.5 hours'; // First activity of trip
        else if (day === totalDays && index === timeSlots.length - 1) duration = '1 hour'; // Last activity
        else duration = Math.random() > 0.5 ? '2 hours' : '1.5 hours';
        
        dailyActivities.push(`${slot.start} - ${landmark.name} (${duration}) - ${landmark.address}`);
      }
    }
  });
  
  // Add special activities based on interests and day number
  if (interests.includes('Food & Dining') && rotatedActivities.length > 0) {
    const foodActivity = rotatedActivities.find(a => a.types.some((t: string) => 
      t.includes('food') || t.includes('restaurant') || t.includes('cafe') || t.includes('bar')
    ));
    if (foodActivity) {
      const foodTime = day === 1 ? '5:00 PM' : day === 2 ? '6:00 PM' : '5:30 PM';
      dailyActivities.push(`${foodTime} - ${foodActivity.name} (1.5 hours) - ${foodActivity.address}`);
    }
  }
  
  if (interests.includes('Nightlife') && rotatedActivities.length > 0) {
    const nightActivity = rotatedActivities.find(a => a.types.some((t: string) => 
      t.includes('nightlife') || t.includes('bar') || t.includes('club') || t.includes('entertainment')
    ));
    if (nightActivity) {
      const nightTime = day === 1 ? '9:00 PM' : day === 2 ? '10:00 PM' : '9:30 PM';
      dailyActivities.push(`${nightTime} - ${nightActivity.name} (2 hours) - ${nightActivity.address}`);
    }
  }
  
  if (interests.includes('Culture & History') && rotatedActivities.length > 0) {
    const cultureActivity = rotatedActivities.find(a => a.types.some((t: string) => 
      t.includes('museum') || t.includes('art') || t.includes('cultural') || t.includes('historical')
    ));
    if (cultureActivity) {
      const cultureTime = day === 1 ? '2:00 PM' : day === 2 ? '3:00 PM' : '4:00 PM';
      dailyActivities.push(`${cultureTime} - ${cultureActivity.name} (2 hours) - ${cultureActivity.address}`);
    }
  }
  
  // Add day-specific themed activities for variety
  if (day === 1 && rotatedActivities.length > 0) {
    // Day 1: Orientation and must-see attractions
    const orientationActivity = rotatedActivities.find(a => a.types.some((t: string) => 
      t.includes('tourist_attraction') || t.includes('landmark') || t.includes('monument')
    ));
    if (orientationActivity) {
      dailyActivities.push(`11:00 AM - ${orientationActivity.name} (1 hour) - ${orientationActivity.address}`);
    }
  }
  
  if (day === 2 && rotatedActivities.length > 0) {
    // Day 2: Local experiences and hidden gems
    const localActivity = rotatedActivities.find(a => a.types.some((t: string) => 
      t.includes('park') || t.includes('garden') || t.includes('market')
    ));
    if (localActivity) {
      dailyActivities.push(`2:30 PM - ${localActivity.name} (1.5 hours) - ${localActivity.address}`);
    }
  }
  
  if (day === 3 && rotatedActivities.length > 0) {
    // Day 3: Shopping and entertainment
    const shoppingActivity = rotatedActivities.find(a => a.types.some((t: string) => 
      t.includes('shopping') || t.includes('mall') || t.includes('store')
    ));
    if (shoppingActivity) {
      dailyActivities.push(`4:00 PM - ${shoppingActivity.name} (2 hours) - ${shoppingActivity.address}`);
    }
  }
  
  // Ensure we have at least 4 activities with variety
  while (dailyActivities.length < 4 && availableLandmarks.length > 0) {
    const landmark = availableLandmarks.shift();
    if (landmark) {
      const timeSlot = timeSlots[dailyActivities.length % timeSlots.length];
      dailyActivities.push(`${timeSlot.start} - ${landmark.name} (1.5 hours) - ${landmark.address}`);
    }
  }
  
  // Add meals with specific times and locations - vary by day
  if (rotatedRestaurants.length >= 3) {
    const breakfastTime = day === 1 ? '7:30 AM' : day === 2 ? '8:30 AM' : '8:00 AM';
    const lunchTime = day === 1 ? '12:30 PM' : day === 2 ? '1:30 PM' : '1:00 PM';
    const dinnerTime = day === 1 ? '7:30 PM' : day === 2 ? '8:00 PM' : '7:00 PM';
    
    dailyMeals.push(`${breakfastTime} - Breakfast at ${rotatedRestaurants[0].name} - ${rotatedRestaurants[0].address} (Rating: ${rotatedRestaurants[0].rating}/5)`);
    dailyMeals.push(`${lunchTime} - Lunch at ${rotatedRestaurants[1].name} - ${rotatedRestaurants[1].address} (Rating: ${rotatedRestaurants[1].rating}/5)`);
    dailyMeals.push(`${dinnerTime} - Dinner at ${rotatedRestaurants[2].name} - ${rotatedRestaurants[2].address} (Rating: ${rotatedRestaurants[2].rating}/5)`);
  } else if (rotatedRestaurants.length > 0) {
    const breakfastTime = day === 1 ? '7:30 AM' : day === 2 ? '8:30 AM' : '8:00 AM';
    const lunchTime = day === 1 ? '12:30 PM' : day === 2 ? '1:30 PM' : '1:00 PM';
    const dinnerTime = day === 1 ? '7:30 PM' : day === 2 ? '8:00 PM' : '7:00 PM';

    dailyMeals.push(`${breakfastTime} - Breakfast at ${rotatedRestaurants[0].name} - ${rotatedRestaurants[0].address} (Rating: ${rotatedRestaurants[0].rating}/5)`);
    dailyMeals.push(`${lunchTime} - Lunch at ${rotatedRestaurants[0].name} - ${rotatedRestaurants[0].address} (Rating: ${rotatedRestaurants[0].rating}/5)`);
    dailyMeals.push(`${dinnerTime} - Dinner at ${rotatedRestaurants[0].name} - ${rotatedRestaurants[0].address} (Rating: ${rotatedRestaurants[0].rating}/5)`);
  } else {
    throw new Error(`No restaurant data available for ${city}`);
  }
  
  return {
    activities: dailyActivities.slice(0, 4),
    meals: dailyMeals
  };
}

function generateEnhancedTips(city: string, interests: string[]): string[] {
  const baseTips = [
    `Research local customs and etiquette before visiting ${city}`,
    'Keep emergency numbers handy and know embassy locations',
    'Learn basic phrases in the local language',
    'Always carry copies of important documents',
    'Be aware of local scams and tourist traps',
    'Respect local dress codes and cultural norms',
    'Keep valuables secure and be mindful of pickpockets'
  ];

  const interestSpecificTips = interests.map(interest => {
    switch (interest) {
      case 'Food & Dining':
        return `Try local specialties and ask locals for restaurant recommendations in ${city}`;
      case 'Culture & History':
        return `Visit ${city} during local festivals for authentic cultural experiences`;
      case 'Nature & Outdoors':
        return `Check weather conditions and pack appropriate gear for outdoor activities in ${city}`;
      case 'Shopping':
        return `Visit local markets early in the morning for the best selection and prices in ${city}`;
      case 'Adventure Sports':
        return `Ensure you have proper safety equipment and local guides for adventure activities in ${city}`;
      default:
        return `Research ${interest.toLowerCase()} opportunities specific to ${city}`;
    }
  });

  return [...baseTips, ...interestSpecificTips].slice(0, 8);
}

function generateEnhancedContacts(city: string): string[] {
  return [
    'Emergency Services: 911 (or local equivalent)',
    'Local Police: Check with your hotel for nearest station',
    'Hospital: Ask your hotel for nearest medical facility',
    'Your Country\'s Embassy: Check embassy website',
    'Hotel Front Desk: Available 24/7 for assistance',
    'Tourist Information Center: Usually in city center',
    `${city} Tourism Board: Visit official tourism website`,
    'Local Emergency: Ask hotel staff for local emergency numbers'
  ];
}

function generateDefaultDays(days: number, city: string): ItineraryDay[] {
  const dayActivities = [
    ['City orientation tour', 'Visit main landmarks', 'Local market exploration', 'Evening cultural show'],
    ['Museum visits', 'Historical site exploration', 'Local cuisine tasting', 'Sunset viewpoint'],
    ['Nature walk', 'Adventure activities', 'Shopping district', 'Nightlife experience'],
    ['Day trip to nearby attractions', 'Relaxation time', 'Local workshop', 'Traditional dinner'],
    ['Hidden gems discovery', 'Photography spots', 'Local interaction', 'Farewell celebration']
  ];

  const meals = [
    ['Local breakfast cafe', 'Traditional lunch restaurant', 'Fine dining experience'],
    ['Hotel breakfast', 'Street food lunch', 'Local bistro dinner'],
    ['Cafe breakfast', 'Market food lunch', 'Rooftop dinner'],
    ['Bakery breakfast', 'Local eatery lunch', 'Cultural dinner'],
    ['Quick breakfast', 'Casual lunch', 'Special farewell dinner']
  ];

  return Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    activities: dayActivities[index % dayActivities.length] || dayActivities[0],
    meals: meals[index % meals.length] || meals[0],
    accommodation: 'Your selected accommodation',
    estimatedCost: Math.floor(Math.random() * 100) + 50
  }));
}

function generateDefaultTips(city: string): string[] {
  return [
    `Research local customs and etiquette before visiting ${city}`,
    'Keep emergency numbers handy and know the location of your country\'s embassy',
    'Learn a few basic phrases in the local language',
    'Always carry a copy of your important documents',
    'Be aware of local scams and tourist traps',
    'Respect local dress codes and cultural norms',
    'Keep your valuables secure and be mindful of pickpockets'
  ];
}

function generateDefaultContacts(city: string): string[] {
  return [
    'Emergency Services: 911 (or local equivalent)',
    'Local Police: Check with your hotel for nearest station',
    'Hospital: Ask your hotel for nearest medical facility',
    'Your Country\'s Embassy: Check embassy website',
    'Hotel Front Desk: Available 24/7 for assistance',
    'Tourist Information Center: Usually in city center'
  ];
}
