import { CheckTrackAccess } from './check-track-access.decorator';

describe('CheckTrackAccess Decorator', () => {
  it('should be defined', () => {
    expect(CheckTrackAccess).toBeDefined();
  });

  it('should set metadata with default param name "id"', () => {
    const decorator = CheckTrackAccess();
    expect(typeof decorator).toBe('function');
  });

  it('should set metadata with custom param name', () => {
    const customParam = 'trackId';
    const decorator = CheckTrackAccess(customParam);
    expect(typeof decorator).toBe('function');
  });
});
