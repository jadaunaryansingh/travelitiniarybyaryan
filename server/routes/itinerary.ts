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
    if (!city || budget <= 0 || days <= 0 || travelers <= 0) {
      return res.status(400).json({
        error: 'Invalid input parameters'
      });
    }

    // Create the prompt for Groq API
    const prompt = createItineraryPrompt({
      city,
      budget,
      days,
      travelers,
      interests,
      accommodation,
      transportation
    });

    // Call Groq API to generate real itinerary
    const apiResponse = await callGroqAPI(prompt);
    const structuredItinerary = parseItineraryResponse(apiResponse, {
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

Budget: $${budget} USD total for ${travelers} traveler${travelers > 1 ? 's' : ''}
Accommodation preference: ${accommodation}
Transportation preference: ${transportation}
Interests: ${interests.join(', ')}

Please provide a comprehensive itinerary that includes:

1. A brief summary of the trip
2. Daily breakdown for each of the ${days} days including:
   - 3-4 main activities per day
   - Meal suggestions (breakfast, lunch, dinner)
   - Accommodation details
   - Estimated daily cost
3. 5-7 practical travel tips
4. Emergency contact information for ${city}

Make sure the total cost fits within the $${budget} budget. Focus on authentic local experiences and practical information.

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

function createStructuredItinerary(apiResponse: string, request: ItineraryRequest): ItineraryResponse {
  const { city, budget, days, travelers, interests, accommodation, transportation } = request;
  
  return {
    city,
    summary: `A personalized ${days}-day journey through ${city} featuring ${interests.join(', ')} experiences. Your ${accommodation} accommodation and ${transportation} transportation preferences have been considered to create the perfect adventure within your $${budget} budget.`,
    totalBudget: budget,
    days: generateDefaultDays(days, city),
    tips: generateDefaultTips(city),
    emergencyContacts: generateDefaultContacts(city)
  };
}

async function generateMockItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
  const { city, budget, days, travelers, interests, accommodation, transportation } = request;
  
  // Convert USD budget to INR
  const budgetInINR = budget * 83; // Approximate USD to INR conversion
  
  // Calculate realistic daily budget based on user's actual budget
  const maxDailyBudget = Math.floor(budgetInINR / days);
  
  // Generate accommodation-specific daily costs that fit within budget
  const accommodationMultipliers = {
    budget: 0.6,     // 60% of daily budget
    hotel: 0.8,      // 80% of daily budget
    luxury: 1.2,     // 120% of daily budget (may exceed budget)
    apartment: 0.7,  // 70% of daily budget
    camping: 0.4     // 40% of daily budget
  };
  
  const multiplier = accommodationMultipliers[accommodation as keyof typeof accommodationMultipliers] || 0.8;
  const adjustedDailyCost = Math.min(maxDailyBudget * multiplier, maxDailyBudget);
  
  // Ensure total cost doesn't exceed budget
  const totalCost = adjustedDailyCost * days;
  const finalBudget = Math.min(budgetInINR, totalCost);
  
  return {
    city,
    summary: `Experience the magic of ${city} with this carefully crafted ${days}-day itinerary! Discover ${interests.join(', ')} while enjoying ${accommodation} accommodations and ${transportation} transportation. Your adventure is perfectly planned to fit within your ₹${budgetInINR.toLocaleString('en-IN')} budget.`,
    totalBudget: finalBudget,
    days: await generateEnhancedDays(days, city, interests, accommodation, adjustedDailyCost),
    tips: generateEnhancedTips(city, interests),
    emergencyContacts: generateEnhancedContacts(city)
  };
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
  const apiKey = 'AIzaSyB5Kt5DEwqzOX5d6fMMVN_tcAz5IYcp34c';
  
  try {
    // First, get the city coordinates
    const cityCoords = await getCityCoordinates(city, apiKey);
    if (!cityCoords) {
      return getDefaultAttractions(city);
    }

    // Get attractions, restaurants, and activities using Google Places API
    const [landmarks, restaurants, activities] = await Promise.all([
      getPlacesByType(city, cityCoords, 'tourist_attraction', apiKey),
      getPlacesByType(city, cityCoords, 'restaurant', apiKey),
      getPlacesByType(city, cityCoords, 'museum', apiKey)
    ]);
    
    // Also get some additional place types for more variety
    const [parks, shopping, cafes] = await Promise.all([
      getPlacesByType(city, cityCoords, 'park', apiKey),
      getPlacesByType(city, cityCoords, 'shopping_mall', apiKey),
      getPlacesByType(city, cityCoords, 'cafe', apiKey)
    ]);
    
    // Combine all activities
    const allActivities = [...activities, ...parks, ...shopping, ...cafes];

    return {
      landmarks: landmarks.slice(0, 8), // Top 8 attractions
      restaurants: restaurants.slice(0, 6), // Top 6 restaurants
      activities: allActivities.slice(0, 6) // Top 6 activities from all types
    };
  } catch (error) {
    console.error('Error fetching city attractions:', error);
    return getDefaultAttractions(city);
  }
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

async function getPlacesByType(city: string, coords: { lat: number; lng: number }, type: string, apiKey: string): Promise<any[]> {
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
      console.log(`No ${type} places found for ${city}`);
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
    // Use available restaurants with varied times
    const breakfastTime = day === 1 ? '7:30 AM' : day === 2 ? '8:30 AM' : '8:00 AM';
    dailyMeals.push(`${breakfastTime} - Breakfast at ${rotatedRestaurants[0].name} - ${rotatedRestaurants[0].address} (Rating: ${rotatedRestaurants[0].rating}/5)`);
    dailyMeals.push(`1:00 PM - Lunch at local restaurant in ${city}`);
    dailyMeals.push(`7:00 PM - Dinner at local restaurant in ${city}`);
  } else {
    // Fallback meals if no restaurants
    const breakfastTime = day === 1 ? '7:30 AM' : day === 2 ? '8:30 AM' : '8:00 AM';
    dailyMeals.push(`${breakfastTime} - Breakfast at local cafe in ${city}`);
    dailyMeals.push(`1:00 PM - Lunch at traditional restaurant in ${city}`);
    dailyMeals.push(`7:00 PM - Dinner at fine dining in ${city}`);
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
