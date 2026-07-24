type WaiterCallEventHandler = () => void

const subscribers = new Set<WaiterCallEventHandler>()

export function onWaiterCallEvent(handler: WaiterCallEventHandler): () => void {
  subscribers.add(handler)
  return () => {
    subscribers.delete(handler)
  }
}

export function notifyWaiterCallEvent(): void {
  subscribers.forEach((handler) => handler())
}
