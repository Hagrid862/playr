import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueueHeader } from './QueueHeader';

describe('QueueHeader', () => {
  describe('interactions', () => {
    it('renders correctly and handles clicks', () => {
      const onShowHistory = vi.fn();
      const onToggleQueue = vi.fn();
      customRender(<QueueHeader onShowHistory={onShowHistory} onToggleQueue={onToggleQueue} />);

      expect(screen.getByText('Queue')).toBeInTheDocument();

      const histBtn = screen.getByTitle('Show History');
      fireEvent.click(histBtn);
      expect(onShowHistory).toHaveBeenCalledOnce();

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]);
      expect(onToggleQueue).toHaveBeenCalledOnce();
    });
  });
});
