// Utility mapping amenities to Bootstrap icons and color accents

export const amenityIconMap = {
  "Swimming Pool": { icon: "bi-water", color: "#0284c7" },
  "Club House": { icon: "bi-building-gear", color: "#8b5cf6" },
  "Gymnasium": { icon: "bi-activity", color: "#ef4444" },
  "Landscape Garden": { icon: "bi-tree-fill", color: "#10b981" },
  "24/7 Security": { icon: "bi-shield-check", color: "#f59e0b" },
  "Children Play Area": { icon: "bi-emoji-smile-fill", color: "#ec4899" },
  "Power Backup": { icon: "bi-lightning-charge-fill", color: "#eab308" },
  "Car Parking": { icon: "bi-car-front-fill", color: "#3b82f6" },
  "Visitor Parking": { icon: "bi-p-square-fill", color: "#6366f1" },
  "Jogging Track": { icon: "bi-person-walking", color: "#14b8a6" },
  "Intercom": { icon: "bi-telephone-fill", color: "#06b6d4" },
  "Private Garden": { icon: "bi-flower2", color: "#22c55e" },
  "Solar Water System": { icon: "bi-sun-fill", color: "#f97316" },
  "Home Automation": { icon: "bi-cpu-fill", color: "#a855f7" },
  "EV Charging Station": { icon: "bi-ev-station-fill", color: "#10b981" },
  "Multi-purpose Hall": { icon: "bi-door-open-fill", color: "#64748b" },
  "Badminton Court": { icon: "bi-trophy-fill", color: "#d97706" },
  "Fire Fighting System": { icon: "bi-fire", color: "#dc2626" },
  "Lift / Elevator": { icon: "bi-arrow-down-up", color: "#0284c7" },
  "Elevator": { icon: "bi-arrow-down-up", color: "#0284c7" },
  "CCTV Surveillance": { icon: "bi-camera-video-fill", color: "#f59e0b" },
  "Gas Pipeline": { icon: "bi-fuel-pump-fill", color: "#06b6d4" },
  "Rainwater Harvesting": { icon: "bi-droplet-fill", color: "#0284c7" },
  "Squash Court": { icon: "bi-dribbble", color: "#ec4899" },
  "Tennis Court": { icon: "bi-dribbble", color: "#10b981" },
  "Amphitheatre": { icon: "bi-display-fill", color: "#8b5cf6" },
  "Spa / Sauna": { icon: "bi-cup-hot-fill", color: "#f43f5e" },
  "Yoga / Meditation Deck": { icon: "bi-heart-pulse-fill", color: "#8b5cf6" },
  "Senior Citizen Area": { icon: "bi-people-fill", color: "#64748b" },
  "Wi-Fi / High-Speed Internet": { icon: "bi-wifi", color: "#3b82f6" }
};

/**
 * Returns icon configuration (icon class and badge color) for a given amenity name
 * Uses exact match first, then keyword fallback, and finally a standard default icon.
 */
export const getAmenityIcon = (name) => {
  if (!name || typeof name !== 'string') {
    return { icon: "bi-star-fill", color: "#0284c7" };
  }

  const trimmed = name.trim();
  if (amenityIconMap[trimmed]) {
    return amenityIconMap[trimmed];
  }

  const lower = trimmed.toLowerCase();

  if (lower.includes('pool') || lower.includes('swim')) return { icon: "bi-water", color: "#0284c7" };
  if (lower.includes('gym') || lower.includes('fit')) return { icon: "bi-activity", color: "#ef4444" };
  if (lower.includes('park') || lower.includes('car') || lower.includes('auto')) return { icon: "bi-car-front-fill", color: "#3b82f6" };
  if (lower.includes('garden') || lower.includes('lawn') || lower.includes('tree')) return { icon: "bi-tree-fill", color: "#10b981" };
  if (lower.includes('security') || lower.includes('guard') || lower.includes('cctv')) return { icon: "bi-shield-check", color: "#f59e0b" };
  if (lower.includes('play') || lower.includes('kid') || lower.includes('child')) return { icon: "bi-emoji-smile-fill", color: "#ec4899" };
  if (lower.includes('power') || lower.includes('backup') || lower.includes('generator')) return { icon: "bi-lightning-charge-fill", color: "#eab308" };
  if (lower.includes('solar') || lower.includes('sun')) return { icon: "bi-sun-fill", color: "#f97316" };
  if (lower.includes('club') || lower.includes('community')) return { icon: "bi-building-gear", color: "#8b5cf6" };
  if (lower.includes('wifi') || lower.includes('internet') || lower.includes('smart')) return { icon: "bi-wifi", color: "#3b82f6" };
  if (lower.includes('fire')) return { icon: "bi-fire", color: "#dc2626" };
  if (lower.includes('water') || lower.includes('rain')) return { icon: "bi-droplet-fill", color: "#0284c7" };
  if (lower.includes('court') || lower.includes('sport') || lower.includes('game')) return { icon: "bi-trophy-fill", color: "#d97706" };
  if (lower.includes('lift') || lower.includes('elevator')) return { icon: "bi-arrow-down-up", color: "#0284c7" };
  if (lower.includes('ev') || lower.includes('charge')) return { icon: "bi-ev-station-fill", color: "#10b981" };

  return { icon: "bi-check-circle-fill", color: "#0284c7" };
};
