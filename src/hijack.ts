export const originalFetch = unsafeWindow.fetch
export const originalPushState = unsafeWindow.history.pushState;
export const originalReplaceState = unsafeWindow.history.replaceState;
export const originalNodeAppendChild = unsafeWindow.Node.prototype.appendChild
export const originalRemoveChild = unsafeWindow.Node.prototype.removeChild
export const originalRemove = unsafeWindow.Element.prototype.remove
export const originalAddEventListener = unsafeWindow.EventTarget.prototype.addEventListener