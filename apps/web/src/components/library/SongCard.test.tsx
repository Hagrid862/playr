import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SongCard } from './SongCard';

describe('SongCard', () => {
  const defaultProps = {
    id: 'test-song-id',
    trackNumber: 1,
    title: 'Test Song',
    duration: 185,
    artists: [{ id: '1', name: 'Artist 1' }],
  };

  it('renders song details correctly', () => {
    render(<SongCard {...defaultProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('3:05')).toBeInTheDocument();
  });

  it('renders explicit tag when explicit is true', () => {
    render(<SongCard {...defaultProps} explicit />);
    expect(screen.getByText('E')).toBeInTheDocument();
  });

  it('does not render explicit tag when explicit is false or undefined', () => {
    render(<SongCard {...defaultProps} />);
    expect(screen.queryByText('E')).not.toBeInTheDocument();
  });

  it('formats multiple artists correctly', () => {
    const propsWithMultipleArtists = {
      ...defaultProps,
      artists: [
        { id: '1', name: 'Artist 1' },
        { id: '2', name: 'Artist 2' },
      ],
    };
    render(<SongCard {...propsWithMultipleArtists} />);
    expect(screen.getByText('Artist 1, Artist 2')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SongCard {...defaultProps} onClick={onClick} />);

    fireEvent.click(screen.getByText('Test Song'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when edit action is clicked in context menu', () => {
    const onEdit = vi.fn();
    render(<SongCard {...defaultProps} onEdit={onEdit} />);

    // Open context menu (right click)
    fireEvent.contextMenu(screen.getByText('Test Song'));

    // Click edit
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith('test-song-id');
  });

  it('calls onDelete when delete action is clicked in context menu', () => {
    const onDelete = vi.fn();
    render(<SongCard {...defaultProps} onDelete={onDelete} />);

    // Open context menu
    fireEvent.contextMenu(screen.getByText('Test Song'));

    // Click delete
    fireEvent.click(screen.getByText('Delete'));
    expect(onDelete).toHaveBeenCalledWith({ id: 'test-song-id', title: 'Test Song' });
  });

  it('renders track number and play icon on hover (via group classes)', () => {
    const { container } = render(<SongCard {...defaultProps} />);

    // We can't easily test CSS hover state in jsdom/testing-library without complex setups,
    // but we can check if the elements exist with correct classes.
    const trackNum = screen.getByText('1');
    expect(trackNum).toHaveClass('group-hover:hidden');

    // PlayIcon should be present with group-hover:block
    const playIcon = container.querySelector('svg');
    expect(playIcon).toBeInTheDocument();
    expect(playIcon).toHaveClass('hidden', 'group-hover:block');
  });

  it('formats duration with leading zero for seconds < 10', () => {
    render(<SongCard {...defaultProps} duration={65} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('formats duration with more than 10 minutes', () => {
    render(<SongCard {...defaultProps} duration={605} />);
    expect(screen.getByText('10:05')).toBeInTheDocument();
  });
});
