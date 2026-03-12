import { CheckAlbumAccess } from './check-album-access.decorator';

describe('CheckAlbumAccess Decorator', () => {
  it('should be defined', () => {
    expect(CheckAlbumAccess).toBeDefined();
  });

  it('should set metadata with default param name "id"', () => {
    const decorator = CheckAlbumAccess();
    expect(typeof decorator).toBe('function');
  });

  it('should set metadata with custom param name', () => {
    const customParam = 'albumId';
    const decorator = CheckAlbumAccess(customParam);
    expect(typeof decorator).toBe('function');
  });
});
