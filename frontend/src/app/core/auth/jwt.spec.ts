import { isTokenExpired } from './jwt';
import { fakeJwt } from '../testing/jwt.testing';

describe('isTokenExpired', () => {
  it('token còn hạn', () => {
    expect(isTokenExpired(fakeJwt(15 * 60))).toBe(false);
  });

  it('token đã hết hạn', () => {
    expect(isTokenExpired(fakeJwt(-1))).toBe(true);
  });

  it('token sắp hết hạn trong 10 giây coi như đã hết hạn', () => {
    expect(isTokenExpired(fakeJwt(5))).toBe(true);
  });

  it('token không đọc được thì để backend quyết định', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(false);
    expect(isTokenExpired('a.%%%.c')).toBe(false);
  });
});
