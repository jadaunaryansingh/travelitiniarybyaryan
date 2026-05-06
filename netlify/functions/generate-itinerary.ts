import type { Handler } from '@netlify/functions';

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

export const handler: Handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Handle POST request
  if (event.httpMethod === 'POST') {
    try {
      const body: ItineraryRequest = JSON.parse(event.body || '{}');
      
      // Validate input
      if (!body.city || body.budget <= 0 || body.days <= 0 || body.travelers <= 0) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Invalid input parameters'
          }),
        };
      }

      // Generate itinerary using Groq API
      const prompt = createItineraryPrompt(body);
      const apiResponse = await callGroqAPI(prompt);
      const itinerary = parseItineraryResponse(apiResponse, body);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(itinerary),
      };
    } catch (error) {
      console.error('Error in Netlify function:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Internal server error' }),
      };
    }
  }

  // Method not allowed
  return {
    statusCode: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};

function createItineraryPrompt(request: ItineraryRequest): string {
  const { city, budget, days, travelers, interests, accommodation, transportation } = request;
  
  return `Create a detailed ${days}-day travel itinerary for ${city} with the following requirements:

Budget: ₹${budget} INR total for ${travelers} traveler${travelers > 1 ? 's' : ''}
Accommodation preference: ${accommodation}
Transportation preference: ${transportation}
Interests: ${interests.join(', ')}

Please provide a comprehensive itinerary that includes:

1. A brief summary of the trip
2. Daily breakdown for each of the ${days} days including:
   - 3-4 main activities per day
   - Meal suggestions (breakfast, lunch, dinner)
   - Accommodation details
   - Estimated daily cost in INR
3. 5-7 practical travel tips specific to ${city}
4. Emergency contact information for ${city}

Make sure the total cost fits within the ₹${budget} budget. Focus on authentic local experiences and practical information.

IMPORTANT: Respond ONLY with a valid JSON object in this exact format:
{
  "city": "${city}",
  "summary": "brief summary here",
  "totalBudget": ${budget},
  "days": [
    {
      "day": 1,
      "activities": ["activity 1", "activity 2", "activity 3"],
      "meals": ["breakfast suggestion", "lunch suggestion", "dinner suggestion"],
      "accommodation": "accommodation details",
      "estimatedCost": 100
    }
  ],
  "tips": ["tip 1", "tip 2", "tip 3"],
  "emergencyContacts": ["contact 1", "contact 2"]
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

function parseItineraryResponse(apiResponse: string, request: ItineraryRequest): ItineraryResponse {
  try {
    console.log('Raw API response:', apiResponse.substring(0, 200) + '...');
    
    // Try to extract JSON from the response - look for JSON blocks
    const jsonMatch = apiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonString = jsonMatch[0];
      console.log('Extracted JSON:', jsonString.substring(0, 200) + '...');
      const parsed = JSON.parse(jsonString);
      return structureItinerary(parsed, request);
    }
    
    // If no JSON found, try to parse the entire response as JSON
    try {
      const parsed = JSON.parse(apiResponse);
      return structureItinerary(parsed, request);
    } catch (jsonError) {
      console.log('Direct JSON parse failed, trying to create structured response from text');
    }
    
    // If no JSON found, create a structured response from text
    return createStructuredItinerary(apiResponse, request);
  } catch (error) {
    console.error('Failed to parse API response:', error);
    // Fallback to creating a structured response
    return createStructuredItinerary(apiResponse, request);
  }
}

function structureItinerary(parsed: any, request: ItineraryRequest): ItineraryResponse {
  const { city, budget, days } = request;
  
  return {
    city: parsed.city || city,
    summary: parsed.summary || `A ${days}-day adventure in ${city} tailored to your interests and budget.`,
    totalBudget: parsed.totalBudget || budget,
    days: parsed.days || generateDefaultDays(days, city),
    tips: parsed.tips || generateDefaultTips(city),
    emergencyContacts: parsed.emergencyContacts || generateDefaultContacts(city)
  };
}

function createStructuredItinerary(apiResponse: string, request: ItineraryRequest): ItineraryResponse {
  const { city, budget, days, interests, accommodation, transportation } = request;
  
  return {
    city,
    summary: `A personalized ${days}-day journey through ${city} featuring ${interests.join(', ')} experiences. Your ${accommodation} accommodation and ${transportation} transportation preferences have been considered to create the perfect adventure within your ₹${budget} budget.`,
    totalBudget: budget,
    days: generateDefaultDays(days, city),
    tips: generateDefaultTips(city),
    emergencyContacts: generateDefaultContacts(city)
  };
}

function generateDefaultDays(days: number, city: string): ItineraryDay[] {
  return Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    activities: [`Explore ${city}`, `Visit local attractions`, `Experience local culture`],
    meals: ['Breakfast at hotel', 'Lunch at local restaurant', 'Dinner at local restaurant'],
    accommodation: `Accommodation in ${city}`,
    estimatedCost: 0
  }));
}

function generateDefaultTips(city: string): string[] {
  return [
    `Best time to visit ${city}: October to March`,
    'Always carry cash for local vendors',
    'Use local transportation for authentic experience',
    'Try local street food at busy areas',
    'Respect local customs and culture'
  ];
}

function generateDefaultContacts(city: string): string[] {
  return [
    'Police: 100',
    'Emergency Medical: 102',
    'Tourist Police: Contact your hotel front desk',
    `Local Hospital: Contact hotel for nearest facility`,
    `Embassy Contact: Contact your embassy from any phone`
  ];
}

async function generateMockItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
  const { city, budget, days, travelers, interests, accommodation, transportation } = request;
  
  // Budget is already in INR - no conversion needed
  const budgetInINR = budget;
  
  // Calculate realistic daily budget based on user's actual budget
  const maxDailyBudget = Math.floor(budgetInINR / days);
  
  // Generate accommodation-specific daily costs that fit within budget
  const accommodationMultipliers = {
    budget: 0.3,     // 30% of daily budget (very budget-friendly)
    hotel: 0.4,      // 40% of daily budget (moderate)
    luxury: 0.5,     // 50% of daily budget (luxury but controlled)
    apartment: 0.35, // 35% of daily budget
    camping: 0.2     // 20% of daily budget (very cheap)
  };
  
  const multiplier = accommodationMultipliers[accommodation as keyof typeof accommodationMultipliers] || 0.4;
  const adjustedDailyCost = Math.min(maxDailyBudget * multiplier, maxDailyBudget);
  
  // Ensure total cost doesn't exceed budget - be very strict
  const totalCost = adjustedDailyCost * days;
  
  // Final safety check - ensure we never exceed user's budget
  const safetyBudget = Math.min(totalCost, budgetInINR);
  
  return {
    city,
    summary: `Experience the magic of ${city} with this carefully crafted ${days}-day itinerary! Discover ${interests.join(', ')} while enjoying ${accommodation} accommodations and ${transportation} transportation. Your adventure is perfectly planned to fit within your ₹${budgetInINR.toLocaleString('en-IN')} budget.`,
    totalBudget: safetyBudget,
    days: await generateEnhancedDays(days, city, interests, accommodation, adjustedDailyCost),
    tips: generateEnhancedTips(city, interests),
    emergencyContacts: generateEnhancedContacts(city)
  };
}

async function generateEnhancedDays(days: number, city: string, interests: string[], accommodation: string, dailyCost: number): Promise<ItineraryDay[]> {
  const daysArray = [];
  
  for (let i = 0; i < days; i++) {
    const dayNumber = i + 1;
    const selectedInterests = interests.length > 0 ? interests : ['Local Experiences'];
    
    // Generate specific daily schedule with times and locations - make each day unique
    const daySchedule = await generateDailySchedule(dayNumber, city, selectedInterests, accommodation, days);
    
    // Vary accommodation description by day
    let accommodationDesc = `${accommodation.charAt(0).toUpperCase() + accommodation.slice(1)} accommodation in ${city}`;
    if (dayNumber === 1) accommodationDesc = `Check-in at your ${accommodation} in ${city}`;
    else if (dayNumber === days) accommodationDesc = `Final night at your ${accommodation} in ${city}`;
    else accommodationDesc = `Continue your stay at ${accommodation} in ${city}`;
    
    // Calculate daily cost with very minimal variation to stay within budget
    const costVariation = 0.98 + (Math.random() * 0.04); // 98% to 102% of daily cost
    const finalDailyCost = Math.round(dailyCost * costVariation);
    
    daysArray.push({
      day: dayNumber,
      activities: daySchedule.activities,
      meals: daySchedule.meals,
      accommodation: accommodationDesc,
      estimatedCost: finalDailyCost
    });
  }
  
  return daysArray;
}

async function generateDailySchedule(day: number, city: string, interests: string[], accommodation: string, totalDays: number): Promise<any> {
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
    }
  };
  
  // Use day-specific pattern or default pattern
  const timeSlots = dayPatterns[day as keyof typeof dayPatterns]?.slots || dayPatterns[1].slots;
  
  try {
    // Get real places from Google Places API with timeout
    const places = await getCitySpecificPlaces(city, interests);
    
    // Calculate starting index for this day to get different places
    const attractionsPerDay = 4;
    const startIndex = (day - 1) * attractionsPerDay;
    
    // Assign different real places to time slots for each day
    timeSlots.forEach((slot, index) => {
      const placeIndex = startIndex + index;
      if (placeIndex < places.attractions.length) {
        const place = places.attractions[placeIndex];
        const duration = Math.random() > 0.5 ? '2 hours' : '1.5 hours';
        dailyActivities.push(`${slot.start} - ${place.name} (${duration}) - ${place.location}`);
      } else {
        // Fallback: use a place from the beginning of the list if we run out
        const fallbackIndex = index % places.attractions.length;
        if (places.attractions[fallbackIndex]) {
          const place = places.attractions[fallbackIndex];
          const duration = Math.random() > 0.5 ? '2 hours' : '1.5 hours';
          dailyActivities.push(`${slot.start} - ${place.name} (${duration}) - ${place.location}`);
        }
      }
    });
    
    // Add day-specific themed activities with different places
    const extraPlaceIndex = startIndex + 4;
    if (extraPlaceIndex < places.attractions.length) {
      const extraPlace = places.attractions[extraPlaceIndex];
      if (day === 1) {
        dailyActivities.push(`11:00 AM - ${extraPlace.name} (1 hour) - ${extraPlace.location}`);
      } else if (day === 2) {
        dailyActivities.push(`2:30 PM - ${extraPlace.name} (1.5 hours) - ${extraPlace.location}`);
      } else if (day === 3) {
        dailyActivities.push(`4:00 PM - ${extraPlace.name} (2 hours) - ${extraPlace.location}`);
      }
    } else {
      // Fallback: use a different place from the available list
      const fallbackExtraIndex = (day * 2) % places.attractions.length;
      if (places.attractions[fallbackExtraIndex]) {
        const extraPlace = places.attractions[fallbackExtraIndex];
        if (day === 1) {
          dailyActivities.push(`11:00 AM - ${extraPlace.name} (1 hour) - ${extraPlace.location}`);
        } else if (day === 2) {
          dailyActivities.push(`2:30 PM - ${extraPlace.name} (1.5 hours) - ${extraPlace.location}`);
        } else if (day === 3) {
          dailyActivities.push(`4:00 PM - ${extraPlace.name} (2 hours) - ${extraPlace.location}`);
        }
      }
    }
    
    // Add meals with different restaurants for each day
    const breakfastTime = day === 1 ? '7:30 AM' : day === 2 ? '8:30 AM' : '8:00 AM';
    const lunchTime = day === 1 ? '12:30 PM' : day === 2 ? '1:30 PM' : '1:00 PM';
    const dinnerTime = day === 1 ? '7:30 PM' : day === 2 ? '8:00 PM' : '7:00 PM';
    
    // Use different restaurants for each day
    const restaurantIndex = (day - 1) % Math.min(places.restaurants.length, 3);
    if (places.restaurants[restaurantIndex]) {
      dailyMeals.push(`${breakfastTime} - Breakfast at ${places.restaurants[restaurantIndex].name} - ${places.restaurants[restaurantIndex].location} (Rating: ${places.restaurants[restaurantIndex].rating}/5)`);
    }
    
    const lunchRestaurantIndex = (day + 1) % Math.min(places.restaurants.length, 3);
    if (places.restaurants[lunchRestaurantIndex]) {
      dailyMeals.push(`${lunchTime} - Lunch at ${places.restaurants[lunchRestaurantIndex].name} - ${places.restaurants[lunchRestaurantIndex].location} (Rating: ${places.restaurants[lunchRestaurantIndex].rating}/5)`);
    }
    
    const dinnerRestaurantIndex = (day + 2) % Math.min(places.restaurants.length, 3);
    if (places.restaurants[dinnerRestaurantIndex]) {
      dailyMeals.push(`${dinnerTime} - Dinner at ${places.restaurants[dinnerRestaurantIndex].name} - ${places.restaurants[dinnerRestaurantIndex].location} (Rating: ${places.restaurants[dinnerRestaurantIndex].rating}/5)`);
    }
    
  } catch (error) {
    console.error('Error fetching places:', error);
    // Fallback to enhanced generic names if API fails
    const enhancedLandmarks = getEnhancedLandmarks(city, day, totalDays);
    const enhancedRestaurants = getEnhancedRestaurants(city, day);
    
    // Assign enhanced landmarks to time slots
    timeSlots.forEach((slot, index) => {
      if (index < 4 && enhancedLandmarks[index]) {
        const landmark = enhancedLandmarks[index];
        const duration = Math.random() > 0.5 ? '2 hours' : '1.5 hours';
        dailyActivities.push(`${slot.start} - ${landmark.name} (${duration}) - ${landmark.location}`);
      }
    });
    
    // Add day-specific themed activities
    if (day === 1 && enhancedLandmarks[4]) {
      dailyActivities.push(`11:00 AM - ${enhancedLandmarks[4].name} (1 hour) - ${enhancedLandmarks[4].location}`);
    } else if (day === 2 && enhancedLandmarks[5]) {
      dailyActivities.push(`2:30 PM - ${enhancedLandmarks[5].name} (1.5 hours) - ${enhancedLandmarks[5].location}`);
    } else if (day === 3 && enhancedLandmarks[6]) {
      dailyActivities.push(`4:00 PM - ${enhancedLandmarks[6].name} (2 hours) - ${enhancedLandmarks[6].location}`);
    }
    
    // Add meals with enhanced restaurant names
    const breakfastTime = day === 1 ? '7:30 AM' : day === 2 ? '8:30 AM' : '8:00 AM';
    const lunchTime = day === 1 ? '12:30 PM' : day === 2 ? '1:30 PM' : '1:00 PM';
    const dinnerTime = day === 1 ? '7:30 PM' : day === 2 ? '8:00 PM' : '7:00 PM';
    
    if (enhancedRestaurants.breakfast) {
      dailyMeals.push(`${breakfastTime} - Breakfast at ${enhancedRestaurants.breakfast.name} - ${enhancedRestaurants.breakfast.location} (Rating: ${enhancedRestaurants.breakfast.rating}/5)`);
    }
    if (enhancedRestaurants.lunch) {
      dailyMeals.push(`${lunchTime} - Lunch at ${enhancedRestaurants.lunch.name} - ${enhancedRestaurants.lunch.location} (Rating: ${enhancedRestaurants.lunch.rating}/5)`);
    }
    if (enhancedRestaurants.dinner) {
      dailyMeals.push(`${dinnerTime} - Dinner at ${enhancedRestaurants.dinner.name} - ${enhancedRestaurants.dinner.location} (Rating: ${enhancedRestaurants.dinner.rating}/5)`);
    }
  }
  
  return {
    activities: dailyActivities.slice(0, 4),
    meals: dailyMeals
  };
}

// Enhanced generic landmarks that sound more realistic
function getEnhancedLandmarks(city: string, day: number, totalDays: number): any[] {
  const cityLower = city.toLowerCase();
  
  // City-specific landmarks based on common patterns
  let landmarks = [];
  
  if (cityLower.includes('agra') || cityLower.includes('delhi') || cityLower.includes('mumbai')) {
    // Indian cities
    landmarks = [
      { name: `${city} Fort`, location: 'Historic District' },
      { name: `${city} Palace`, location: 'Royal Quarter' },
      { name: `${city} Market`, location: 'Commercial Area' },
      { name: `${city} Temple`, location: 'Religious Quarter' },
      { name: `${city} Garden`, location: 'Green Zone' },
      { name: `${city} Museum`, location: 'Cultural District' },
      { name: `${city} Square`, location: 'City Center' }
    ];
  } else if (cityLower.includes('paris') || cityLower.includes('london') || cityLower.includes('rome')) {
    // European cities
    landmarks = [
      { name: `${city} Cathedral`, location: 'Historic Center' },
      { name: `${city} Palace`, location: 'Royal District' },
      { name: `${city} Museum`, location: 'Cultural Quarter' },
      { name: `${city} Park`, location: 'Green Zone' },
      { name: `${city} Square`, location: 'City Center' },
      { name: `${city} Bridge`, location: 'Riverside' },
      { name: `${city} Tower`, location: 'Landmark District' }
    ];
  } else {
    // Generic cities
    landmarks = [
      { name: `${city} City Center`, location: 'Downtown' },
      { name: `${city} Main Square`, location: 'Central Plaza' },
      { name: `${city} Local Market`, location: 'Market District' },
      { name: `${city} Historical District`, location: 'Old Town' },
      { name: `${city} Cultural Quarter`, location: 'Arts District' },
      { name: `${city} Park`, location: 'Green Zone' },
      { name: `${city} Museum`, location: 'Cultural Center' }
    ];
  }
  
  // Rotate landmarks based on day to create variety
  const startIndex = (day - 1) * 2;
  return [...landmarks.slice(startIndex), ...landmarks.slice(0, startIndex)];
}

// Enhanced generic restaurants that sound more realistic
function getEnhancedRestaurants(city: string, day: number): any {
  const cityLower = city.toLowerCase();
  
  let restaurants = {
    breakfast: { name: `${city} Morning Cafe`, location: 'City Center', rating: 4.2 },
    lunch: { name: `${city} Traditional Bistro`, location: 'Market District', rating: 4.4 },
    dinner: { name: `${city} Fine Dining`, location: 'Cultural Quarter', rating: 4.6 }
  };
  
  // City-specific restaurant names
  if (cityLower.includes('agra') || cityLower.includes('delhi')) {
    restaurants = {
      breakfast: { name: `${city} Mughal Cafe`, location: 'Historic District', rating: 4.3 },
      lunch: { name: `${city} Spice Garden`, location: 'Market Area', rating: 4.5 },
      dinner: { name: `${city} Royal Palace Restaurant`, location: 'Luxury Zone', rating: 4.7 }
    };
  } else if (cityLower.includes('paris')) {
    restaurants = {
      breakfast: { name: `${city} French Patisserie`, location: 'Champs-Élysées', rating: 4.4 },
      lunch: { name: `${city} Bistro Parisien`, location: 'Latin Quarter', rating: 4.6 },
      dinner: { name: `${city} Le Grand Restaurant`, location: 'Eiffel Tower Area', rating: 4.8 }
    };
  }
  
  return restaurants;
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

// Google Places API functions - Optimized for Netlify functions with timeout
async function getCitySpecificPlaces(city: string, interests: string[]): Promise<any> {
  try {
    // Get city coordinates first with timeout
    const coordinates = await withTimeout(getCityCoordinates(city), 3000); // 3 second timeout
    if (!coordinates) {
      throw new Error('Could not get city coordinates');
    }

    // Make all API calls in parallel with timeout
    const [attractions, restaurants] = await withTimeout(
      Promise.all([
        getPlacesByType(coordinates, 'tourist_attraction', 12), // Increased from 6 to 12
        getPlacesByType(coordinates, 'restaurant', 6) // Increased from 4 to 6
      ]),
      6000 // 6 second timeout for places
    );

    // Combine and filter attractions
    const allAttractions = attractions
      .filter(place => place.rating >= 3.5)
      .slice(0, 12); // Increased from 6 to 12

    // Filter restaurants
    const filteredRestaurants = restaurants
      .filter(place => place.rating >= 3.5)
      .slice(0, 6); // Increased from 4 to 6

    return {
      attractions: allAttractions,
      restaurants: filteredRestaurants
    };
  } catch (error) {
    console.error('Error in getCitySpecificPlaces:', error);
    throw error;
  }
}

// Timeout wrapper function
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('API timeout')), timeoutMs)
    )
  ]);
}

async function getCityCoordinates(city: string): Promise<{lat: number, lng: number} | null> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY environment variable is not set');
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${GOOGLE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Error getting coordinates:', error);
    return null;
  }
}

async function getPlacesByType(coordinates: {lat: number, lng: number}, type: string, maxResults: number = 8): Promise<any[]> {
  const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
  if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY environment variable is not set');
  const radius = 5000; // 5km radius
  
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.lat},${coordinates.lng}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results) {
      return data.results
        .filter(place => place.rating >= 3.5)
        .slice(0, maxResults)
        .map(place => ({
          name: place.name,
          location: place.vicinity || 'City Center',
          rating: place.rating || 4.0,
          type: type
        }));
    }
    return [];
  } catch (error) {
    console.error(`Error getting ${type} places:`, error);
    return [];
  }
}
