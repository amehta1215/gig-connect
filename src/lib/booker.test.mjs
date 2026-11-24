import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { companyInformation, discoveryKey, canUseDashboard, bookerDiscoverable, missingBookerVenueFields, SIGNUP_ROLES, shouldShowVenueCompletionReminder } from './booker';

describe('Booker account rules', () => {
  it('does not remind venues or Bookers who already have at least one room or venue', () => {
    assert.equal(shouldShowVenueCompletionReminder(1), false);
    assert.equal(shouldShowVenueCompletionReminder(2), false);
  });
  it('only reminds accounts with a successfully loaded empty listing list', () => {
    assert.equal(shouldShowVenueCompletionReminder(0), true);
    assert.equal(shouldShowVenueCompletionReminder(null), false);
  });
  it('offers only artist, venue and promoter at signup', () => {
    assert.deepEqual(SIGNUP_ROLES, ['artist', 'venue', 'booker']);
    assert.equal(SIGNUP_ROLES.includes('both'), false);
  });
  it('does not display company information when the checkbox is unchecked', () => {
    assert.equal(companyInformation({ is_booker: true, show_company_info: false, venue_name: 'Stage Collective', bio: 'Independent bookings' }), null);
  });
  it('displays the company name and provided bio when checked', () => {
    assert.deepEqual(companyInformation({ is_booker: true, show_company_info: true, venue_name: 'Stage Collective', bio: 'Independent bookings' }), { name: 'Stage Collective', bio: 'Independent bookings' });
  });
  it('allows a missing company bio', () => {
    assert.deepEqual(companyInformation({ is_booker: true, show_company_info: true, venue_name: 'Stage Collective' }), { name: 'Stage Collective', bio: null });
  });
  it('keeps each Booker venue as an independent discovery listing', () => {
    const profile = { is_booker: true };
    const a = discoveryKey({ id: 'venue-a', venue_profile_id: 'company' }, profile);
    const b = discoveryKey({ id: 'venue-b', venue_profile_id: 'company' }, profile);
    assert.equal(a, 'venue-a'); assert.equal(b, 'venue-b'); assert.notEqual(a, b);
  });
  it('preserves grouping of existing Venue rooms', () => {
    assert.equal(discoveryKey({ id: 'room-a', venue_profile_id: 'venue' }, { is_booker: false }), 'venue');
  });
  it('Booker uses venue tools, not artist tools', () => {
    assert.equal(canUseDashboard('booker', 'venue'), true);
    assert.equal(canUseDashboard('booker', 'artist'), false);
  });
  it('preserves Artist, Venue and Both dashboard access', () => {
    assert.equal(canUseDashboard('artist', 'artist'), true);
    assert.equal(canUseDashboard('artist', 'venue'), false);
    assert.equal(canUseDashboard('venue', 'venue'), true);
    assert.equal(canUseDashboard('venue', 'artist'), false);
    assert.equal(canUseDashboard('both', 'artist'), true);
    assert.equal(canUseDashboard('both', 'venue'), true);
  });
  it('requires a published venue for Booker discoverability', () => {
    assert.equal(bookerDiscoverable('Stage Collective', [{ is_published: false }]), false);
    assert.equal(bookerDiscoverable('Stage Collective', [{ is_published: true }]), true);
    assert.equal(bookerDiscoverable('', [{ is_published: true }]), false);
  });
  it('blocks publishing while any Add Venue field is empty', () => {
    const empty = { venue_name: '', location: '', capacity: '', genres: [], bio: '', backline_info: '', house_rules: '' };
    assert.deepEqual(missingBookerVenueFields(empty, []), ['Venue Photos', 'Venue Name', 'Capacity', 'Location', 'Genres', 'About', 'Backline', 'Rules']);
  });
  it('allows publishing once every Add Venue field is filled', () => {
    const draft = { venue_name: 'Round Trip Hall', location: 'Brooklyn, NY', capacity: '120', genres: ['Jazz'], bio: 'Intimate room', backline_info: 'House kit', house_rules: 'No filming' };
    assert.deepEqual(missingBookerVenueFields(draft, ['https://example.com/a.jpg']), []);
  });
  it('treats blank text, zero capacity, no photo and no genre as unfilled', () => {
    const draft = { venue_name: '  ', location: 'Brooklyn, NY', capacity: '0', genres: [], bio: 'Intimate room', backline_info: 'House kit', house_rules: 'No filming' };
    assert.deepEqual(missingBookerVenueFields(draft, []), ['Venue Photos', 'Venue Name', 'Capacity', 'Genres']);
  });
});