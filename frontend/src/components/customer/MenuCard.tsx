import { MenuItem } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Plus, Flame } from 'lucide-react';
import { toast } from 'sonner';

interface MenuCardProps {
  item: MenuItem;
}

const spicyLevelMap = {
  none: { label: '', color: '' },
  mild: { label: 'Mild', color: 'bg-yellow-100 text-yellow-800' },
  medium: { label: 'Medium', color: 'bg-orange-100 text-orange-800' },
  hot: { label: 'Hot', color: 'bg-red-100 text-red-800' },
  very_hot: { label: 'Very Hot', color: 'bg-red-200 text-red-900' },
};

export function MenuCard({ item }: MenuCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = () => {
    addItem({ ...item, quantity: 1 });
    toast.success(`${item.name} added to cart!`, {
      duration: 2000,
      position: 'bottom-right',
    });
  };

  const spicy = item.spicyLevel ? spicyLevelMap[item.spicyLevel] : null;

  return (
    <div className="group relative bg-card rounded-xl overflow-hidden shadow-soft hover-lift border border-border/50">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-muted">
        <img
          src={item.image || 'https://via.placeholder.com/400x300/E0E0E0/666666?text=' + item.name.replace(/\s+/g, '+')}
          alt={item.name}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'https://via.placeholder.com/400x300/E0E0E0/666666?text=' + item.name.replace(/\s+/g, '+');
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {item.tags.map(tag => (
              <Badge 
                key={tag} 
                className="bg-primary text-primary-foreground text-xs px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Availability */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-white font-semibold text-lg">Currently Unavailable</span>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute bottom-3 right-3">
          <span className="bg-white/95 backdrop-blur-sm text-foreground font-bold px-3 py-1.5 rounded-full text-lg shadow-md">
            ${item.price.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-serif font-semibold text-lg text-foreground leading-tight">
            {item.name}
          </h3>
          <div className="flex items-center gap-1 text-warning shrink-0">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">{item.rating}</span>
          </div>
        </div>

        <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
          {item.description}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{item.preparationTime} min</span>
          </div>
          {spicy && spicy.label && (
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${spicy.color}`}>
              <Flame className="w-3 h-3" />
              <span>{spicy.label}</span>
            </div>
          )}
        </div>

        {/* Add to cart button */}
        <Button
          onClick={handleAddToCart}
          disabled={!item.available}
          className="w-full bg-gradient-primary hover:opacity-90 text-primary-foreground font-medium transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
