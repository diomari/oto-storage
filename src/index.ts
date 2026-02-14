interface StorageOptions {
  prefix?: string;
  type?: "local" | "session";
}

export function oto<T extends object>(options: StorageOptions = {}): T {
  const { prefix = "", type = "local" } = options;
  const storage =
    typeof window !== "undefined"
      ? type === "session"
        ? window.sessionStorage
        : window.localStorage
      : null;

  const safeStorage: Storage = storage || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    get length() {
      return 0;
    },
  };

  return new Proxy({} as T, {
    get(_target, prop: string) {
      if (prop === "clearAll") {
        return () => {
          const keys: string[] = [];
          for (let i = 0; i < safeStorage.length; i++) {
            const key = safeStorage.key(i);
            if (key) keys.push(key);
          }
          keys.forEach((key) => {
            if (key.startsWith(prefix)) safeStorage.removeItem(key);
          });
        };
      }
      const value = safeStorage.getItem(`${prefix}${prop}`);
      if (value === null) return undefined;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    set(_target, prop: string, value: any) {
      try {
        const stringValue = JSON.stringify(value);
        safeStorage.setItem(`${prefix}${prop}`, stringValue);
        return true;
      } catch (error) {
        console.error(`TypedProxy: Failed to save ${prop}`, error);
        return true;
      }
    },
    has(_target, prop: string) {
      return safeStorage.getItem(`${prefix}${prop}`) !== null;
    },
    deleteProperty(_target, prop: string) {
      const key = `${prefix}${String(prop)}`;
      safeStorage.removeItem(key);
      return true;
    },
  });
}

export const version = "1.0.0";
export type { StorageOptions };
