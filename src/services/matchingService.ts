import { UserProfile } from '../types/auth';
import { Listing, RankedListing } from '../types/marketplace';
import { distanceKm } from '../utils/geo';

export function rankListings(listings: Listing[], profile: UserProfile): RankedListing[] {
  return listings
    .map((listing) => {
      const distance = distanceKm(profile.lat, profile.lng, listing.lat, listing.lng);
      const learnedInterestScore = profile.interestScores?.[listing.category] ?? 0;
      const inInterest = profile.interests.includes(listing.category) || learnedInterestScore > 0;
      const urgentBonus = Math.max(0, 24 - listing.expiresInHours);
      const distancePenalty = Math.min(distance * 3, 20);
      const baseInterestBonus = profile.interests.includes(listing.category) ? 25 : 0;
      const learnedInterestBonus = Math.min(30, learnedInterestScore * 4);
      const interestBonus = baseInterestBonus + learnedInterestBonus;
      const score = Math.max(0, 50 + urgentBonus + interestBonus - distancePenalty);

      const notifyDistanceLimit = 4 + Math.min(3, learnedInterestScore * 0.5);
      const notifyExpiryLimit = 24 + Math.min(24, learnedInterestScore * 2);

      return {
        ...listing,
        distance,
        score,
        shouldNotify: inInterest && distance <= notifyDistanceLimit && listing.expiresInHours <= notifyExpiryLimit,
      };
    })
    .sort((a, b) => b.score - a.score);
}
