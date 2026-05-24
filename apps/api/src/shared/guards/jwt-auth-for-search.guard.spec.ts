import { JwtAuthGuardForSearch } from './jwt-auth-for-search.guard';

describe('JwtAuthGuardForSearch', () => {
  let guard: JwtAuthGuardForSearch;

  beforeEach(() => {
    guard = new JwtAuthGuardForSearch();
  });

  describe('handleRequest', () => {
    it('should return null if there is an error', () => {
      const err = new Error('some error');
      const user = null;
      expect(guard.handleRequest(err, user)).toBeNull();
    });

    it('should return null if there is no user', () => {
      const err = null;
      const user = undefined;
      expect(guard.handleRequest(err, user)).toBeNull();
    });

    it('should return user if there is no error and user exists', () => {
      const err = null;
      const user = { id: 1, email: 'test@example.com' };
      expect(guard.handleRequest(err, user)).toEqual(user);
    });

    it('should return null if error is present even when user exists', () => {
      const err = new Error('some error');
      const user = { id: 1 };
      expect(guard.handleRequest(err, user)).toBeNull();
    });

    it('should return null for various falsy user values when no error', () => {
      const err = null;
      const falsyValues = [null, undefined, false, 0, '', NaN];
      for (const userValue of falsyValues) {
        expect(guard.handleRequest(err, userValue)).toBeNull();
      }
    });
  });
});
