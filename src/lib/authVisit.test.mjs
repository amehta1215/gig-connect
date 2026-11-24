import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canUseVisitSession, isAuthEmailLink } from './authVisit';

describe('Explicit sign-in on every website visit', () => {
  it('does not restore a saved account on an ordinary visit', () => {
    assert.equal(canUseVisitSession(false, false), false);
  });
  it('keeps the account available after deliberate login during the visit', () => {
    assert.equal(canUseVisitSession(true, false), true);
  });
  it('allows deliberate email confirmation and password recovery', () => {
    assert.equal(isAuthEmailLink('https://sethound.com/#access_token=test&type=signup'), true);
    assert.equal(isAuthEmailLink('https://sethound.com/reset-password#access_token=test&type=recovery'), true);
    assert.equal(canUseVisitSession(false, true), true);
  });
  it('never treats ordinary, demo or bare reset URLs as permission to sign in', () => {
    for (const path of ['/', '/demo-venue', '/venue', '/reset-password', '/?auth=login', '/#type=signup']) {
      assert.equal(isAuthEmailLink(`https://sethound.com${path}`), false);
    }
  });
});