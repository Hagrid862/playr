import { customRender } from '@repo/testing/web';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestOverlay } from './GuestOverlay';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

vi.mock('@phosphor-icons/react', () => ({
  PlayCircleIcon: () => <div data-testid="play-circle-icon" />,
}));

describe('GuestOverlay', () => {
  it('renders the branding and main text', () => {
    customRender(<GuestOverlay />);
    
    expect(screen.getByText('Playr')).toBeInTheDocument();
    expect(screen.getByText('Your music, your way')).toBeInTheDocument();
    expect(screen.getByText(/Stream your favorite songs/)).toBeInTheDocument();
  });

  it('renders login and register links', () => {
    customRender(<GuestOverlay />);
    
    const getStartedLink = screen.getByRole('link', { name: /get started/i });
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    
    expect(getStartedLink).toHaveAttribute('href', '/auth/register');
    expect(signInLink).toHaveAttribute('href', '/auth/login');
  });

  it('renders the logo icon', () => {
    customRender(<GuestOverlay />);
    expect(screen.getByTestId('play-circle-icon')).toBeInTheDocument();
  });
});
