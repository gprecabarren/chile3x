/** In-page navigation is a transient selection, not a permanently current page.
 * One lazy subscription is shared by the desktop/mobile copies of the menu.
 * Native anchor scrolling must not dismiss it; subsequent user scrolling does.
 */
export function createAnchorNavigationHighlight(browser: Window) {
  const listeners = new Set<() => void>();
  const locationKey = () => browser.location.hash ? browser.location.pathname + browser.location.hash : "";
  let lastLocation = locationKey();
  let selected = lastLocation;
  let dismissed = "";
  const publish = (next: string) => {
    if (selected === next) return;
    selected = next;
    listeners.forEach(changed => changed());
  };
  const locationChanged = () => {
    lastLocation = locationKey();
    // A late hashchange from the anchor jump must not undo a user dismissal.
    publish(lastLocation === dismissed ? "" : lastLocation);
  };
  const historyChanged = () => { dismissed = ""; locationChanged(); };
  const dismiss = () => {
    dismissed = selected || dismissed || locationKey();
    lastLocation = locationKey();
    publish("");
  };
  const keyboardScroll = (event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof Element && target.closest("input, textarea, select, button, [contenteditable]:not([contenteditable=false])")) return;
    if (!event.defaultPrevented && ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) dismiss();
  };
  const scrollbarScroll = (event: PointerEvent) => {
    if (event.clientX >= browser.document.documentElement.clientWidth) dismiss();
  };
  return {
    getSnapshot: () => selected,
    activate: (key: string) => { dismissed = ""; publish(key); },
    subscribe: (changed: () => void) => {
      if (listeners.size === 0) {
        // Preserve a dismissed hash when the header remounts on the same URL.
        if (lastLocation !== locationKey()) locationChanged();
        browser.addEventListener("hashchange", locationChanged);
        browser.addEventListener("popstate", historyChanged);
        browser.addEventListener("wheel", dismiss, { passive: true });
        browser.addEventListener("touchmove", dismiss, { passive: true });
        browser.addEventListener("keydown", keyboardScroll);
        browser.addEventListener("pointerdown", scrollbarScroll, { passive: true });
      }
      listeners.add(changed);
      return () => {
        listeners.delete(changed);
        if (listeners.size) return;
        browser.removeEventListener("hashchange", locationChanged);
        browser.removeEventListener("popstate", historyChanged);
        browser.removeEventListener("wheel", dismiss);
        browser.removeEventListener("touchmove", dismiss);
        browser.removeEventListener("keydown", keyboardScroll);
        browser.removeEventListener("pointerdown", scrollbarScroll);
      };
    },
  };
}
