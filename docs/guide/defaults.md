# Defaults

Provide fallback values with `defaults`.

```ts
interface AppStorage {
  theme: "light" | "dark";
  user: { name: string; role: string; active: boolean };
}

const storage = oto<AppStorage>({
  defaults: {
    theme: "light",
    user: { name: "Anonymous", role: "guest", active: false },
  },
});
```

Stored values override defaults, and nested objects are deep-merged.
