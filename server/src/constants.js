// Single source of truth for allowed values; the client reads these via GET /api/meta.
const CATEGORIES = [
  'Streetlight',
  'Water Issue',
  'Garbage Collection',
  'Road Damage',
  'Drainage & Sewer',
  'Other',
];

const STATUSES = ['Pending', 'In Progress', 'Resolved'];

module.exports = { CATEGORIES, STATUSES };
