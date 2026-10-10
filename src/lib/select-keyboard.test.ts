import { afterEach, expect, it, vi } from "vitest";
import { afterKeyboardDismiss } from "./select-keyboard";

afterEach(() => vi.useRealTimers());

it("opens once after the keyboard resize sequence ends", () => {
  vi.useFakeTimers();
  const viewport = new EventTarget();
  const open = vi.fn();
  afterKeyboardDismiss(open, viewport);
  vi.advanceTimersByTime(200);
  viewport.dispatchEvent(new Event("resize"));
  vi.advanceTimersByTime(100);
  viewport.dispatchEvent(new Event("resize"));
  expect(open).not.toHaveBeenCalled();
  vi.advanceTimersByTime(150);
  expect(open).toHaveBeenCalledOnce();
  viewport.dispatchEvent(new Event("resize"));
  vi.runAllTimers();
  expect(open).toHaveBeenCalledOnce();
});

it("can cancel a pending open when the form closes", () => {
  vi.useFakeTimers();
  const viewport = new EventTarget();
  const open = vi.fn();
  const cancel = afterKeyboardDismiss(open, viewport);
  cancel();
  vi.runAllTimers();
  expect(open).not.toHaveBeenCalled();
});

it("does not wait forever if the viewport keeps resizing", () => {
  vi.useFakeTimers();
  const viewport = new EventTarget();
  const open = vi.fn();
  afterKeyboardDismiss(open, viewport);
  for (let i = 0; i < 10; i++) {
    vi.advanceTimersByTime(100);
    viewport.dispatchEvent(new Event("resize"));
  }
  expect(open).toHaveBeenCalledOnce();
});
