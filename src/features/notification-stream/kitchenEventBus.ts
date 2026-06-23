type KitchenEventHandler = () => void

const subscribers = new Set<KitchenEventHandler>()

export function onKitchenEvent(handler: KitchenEventHandler): () => void {
  subscribers.add(handler)
  return () => {
    subscribers.delete(handler)
  }
}

export function notifyKitchenEvent(): void {
  subscribers.forEach((handler) => handler())
}
