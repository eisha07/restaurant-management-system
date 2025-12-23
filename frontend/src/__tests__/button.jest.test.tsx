import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Button } from '@/components/ui/button';

describe('Button Component (Jest)', () => {
  it('renders correctly with children', () => {
    render(
      <BrowserRouter>
        <Button>Click me</Button>
      </BrowserRouter>
    );
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
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
});
