import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, Utensils } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center">
          <Utensils className="w-12 h-12 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="font-serif text-6xl font-bold text-primary">404</h1>
          <p className="text-xl text-muted-foreground">Page not found</p>
          <p className="text-muted-foreground/70 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Button asChild className="bg-gradient-primary hover:opacity-90">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Back to Menu
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
