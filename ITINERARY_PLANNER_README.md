# 🗺️ AI-Powered Travel Itinerary Planner

A comprehensive travel planning application that uses the Perplexity AI API to generate personalized travel itineraries based on user preferences, budget, and travel style.

## ✨ Features

### 🎯 **Smart Itinerary Generation**
- **AI-Powered Planning**: Uses Perplexity AI to create intelligent, personalized travel plans
- **Budget Optimization**: Ensures all recommendations fit within your specified budget
- **Interest-Based**: Tailors activities to your specific travel interests
- **Multi-Day Support**: Plans from 1 to 30 days with detailed daily breakdowns

### 📝 **Comprehensive Input Options**
- **Destination**: Any city worldwide
- **Budget**: Total trip budget in USD
- **Duration**: Number of days (1-30)
- **Travelers**: Number of people (1-10)
- **Interests**: Culture, Food, Nature, Shopping, Adventure, Art, Nightlife, etc.
- **Accommodation**: Budget hostels to luxury hotels
- **Transportation**: Public transport, walking, biking, taxis, car rental

### 🎨 **Rich Output Format**
- **Trip Summary**: Overview of your adventure
- **Daily Breakdown**: Detailed activities, meals, and costs for each day
- **Travel Tips**: Practical advice for your destination
- **Emergency Contacts**: Important local contact information
- **Cost Estimates**: Daily and total budget breakdown

## 🚀 **Getting Started**

### 1. **Access the Planner**
- Navigate to `/itinerary` in your browser
- Or click "Create a New Trip" from the homepage

### 2. **Fill Out the Form**
- Enter your destination city
- Specify your total budget
- Choose number of days
- Select number of travelers
- Pick accommodation preferences
- Choose transportation options
- Select your travel interests

### 3. **Generate Your Itinerary**
- Click "Generate My Itinerary"
- Wait for AI processing (usually 10-30 seconds)
- Review your personalized travel plan

## 🛠️ **Technical Implementation**

### **Frontend Components**
- **ItineraryPlanner.tsx**: Main component with form and results display
- **React Hooks**: State management for form data and API responses
- **UI Components**: Built with shadcn/ui for consistent design
- **Responsive Design**: Works on desktop, tablet, and mobile

### **Backend API**
- **Express.js Server**: RESTful API endpoints
- **Perplexity AI Integration**: Uses `llama-3.1-sonar-small-128k-online` model
- **Input Validation**: Ensures all required fields are provided
- **Error Handling**: Graceful fallbacks and user-friendly error messages

### **API Endpoints**
```
POST /api/generate-itinerary
Body: {
  city: string,
  budget: number,
  days: number,
  travelers: number,
  interests: string[],
  accommodation: string,
  transportation: string
}
```

## 🔧 **Configuration**

### **Perplexity API Key**
The application uses a pre-configured Perplexity API key:
```
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
```

### **Environment Variables**
No additional environment variables are required for basic functionality.

## 📱 **User Experience**

### **Form Design**
- **Intuitive Layout**: Logical grouping of related fields
- **Visual Feedback**: Clear validation and loading states
- **Responsive Grid**: Adapts to different screen sizes
- **Interactive Elements**: Toggle buttons for interests, dropdowns for preferences

### **Results Display**
- **Card-Based Layout**: Clean, organized presentation
- **Color-Coded Sections**: Different colors for activities, meals, tips
- **Icon Integration**: Lucide React icons for visual appeal
- **Progressive Disclosure**: Information organized by importance

## 🎨 **Design System**

### **Color Palette**
- **Primary**: Blue gradients for main actions
- **Secondary**: Purple accents for highlights
- **Success**: Green for cost displays
- **Warning**: Yellow for tips
- **Neutral**: Gray scale for text and borders

### **Typography**
- **Headings**: Large, bold fonts for hierarchy
- **Body Text**: Readable sans-serif for content
- **Labels**: Clear, descriptive text for form fields
- **Responsive Sizing**: Scales appropriately across devices

## 🔒 **Security & Privacy**

### **Data Handling**
- **No Data Storage**: User inputs are not stored permanently
- **API Security**: Secure communication with Perplexity AI
- **Input Validation**: Prevents malicious input and ensures data integrity
- **CORS Configuration**: Proper cross-origin resource sharing setup

## 🚀 **Deployment**

### **Development**
```bash
npm run dev
```
- Starts development server on port 8080
- Hot reloading for frontend changes
- Integrated backend API

### **Production Build**
```bash
npm run build
npm start
```
- Optimized production build
- Served from Express.js backend

## 🔍 **Troubleshooting**

### **Common Issues**

1. **API Timeout**
   - Perplexity API may take 10-30 seconds to respond
   - Check network connectivity
   - Verify API key is valid

2. **Form Validation Errors**
   - Ensure all required fields are filled
   - Budget must be greater than 0
   - Days must be between 1-30

3. **Loading Issues**
   - Check if development server is running
   - Verify port 8080 is available
   - Check browser console for errors

### **Debug Mode**
- Open browser developer tools
- Check Network tab for API calls
- Review Console for error messages

## 🎯 **Future Enhancements**

### **Planned Features**
- **Save/Load Itineraries**: Persistent storage for user plans
- **Export Options**: PDF, Google Calendar integration
- **Real-time Updates**: Live pricing and availability
- **Social Sharing**: Share plans with friends and family
- **Multi-language Support**: Internationalization
- **Offline Mode**: Cached itineraries for offline access

### **API Improvements**
- **Rate Limiting**: Prevent API abuse
- **Caching**: Store common responses
- **Fallback Models**: Alternative AI providers
- **Webhook Support**: Real-time updates

## 📚 **API Documentation**

### **Perplexity AI Integration**
- **Model**: `llama-3.1-sonar-small-128k-online`
- **Max Tokens**: 4000
- **Temperature**: 0.7 (balanced creativity)
- **Top P**: 0.9 (focused responses)

### **Prompt Engineering**
The system uses carefully crafted prompts to ensure:
- **Structured Output**: Consistent JSON formatting
- **Budget Compliance**: All recommendations fit within budget
- **Local Authenticity**: Focus on genuine local experiences
- **Practical Information**: Useful tips and emergency contacts

## 🤝 **Contributing**

### **Development Setup**
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Make changes and test locally
5. Submit pull request with detailed description

### **Code Standards**
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Component Structure**: Functional components with hooks

## 📄 **License**

This project is part of the Fusion Starter template and follows the same licensing terms.

---

**Happy Travel Planning! ✈️🌍**
