import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Utensils, ChefHat, LayoutDashboard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const { itemCount, total } = useCart();
  const location = useLocation();
  const isCustomer = location.pathname === '/' || location.pathname === '/customer';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-gradient-primary rounded-lg group-hover:shadow-glow transition-shadow">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            OneBite
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isCustomer ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Menu
          </Link>
          <Link
            to="/kitchen"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              location.pathname === '/kitchen' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Kitchen
          </Link>
          <Link
            to="/manager"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              location.pathname.startsWith('/manager') ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Manager
          </Link>
        </nav>

        {isCustomer && (
          <Button
            onClick={onCartClick}
            variant="outline"
            className="relative group border-primary/30 hover:border-primary hover:bg-primary/5"
          >
            <ShoppingCart className="w-5 h-5 mr-2 text-primary" />
            <span className="font-medium">
              {itemCount > 0 ? `$${total.toFixed(2)}` : 'Cart'}
            </span>
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center animate-scale-in">
                {itemCount}
              </span>
            )}
          </Button>
        )}

        {!isCustomer && (
          <div className="md:hidden flex items-center gap-2">
            <Link
              to="/kitchen"
              className={`p-2 rounded-lg ${location.pathname === '/kitchen' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
            >
              <ChefHat className="w-5 h-5" />
            </Link>
            <Link
              to="/manager"
              className={`p-2 rounded-lg ${location.pathname.startsWith('/manager') ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
            >
              <LayoutDashboard className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
