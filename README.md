![Oto mascot](https://private-user-images.githubusercontent.com/1720539/549868330-cf61ef7d-956e-4c5f-af5e-a8439bd95e3b.jpg?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzEwNjIxMDUsIm5iZiI6MTc3MTA2MTgwNSwicGF0aCI6Ii8xNzIwNTM5LzU0OTg2ODMzMC1jZjYxZWY3ZC05NTZlLTRjNWYtYWY1ZS1hODQzOWJkOTVlM2IuanBnP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI2MDIxNCUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjAyMTRUMDkzNjQ1WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9NmVjYWY4NTczYzEyMTJjOTIwZjdkNjA0MGViNTVjMmI5ZTY1NGM0M2E5NjdlMjkyYWViOTdlODFlZWJkMGQzNyZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QifQ.FWuaQKYm55J5PO0tg4E-mrTE2ZcaqWhNueyhCCZPsyk)

# Oto Storage

A lightweight, Proxy-based wrapper for `localStorage` and `sessionStorage` with full TypeScript type safety.

### ⚡ The Problem

Working with browser storage usually involves repetitive `JSON.parse` and `JSON.stringify` calls, manual key prefixing to avoid collisions, and a total lack of Type Safety.

```typescript
// The old, "clunky" way
const user = JSON.parse(localStorage.getItem("user_data") || "{}");
localStorage.setItem("user_data", JSON.stringify({ ...user, theme: "dark" }));
```

### ✨ The Solution

Oto storage uses the JavaScript Proxy API to let you interact with browser storage as if it were a local object. It handles serialization, prefixing, and type-checking automatically.

**Key Features**

- Type-Safe: Full autocomplete and build-time error checking.

- Zero Boilerplate: No more manual JSON parsing.

- Driver Support: Switch between localStorage and sessionStorage with one flag.

- Collision Protection: Automatic key prefixing (namespacing).

### 🚀 Quick Start

**_1. Define your Schema_**

```typescript
interface AppStorage {
  theme: "light" | "dark";
  viewCount: number;
  user: { id: string; name: string } | null;
}
```

**_2. Initialize_**

```typescript
import { oto } from "oto-storage";

// For localStorage (default)
const storage = oto<AppStorage>({
  prefix: "myApp-",
});

// For sessionStorage
const session = oto<AppStorage>({
  prefix: "myApp-",
  type: "session",
});
```

**_3. Use it like a regular object_**

```typescript
// SETTING: Automatically stringified and saved to 'myApp-theme'
storage.theme = "dark";

// GETTING: Automatically parsed and typed
if (storage.theme === "dark") {
  console.log("Dark mode active!");
}

// DELETE: Delete the key-value pair from storage
delete storage.theme;

// CLEAR: Clear entire record
storage.clearAll();
```

### 📖 Comprehensive Examples

**Working with Complex Objects**

```typescript
interface UserData {
  id: string;
  name: string;
  preferences: {
    theme: "light" | "dark";
    notifications: boolean;
  };
}

const storage = oto<{ user: UserData | null }>({ prefix: "app-" });

// Store complex objects - automatically serialized
storage.user = {
  id: "123",
  name: "Alice",
  preferences: {
    theme: "dark",
    notifications: true,
  },
};

// Retrieve - fully typed with autocomplete
console.log(storage.user?.preferences.theme); // "dark"
```

**Checking if a Key Exists**

```typescript
const storage = oto<{ token: string | null }>({ prefix: "auth-" });

// Use 'in' operator to check if key exists in storage
if ("token" in storage) {
  console.log("User is authenticated");
}

// Or check directly (returns undefined for non-existent keys)
if (storage.token) {
  console.log("Token exists:", storage.token);
}
```

**Session Storage**

```typescript
const session = oto<{ temporaryData: string }>({
  prefix: "temp-",
  type: "session", // Uses sessionStorage instead of localStorage
});

session.temporaryData = "This will be cleared when tab closes";
```

**Multiple Namespaced Storages**

```typescript
const userPrefs = oto<{ theme: string }>({ prefix: "user-prefs-" });
const appState = oto<{ sidebarOpen: boolean }>({ prefix: "app-" });

userPrefs.theme = "dark";
appState.sidebarOpen = true;

// Keys are stored separately: 'user-prefs-theme' and 'app-sidebarOpen'
```

**Deleting and Clearing**

```typescript
const storage = oto<{ count: number; name: string }>({ prefix: "demo-" });

storage.count = 42;
storage.name = "Test";

// Delete single key
delete storage.count;

// Clear all keys with this storage's prefix
storage.clearAll();
```

**Type Safety at Work**

```typescript
interface AppStorage {
  count: number;
  items: string[];
}

const storage = oto<AppStorage>({ prefix: "app-" });

storage.count = 10; // ✓ Works
storage.count = "ten"; // ✗ TypeScript error: Type 'string' is not assignable to type 'number'

storage.items = ["a", "b"]; // ✓ Works
storage.items = "abc"; // ✗ TypeScript error: Type 'string' is not assignable to type 'string[]'
```

**Version Export**

```typescript
import { oto, version } from "oto-storage";

console.log(`Using oto-storage v${version}`);
```

### 🛠️ Architecture Decisions

**_Why Proxy?_**
Choosing Proxy API over standard Class-based approach improves Developer Experience (DX). By intercepting `get` and `set` traps, we eliminate the need for `.getItem()` or `.setItem()` methods, making the storage feel "native" to JavaScript.

**_Type Safety via Generics_**
The library uses TypeScript Generics to map the user-provided interface to the Proxy. This ensures that if a developer tries to assign a `string` to a `number` field, the IDE will catch the error before the code even runs.
