export function formatDate(iso, withTime = false) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export const statusClass = (status) => status.toLowerCase().replace(/\s+/g, '-');

export function formatHours(hours) {
  if (hours == null) return '—';
  return hours >= 48 ? `${Math.round(hours / 24)} days` : `${Math.round(hours)} hrs`;
}

const CATEGORY_ICONS = {
  Streetlight: '💡',
  'Water Issue': '💧',
  'Garbage Collection': '🗑️',
  'Road Damage': '🚧',
  'Drainage & Sewer': '🌊',
  Other: '📌',
};

export const categoryIcon = (category) => CATEGORY_ICONS[category] || CATEGORY_ICONS.Other;
