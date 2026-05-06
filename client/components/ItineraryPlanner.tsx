import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MapPin, Calendar, DollarSign, Users, Plane, Hotel, Utensils, Camera, Bus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export function ItineraryPlanner() {
  const [formData, setFormData] = useState<ItineraryRequest>({
    city: '',
    budget: 0,
    days: 1,
    travelers: 1,
    interests: [],
    accommodation: 'hotel',
    transportation: 'public'
  });

  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const interestOptions = [
    'Culture & History', 'Food & Dining', 'Nature & Outdoors', 
    'Shopping', 'Adventure Sports', 'Art & Museums', 'Nightlife',
    'Relaxation', 'Photography', 'Local Experiences'
  ];

  const accommodationOptions = [
    { value: 'budget', label: 'Budget Hostels' },
    { value: 'hotel', label: 'Mid-range Hotels' },
    { value: 'luxury', label: 'Luxury Hotels' },
    { value: 'apartment', label: 'Vacation Rentals' },
    { value: 'camping', label: 'Camping' }
  ];

  const transportationOptions = [
    { value: 'public', label: 'Public Transport' },
    { value: 'walking', label: 'Walking' },
    { value: 'bike', label: 'Bicycle' },
    { value: 'taxi', label: 'Taxis' },
    { value: 'rental', label: 'Car Rental' }
  ];

  const handleInputChange = (field: keyof ItineraryRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const generateItinerary = async () => {
    if (!formData.city || formData.budget <= 0 || formData.days <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use production API endpoint when deployed, fallback to localhost for development
      const apiUrl = window.location.hostname === 'localhost' 
        ? '/api/generate-itinerary'
        : '/.netlify/functions/generate-itinerary';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate itinerary');
      }

      const data = await response.json();
      setItinerary(data);
      
      toast({
        title: "Success!",
        description: `Your ${formData.days}-day itinerary for ${formData.city} is ready!`,
      });
    } catch (error) {
      console.error('Error generating itinerary:', error);
      toast({
        title: "Error",
        description: "Failed to generate itinerary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            AI-Powered Travel Itinerary Planner
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get personalized travel plans tailored to your budget, interests, and travel style
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Plan Your Trip
              </CardTitle>
              <CardDescription>
                Fill in the details below to get your personalized itinerary
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* City Input */}
              <div className="space-y-2">
                <Label htmlFor="city">Destination City *</Label>
                <Input
                  id="city"
                  placeholder="e.g., Paris, Tokyo, New York"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Budget and Duration */}
              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-2">
                   <Label htmlFor="budget">Total Budget (INR) *</Label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 font-bold">₹</span>
                     <Input
                       id="budget"
                       type="number"
                       placeholder="50000"
                       value={formData.budget || ''}
                       onChange={(e) => handleInputChange('budget', parseInt(e.target.value) || 0)}
                       className="pl-10"
                     />
                   </div>
                   <p className="text-xs text-gray-500">Enter your budget directly in Indian Rupees (₹)</p>
                 </div>
                <div className="space-y-2">
                  <Label htmlFor="days">Number of Days *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="days"
                      type="number"
                      min="1"
                      max="30"
                      placeholder="7"
                      value={formData.days || ''}
                      onChange={(e) => handleInputChange('days', parseInt(e.target.value) || 1)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Travelers and Accommodation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="travelers">Number of Travelers</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="travelers"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="2"
                      value={formData.travelers || ''}
                      onChange={(e) => handleInputChange('travelers', parseInt(e.target.value) || 1)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accommodation Type</Label>
                  <Select value={formData.accommodation} onValueChange={(value) => handleInputChange('accommodation', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accommodationOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Transportation */}
              <div className="space-y-2">
                <Label>Preferred Transportation</Label>
                <Select value={formData.transportation} onValueChange={(value) => handleInputChange('transportation', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transportationOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interests */}
              <div className="space-y-3">
                <Label>Travel Interests (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {interestOptions.map(interest => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleInterestToggle(interest)}
                      className={`p-2 text-sm rounded-lg border transition-colors ${
                        formData.interests.includes(interest)
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateItinerary}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Itinerary...
                  </>
                ) : (
                  <>
                    <Plane className="w-4 h-4 mr-2" />
                    Generate My Itinerary
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results Display */}
          <div className="space-y-6">
            {itinerary ? (
              <>
                {/* Summary Card */}
                <Card>
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                    <CardTitle className="text-2xl text-center">
                      {itinerary.city} Adventure
                    </CardTitle>
                    <CardDescription className="text-center">
                      {formData.days} days • ₹{itinerary.totalBudget.toLocaleString('en-IN')} budget • {formData.travelers} traveler{formData.travelers > 1 ? 's' : ''}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-gray-700 leading-relaxed">{itinerary.summary}</p>
                  </CardContent>
                </Card>

                {/* Daily Itinerary */}
                <div className="space-y-4">
                  {itinerary.days.map((day) => (
                    <Card key={day.day}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          Day {day.day}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-green-600" />
                            Daily Schedule
                          </h4>
                          <ul className="space-y-2">
                            {day.activities.map((activity, index) => (
                              <li key={index} className="text-sm text-gray-700 flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                                <div className="flex-1">
                                  <span className="font-medium text-blue-600">{activity}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <Utensils className="w-4 h-4 text-orange-600" />
                            Dining Schedule
                          </h4>
                          <ul className="space-y-2">
                            {day.meals.map((meal, index) => (
                              <li key={index} className="text-sm text-gray-700 flex items-start gap-3 p-2 bg-orange-50 rounded-lg">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                                <div className="flex-1">
                                  <span className="font-medium text-orange-700">{meal}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Hotel className="w-4 h-4 text-purple-600" />
                            {day.accommodation}
                          </div>
                          <div className="text-sm font-semibold text-green-600">
                            ₹{day.estimatedCost.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Tips and Emergency Contacts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Travel Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {itinerary.tips.map((tip, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Emergency Contacts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {itinerary.emergencyContacts.map((contact, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            {contact}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Plane className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">Your itinerary will appear here</p>
                  <p className="text-sm">Fill out the form and click generate to get started</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
