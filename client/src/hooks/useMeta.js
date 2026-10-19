const META = {
  categories: [
    'Streetlight',
    'Water Issue',
    'Garbage Collection',
    'Road Damage',
    'Drainage & Sewer',
    'Other',
  ],
  statuses: ['Pending', 'In Progress', 'Resolved'],
};

/** Local UI options; the server validates submitted categories and statuses. */
export function useMeta() {
  return META;
}
