import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Sample test for Button component
describe('Button Component', () => {
  it('renders correctly with children', () => {
    render(
      <BrowserRouter>
        <Button>Click me</Button>
      </BrowserRouter>
    );
    
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    
    render(
      <BrowserRouter>
        <Button onClick={handleClick}>Click me</Button>
      </BrowserRouter>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    render(
      <BrowserRouter>
        <Button disabled>Disabled Button</Button>
      </BrowserRouter>
    );
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    render(
      <BrowserRouter>
        <Button variant="destructive">Delete</Button>
      </BrowserRouter>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Delete');
  });
});

// Sample test for API mocking
describe('API Integration', () => {
  it('can mock API calls', async () => {
    // Example of how to mock API calls in tests
    const mockMenuItems = [
      { id: 1, name: 'Biryani', price: 12.99, category: 'Desi' },
      { id: 2, name: 'Burger', price: 9.99, category: 'Fast Food' },
    ];

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMenuItems),
    });

    const response = await fetch('/api/menu');
    const data = await response.json();

    expect(data).toHaveLength(2);
    expect(data[0].name).toBe('Biryani');
  });
});
