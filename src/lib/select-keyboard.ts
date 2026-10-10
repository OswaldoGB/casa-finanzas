// Radix dismisses an open select on resize; let the keyboard finish closing first.
export function afterKeyboardDismiss(open: () => void, viewport: EventTarget, visualViewport?: EventTarget | null) {
  let timer: ReturnType<typeof setTimeout>;
  const cancel = () => {
    clearTimeout(timer);
    clearTimeout(deadline);
    viewport.removeEventListener("resize", resized);
    visualViewport?.removeEventListener("resize", resized);
  };
  const finish = () => {
    cancel();
    open();
  };
  const resized = () => {
    clearTimeout(timer);
    timer = setTimeout(finish, 150);
  };
  viewport.addEventListener("resize", resized);
  visualViewport?.addEventListener("resize", resized);
  timer = setTimeout(finish, 350);
  const deadline = setTimeout(finish, 1000);
  return cancel;
}
