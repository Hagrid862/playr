import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayrLogo } from './PlayrLogo';

describe('PlayrLogo', () => {
  it('should render the logo text', () => {
    render(<PlayrLogo />);
    const logoElement = screen.getByText('Playr');
    expect(logoElement).toBeDefined();
    expect(logoElement.className).toContain('text-primary');
  });

  it('should apply custom className', () => {
    const customClass = 'custom-class';
    render(<PlayrLogo className={customClass} />);
    const container = screen.getByText('Playr').parentElement;
    expect(container?.className).toContain(customClass);
  });
});
