/**
 * The guides built from this folder. `output` must match the object name in
 * the Supabase "guides" bucket (and the guides table's file_url), so uploads
 * replace the live file in place.
 */
export const GUIDES = [
  { template: 'cap-process-walkthrough.html', output: 'complete-cap-process-walkthrough.pdf', title: 'Complete CAP Process Walkthrough' },
  { template: 'cap-option-form-strategy.html', output: 'cap-option-form-strategy-guide.pdf', title: 'CAP Option Form Strategy' },
  { template: 'category-reservation-documents-checklist.html', output: 'category-reservation-documents-checklist.pdf', title: 'Category & Reservation Documents Checklist' },
];

export const GUIDES_OUTPUTS = GUIDES.map((g) => g.output);
