import { customRender } from '@repo/testing/web';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaylistEditHero } from './PlaylistEditHero';

const setDraftNameMock = vi.fn();
const setCoverFileMock = vi.fn();
const scheduleRemoveCoverMock = vi.fn();
const undoRemoveCoverMock = vi.fn();

const mockDraft = {
  detail: null as any,
  draftName: 'My Playlist',
  setDraftName: setDraftNameMock,
  titleError: null as string | null,
  coverInputRef: { current: null as HTMLInputElement | null },
  coverFile: null as File | null,
  setCoverFile: setCoverFileMock,
  removeCover: false,
  scheduleRemoveCover: scheduleRemoveCoverMock,
  undoRemoveCover: undoRemoveCoverMock,
  initialSnapshot: null as any,
  draftTrackIds: [] as string[],
};

vi.mock('@/components/playlists/playlist-edit-draft.context', () => ({
  usePlaylistEditDraft: () => mockDraft,
}));

vi.mock('@/hooks/useObjectUrl', () => ({
  useObjectUrl: (file: any) => (file ? 'blob://mock-object-url' : null),
}));

describe('PlaylistEditHero', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDraft.detail = {
      id: 'playlist-123',
      name: 'Chill Vibes',
      cover: null,
      trackCount: 0,
    };
    mockDraft.draftName = 'My Playlist';
    mockDraft.titleError = null;
    mockDraft.coverInputRef = { current: null };
    mockDraft.coverFile = null;
    mockDraft.removeCover = false;
    mockDraft.initialSnapshot = { hasCover: false };
    mockDraft.draftTrackIds = ['track-1', 'track-2'];
  });

  it('renders general layout with draft name, song counter, and placeholder add image', () => {
    customRender(<PlaylistEditHero />);

    expect(screen.getByText('Playlist')).toBeInTheDocument();
    expect(screen.getByText('2 songs')).toBeInTheDocument();
    expect(screen.getByText('Add image')).toBeInTheDocument();

    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
    expect(titleInput).toBeInTheDocument();
    expect(titleInput.value).toBe('My Playlist');
  });

  it('renders singular song counter text when there is only one track', () => {
    mockDraft.draftTrackIds = ['track-1'];
    customRender(<PlaylistEditHero />);
    expect(screen.getByText('1 song')).toBeInTheDocument();
  });

  it('displays the existing cover image if it exists', () => {
    mockDraft.detail.cover = { url: 'https://example.com/cover.jpg' };
    const { container } = customRender(<PlaylistEditHero />);

    const images = container.querySelectorAll('img');
    // Blur glow, main cover blur, main cover
    expect(images.length).toBe(3);
    expect(images[2]).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('displays validation title error when titleError is present', () => {
    mockDraft.titleError = 'Title is required';
    customRender(<PlaylistEditHero />);

    expect(screen.getByText('Title is required')).toBeInTheDocument();
  });

  it('updates draft title when typing in the title input field', () => {
    customRender(<PlaylistEditHero />);
    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: 'New Cool Title' } });
    expect(setDraftNameMock).toHaveBeenCalledWith('New Cool Title');
  });

  it('triggers coverInputRef click when clicking on the cover button', () => {
    const { container } = customRender(<PlaylistEditHero />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const mockClick = vi.fn();
    input.click = mockClick;

    const coverBtn = screen.getByRole('button', { name: /Add image/i });
    fireEvent.click(coverBtn);

    expect(mockClick).toHaveBeenCalled();
  });

  it('triggers setCoverFile when a file is picked', () => {
    const { container } = customRender(<PlaylistEditHero />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    const file = new File(['image-data'], 'awesome-cover.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true,
    });

    fireEvent.change(input);
    expect(setCoverFileMock).toHaveBeenCalledWith(file);
  });

  it('triggers setCoverFile(null) when clicking discard new image button', () => {
    mockDraft.coverFile = new File(['image-data'], 'awesome-cover.jpg', { type: 'image/jpeg' });

    const { container } = customRender(<PlaylistEditHero />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'value', {
      value: 'dummy',
      writable: true,
    });

    const discardBtn = screen.getByRole('button', { name: /Discard new image/i });
    fireEvent.click(discardBtn);

    expect(setCoverFileMock).toHaveBeenCalledWith(null);
    expect(input.value).toBe('');
  });

  it('triggers scheduleRemoveCover when clicking remove cover button', () => {
    mockDraft.initialSnapshot.hasCover = true;
    mockDraft.detail.cover = { url: 'https://example.com/cover.jpg' };
    customRender(<PlaylistEditHero />);

    const removeBtn = screen.getByRole('button', { name: /Remove cover/i });
    fireEvent.click(removeBtn);

    expect(scheduleRemoveCoverMock).toHaveBeenCalled();
  });

  it('triggers undoRemoveCover when clicking undo remove button', () => {
    mockDraft.initialSnapshot.hasCover = true;
    mockDraft.removeCover = true;
    customRender(<PlaylistEditHero />);

    expect(screen.getByText('Removed when you save')).toBeInTheDocument();

    const undoBtn = screen.getByRole('button', { name: /Undo remove/i });
    fireEvent.click(undoBtn);

    expect(undoRemoveCoverMock).toHaveBeenCalled();
  });

  it('triggers setCoverFile(null) when a change event occurs with no files', () => {
    const { container } = customRender(<PlaylistEditHero />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: null,
      writable: true,
    });

    fireEvent.change(input);
    expect(setCoverFileMock).toHaveBeenCalledWith(null);
  });

  it('triggers setCoverFile(null) when clicking discard new image button even if ref.current is null', () => {
    mockDraft.coverFile = new File(['image-data'], 'awesome-cover.jpg', { type: 'image/jpeg' });
    customRender(<PlaylistEditHero />);

    mockDraft.coverInputRef.current = null;

    const discardBtn = screen.getByRole('button', { name: /Discard new image/i });
    fireEvent.click(discardBtn);

    expect(setCoverFileMock).toHaveBeenCalledWith(null);
  });

  it('triggers onBlur when the title field is blurred', () => {
    customRender(<PlaylistEditHero />);
    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;

    fireEvent.blur(titleInput);
  });
});
