import { MapPin } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-background/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-orange rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <span className="text-xl md:text-2xl font-bold text-foreground">Wanderlust</span>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center space-x-6 xl:space-x-8">
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm xl:text-base">
            Features
          </a>
          <a href="#reviews" className="text-muted-foreground hover:text-foreground transition-colors text-sm xl:text-base">
            Reviews
          </a>
          <a href="#community" className="text-muted-foreground hover:text-foreground transition-colors text-sm xl:text-base">
            Community
          </a>
          <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm xl:text-base">
            Pricing
          </a>
        </nav>

        {/* Test Passed Badge */}
        <div className="hidden xl:flex items-center">
          <div className="bg-wanderlust-green text-black px-3 xl:px-4 py-2 rounded-lg font-medium text-xs xl:text-sm flex items-center space-x-2">
            <span className="text-green-700">✓</span>
            <span>Popular Trip Packs test passed!</span>
          </div>
        </div>

        {/* Mobile menu button */}
        <button className="lg:hidden p-2 text-muted-foreground hover:text-foreground">
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
