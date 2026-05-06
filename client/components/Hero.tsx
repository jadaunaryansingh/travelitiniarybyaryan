import { Search, Smartphone } from 'lucide-react';

export function Hero() {
  return (
    <main className="min-h-screen bg-background bg-hero-pattern relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full border border-muted-foreground/20"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 rounded-full border border-muted-foreground/10"></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full border border-muted-foreground/15"></div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
          {/* Top Search Bar */}
          <div className="relative max-w-sm md:max-w-md mx-auto">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <span className="text-lg md:text-xl">✈️</span>
            </div>
            <input
              type="text"
              placeholder="Discover the world..."
              className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 text-sm md:text-base bg-card/50 backdrop-blur-sm border border-border rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Main Heading */}
          <div className="space-y-2 md:space-y-4">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight">
              <span className="text-foreground">Explore </span>
              <span className="bg-gradient-india bg-clip-text text-transparent">India Like</span>
              <br />
              <span className="bg-gradient-orange bg-clip-text text-transparent">Never Before</span>
            </h1>
          </div>

          {/* Description */}
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl md:max-w-2xl mx-auto leading-relaxed px-4">
            From the majestic Himalayas to tropical beaches, from ancient temples to modern cities. Discover India's hidden gems with AI-powered personalized itineraries.
          </p>

          {/* Search Bar */}
          <div className="relative max-w-sm md:max-w-lg mx-auto">
            <div className="absolute inset-y-0 left-3 md:left-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Where do you want to go?"
              className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 text-sm md:text-base bg-card/50 backdrop-blur-sm border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-6 md:pt-8 px-4">
            <a href="/itinerary" className="group bg-gradient-button hover:opacity-90 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold transition-all duration-300 flex items-center space-x-2 w-full sm:w-auto sm:min-w-[200px] justify-center shadow-lg hover:shadow-xl text-sm md:text-base">
              <Smartphone className="w-4 h-4 md:w-5 md:h-5" />
              <span>Create a New Trip</span>
            </a>

            <button className="border-2 border-border hover:bg-card/30 text-foreground px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold transition-all duration-300 w-full sm:w-auto sm:min-w-[200px] backdrop-blur-sm text-sm md:text-base">
              View Packages
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
