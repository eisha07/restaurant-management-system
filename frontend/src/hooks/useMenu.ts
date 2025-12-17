import { useState, useEffect } from 'react';
import { MenuItem } from '@/types';
import { menuApi } from '@/services/api';

interface UseMenuReturn {
  items: MenuItem[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch menu items from API
 */
export const useMenu = (): UseMenuReturn => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await menuApi.getAllItems();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch menu items'));
      console.error('Menu fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return { items, loading, error, refetch: fetchItems };
};

/**
 * Hook to fetch menu items by category
 */
export const useMenuByCategory = (category: string): UseMenuReturn => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await menuApi.getByCategory(category);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(`Failed to fetch ${category} items`));
      console.error('Category fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (category && category !== 'all') {
      fetchItems();
    }
  }, [category]);

  return { items, loading, error, refetch: fetchItems };
};

/**
 * Hook to search menu items
 */
export const useMenuSearch = (query: string): UseMenuReturn => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = async () => {
    if (!query.trim()) {
      setItems([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await menuApi.search(query);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300); // Debounce
    return () => clearTimeout(timer);
  }, [query]);

  return { items, loading, error, refetch: fetchItems };
};
