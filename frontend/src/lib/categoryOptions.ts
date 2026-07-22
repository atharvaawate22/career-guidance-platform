import type { SelectOption } from "@/components/CustomSelect";

/**
 * Canonical seat-category list for every category dropdown on the site
 * (Predictor, Cutoff Explorer, Quick Predict, Booking form).
 *
 * Values must stay in sync with CUTOFF_CATEGORIES in cutoffOptions.ts — this
 * file only adds grouping, ordering, and human-readable labels on top of the
 * same codes the backend understands. Groups are ordered by how often
 * candidates actually belong to them, so the common picks sit at the top
 * instead of being buried under the defence / PwD long tail.
 */

export interface CategoryOption {
  value: string;
  label: string;
}

export interface CategoryGroup {
  heading: string;
  options: CategoryOption[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    heading: "Common Categories",
    options: [
      { value: "OPEN", label: "OPEN (General)" },
      { value: "OBC", label: "OBC (Other Backward Class)" },
      { value: "SEBC", label: "SEBC (Socially & Educationally Backward)" },
      { value: "EWS", label: "EWS (Economically Weaker Section)" },
      { value: "SC", label: "SC (Scheduled Castes)" },
      { value: "ST", label: "ST (Scheduled Tribes)" },
    ],
  },
  {
    heading: "VJ / NT Categories",
    options: [
      { value: "VJ", label: "VJ (Vimukta Jati / DT-A)" },
      { value: "NT1", label: "NT1 (Nomadic Tribes – NT-B)" },
      { value: "NT2", label: "NT2 (Nomadic Tribes – NT-C)" },
      { value: "NT3", label: "NT3 (Nomadic Tribes – NT-D)" },
    ],
  },
  {
    heading: "Special Seats",
    options: [
      { value: "TFWS", label: "TFWS (Tuition Fee Waiver)" },
      { value: "MI", label: "MI (Minority Seats)" },
      { value: "ORPHAN", label: "Orphan" },
    ],
  },
  {
    heading: "Defence",
    options: [
      { value: "DEF_OPEN", label: "DEF-OPEN (Defence – Open)" },
      { value: "DEF_OBC", label: "DEF-OBC (Defence – OBC)" },
      { value: "DEF_SEBC", label: "DEF-SEBC (Defence – SEBC)" },
      { value: "DEF_SC", label: "DEF-SC (Defence – SC)" },
      { value: "DEF_ST", label: "DEF-ST (Defence – ST)" },
      { value: "DEF_VJ", label: "DEF-VJ (Defence – VJ)" },
      { value: "DEF_NT1", label: "DEF-NT1 (Defence – NT1)" },
      { value: "DEF_NT2", label: "DEF-NT2 (Defence – NT2)" },
      { value: "DEF_NT3", label: "DEF-NT3 (Defence – NT3)" },
    ],
  },
  {
    heading: "Persons with Disability",
    options: [
      { value: "PWD_OPEN", label: "PWD-OPEN (PwD – Open)" },
      { value: "PWD_OBC", label: "PWD-OBC (PwD – OBC)" },
      { value: "PWD_SEBC", label: "PWD-SEBC (PwD – SEBC)" },
      { value: "PWD_SC", label: "PWD-SC (PwD – SC)" },
      { value: "PWD_ST", label: "PWD-ST (PwD – ST)" },
      { value: "PWD_VJ", label: "PWD-VJ (PwD – VJ)" },
      { value: "PWD_NT1", label: "PWD-NT1 (PwD – NT1)" },
      { value: "PWD_NT2", label: "PWD-NT2 (PwD – NT2)" },
      { value: "PWD_NT3", label: "PWD-NT3 (PwD – NT3)" },
    ],
  },
];

/**
 * Flatten the grouped config into CustomSelect options, with each group
 * rendered as a non-selectable heading row.
 *
 * @param exclude  category values to omit (e.g. "TFWS" where it is modeled
 *                 as a checkbox instead of a category)
 * @param leading  extra selectable options to prepend (e.g. the
 *                 "All Categories" empty option)
 */
export function categorySelectOptions(
  exclude: string[] = [],
  leading: SelectOption[] = [],
): SelectOption[] {
  const out: SelectOption[] = [...leading];
  for (const group of CATEGORY_GROUPS) {
    const options = group.options.filter(o => !exclude.includes(o.value));
    if (options.length === 0) continue;
    out.push({ value: `__heading-${group.heading}`, label: group.heading, heading: true });
    out.push(...options);
  }
  return out;
}
