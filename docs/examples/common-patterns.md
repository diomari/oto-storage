# Common Patterns

## Auth session

```ts
interface AuthStorage {
  token: string | null;
  user: { id: string; name: string } | null;
}

const auth = oto<AuthStorage>({
  prefix: "auth-",
  ttl: 60 * 60 * 1000,
  defaults: { token: null, user: null },
});
```

## Feature flags

```ts
interface Flags {
  newDashboard: boolean;
}

const flags = oto<Flags>({ prefix: "flags-" });
```

## Namespaced modules

```ts
const prefs = oto<{ theme: string }>({ prefix: "prefs-" });
const cart = oto<{ items: string[] }>({ prefix: "cart-" });
```
