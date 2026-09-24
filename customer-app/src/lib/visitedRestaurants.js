const STORAGE_KEY = 'layoscan-visited-restaurants';

/**
 * Returns the list of cafes & restaurants the customer has visited or ordered from.
 */
export function getVisitedRestaurants() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Saves or updates a restaurant in the visited history.
 */
export function saveVisitedRestaurant({ restaurant, branch, qrToken }) {
  if (!restaurant?._id && !restaurant?.name) return;

  try {
    const current = getVisitedRestaurants();
    const id = String(restaurant._id || restaurant.id || restaurant.name);

    const record = {
      id,
      name: restaurant.name,
      slug: restaurant.slug || '',
      logoUrl: restaurant.logoUrl || null,
      coverUrl: restaurant.coverUrl || null,
      brandColor: restaurant.brandColor || '#14B8A6',
      address: restaurant.contactInfo?.address || branch?.address || '',
      qrToken: qrToken || null,
      lastVisited: new Date().toISOString(),
    };

    // Filter out existing record if present, then prepend latest
    const filtered = current.filter((r) => r.id !== id);
    const updated = [record, ...filtered].slice(0, 6);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota or security errors
  }
}

/**
 * Clears the visited restaurant history.
 */
export function clearVisitedRestaurants() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
