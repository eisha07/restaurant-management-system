import { useState, useMemo } from 'react';
import { MenuItem, Category } from '@/types';
import { MenuCard } from './MenuCard';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MenuBrowserProps {
  items: MenuItem[];
  categories: Category[];
}

type SortOption = 'default' | 'price-low' | 'price-high' | 'rating' | 'time';

export function MenuBrowser({ items, categories }: MenuBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const filteredItems = useMemo(() => {
    let filtered = items;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered = [...filtered].sort((a, b) => b.rating - a.rating);
        break;
      case 'time':
        filtered = [...filtered].sort((a, b) => a.preparationTime - b.preparationTime);
        break;
    }

    return filtered;
  }, [items, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Search and Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-card border-border/50 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(v: SortOption) => setSortBy(v)}>
            <SelectTrigger className="w-[160px] h-12 bg-card border-border/50">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="time">Quickest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          key="all"
          onClick={() => setSelectedCategory('all')}
          className={`category-pill whitespace-nowrap flex items-center gap-2 ${
            selectedCategory === 'all' ? 'active' : ''
          }`}
        >
          All
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`category-pill whitespace-nowrap flex items-center gap-2 ${
              selectedCategory === category.id ? 'active' : ''
            }`}
          >
            <span>{category.icon}</span>
            <span>{category.name}</span>
            <span className="text-xs opacity-70">({category.itemCount})</span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <div className="text-muted-foreground text-sm">
        Showing {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
        {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
      </div>

      {/* Menu Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
          {filteredItems.map(item => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-lg">No items found</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            Try adjusting your search or filter
          </p>
        </div>
      )}
    </div>
  );
}
