// Only the newest request may update the screen: starting one aborts the one
// before, and a response from an older one is ignored even if it still arrives.
export function createLatest() {
  let current: AbortController | undefined;
  return {
    begin() {
      current?.abort();
      const controller = new AbortController();
      current = controller;
      return {
        signal: controller.signal,
        isCurrent: () => current === controller,
      };
    },
  };
}
