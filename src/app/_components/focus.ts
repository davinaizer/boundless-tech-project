// Where keyboard focus goes when a chip's remove button disappears (WCAG 2.4.3):
// the next chip, else the previous one, else the "Add a filter" button.
export const ADD_BUTTON = "add" as const;

export function focusAfterRemoval(chipIds: readonly string[], removedId: string): string {
  const index = chipIds.indexOf(removedId);
  if (index === -1) return ADD_BUTTON;
  return chipIds[index + 1] ?? chipIds[index - 1] ?? ADD_BUTTON;
}
