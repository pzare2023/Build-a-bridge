// utils/timeAgo.ts

/**
 * Convert a timestamp to a relative time string like "5 mins ago"
 */
export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins === 1) {
    return "1 min ago";
  } else if (diffMins < 60) {
    return `${diffMins} mins ago`;
  } else if (diffHours === 1) {
    return "1 hour ago";
  } else {
    return `${diffHours} hours ago`;
  }
}

/**
 * Check if a timestamp is within the last N hours
 */
export function isWithinHours(timestamp: number, hours: number): boolean {
  const now = Date.now();
  const diffMs = now - timestamp;
  const maxMs = hours * 60 * 60 * 1000;
  return diffMs <= maxMs;
}

/**
 * Check if announcement should be displayed (within 1 hour)
 */
export function shouldDisplayAnnouncement(timestamp: number): boolean {
  return isWithinHours(timestamp, 1);
}

/**
 * Check if announcement should be kept in storage (within 6 hours)
 */
export function shouldKeepAnnouncement(timestamp: number): boolean {
  return isWithinHours(timestamp, 6);
}
