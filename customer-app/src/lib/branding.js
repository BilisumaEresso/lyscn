import defaultCover from '../assets/cafe_cover_placeholder.png';
import defaultLogo from '../assets/cafe_logo_placeholder.png';

export { defaultCover, defaultLogo };

/**
 * Returns the restaurant logo URL, or falls back to the default cafe logo placeholder
 * if none is configured or if an image loading error occurs.
 */
export function getRestaurantLogo(restaurant, hasError = false) {
  if (hasError || !restaurant?.logoUrl || typeof restaurant.logoUrl !== 'string' || !restaurant.logoUrl.trim()) {
    return defaultLogo;
  }
  return restaurant.logoUrl;
}

/**
 * Returns the restaurant cover photo URL, or falls back to the default cafe cover placeholder
 * if none is configured or if an image loading error occurs.
 */
export function getRestaurantCover(restaurant, hasError = false) {
  if (hasError || !restaurant?.coverUrl || typeof restaurant.coverUrl !== 'string' || !restaurant.coverUrl.trim()) {
    return defaultCover;
  }
  return restaurant.coverUrl;
}
