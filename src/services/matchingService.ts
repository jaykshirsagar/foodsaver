import { UserProfile } from '../types/auth';
import { Listing, RankedListing } from '../types/marketplace';
import { distanceKm } from '../utils/geo';

export function rankListings(listings: Listing[], profile: UserProfile): RankedListing[] {
  return listings
    .map((listing) => {
      const distance = distanceKm(profile.lat, profile.lng, listing.lat, listing.lng);
      const inInterest = profile.interests.includes(listing.category);
      const urgentBonus = Math.max(0, 24 - listing.expiresInHours);
      const distancePenalty = Math.min(distance * 3, 20);
      const interestBonus = inInterest ? 25 : 0;
      const score = Math.max(0, 50 + urgentBonus + interestBonus - distancePenalty);

      return {
        ...listing,
        distance,
        score,
        shouldNotify: inInterest && distance <= 4 && listing.expiresInHours <= 24,
      };
    })
    .sort((a, b) => b.score - a.score);
}
