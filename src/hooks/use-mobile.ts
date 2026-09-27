import * as React from "react"

const QUERY = "(max-width: 767px)"

function subscribe(cb: () => void) {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener("change", cb)
  return () => mql.removeEventListener("change", cb)
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false)
}
