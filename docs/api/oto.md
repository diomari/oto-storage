# `oto`

```ts
function oto<T extends object>(
  options?: StorageOptions,
): T & OtoMethods<T>;
```

Creates a typed proxy over `localStorage` (default) or `sessionStorage`.

## Example

```ts
interface AppStorage {
  token: string | null;
}

const storage = oto<AppStorage>({
  prefix: "app-",
  defaults: { token: null },
});
```

## Behavior summary

- Reads/writes are JSON-based.
- Nested object updates are proxied.
- Expired values are removed on access when `ttl` is enabled.
- Encryption wrapper is used when `encryption` is configured.
- `subscribe` and `onChange` listen for cross-tab changes via the `storage` event.

## Cross-tab sync methods

```ts
interface OtoMethods<T extends object> {
  clearAll(): void;
  subscribe(listener: (change: OtoChangeEvent<T>) => void): () => void;
  onChange<K extends keyof T>(
    key: K,
    listener: (value: T[K] | undefined, change: OtoChangeEvent<T, K>) => void,
  ): () => void;
}
```
