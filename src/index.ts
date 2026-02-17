interface StorageOptions {
  prefix?: string;
  type?: "local" | "session";
  defaults?: Record<string, any>;
  ttl?: number;
  encryption?: StorageEncryptionOptions;
}

interface StorageEncryptionOptions {
  encrypt: (plainText: string) => string;
  decrypt: (cipherText: string) => string;
  migrate?: boolean;
}

interface EncryptedWrapper {
  __oto_encrypted: true;
  __oto_payload: string;
}

interface ReadStoredResult {
  value: any;
  rawParsed?: any;
  parseError: boolean;
  decryptionError: boolean;
  expired: boolean;
  wasEncrypted: boolean;
}

function deepMerge(target: any, source: any): any {
  if (source === null || source === undefined) return target;
  if (target === null || target === undefined) return source;
  if (typeof target !== "object" || typeof source !== "object") return source;
  if (Array.isArray(target) || Array.isArray(source)) return source;

  const result = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      result[key] = deepMerge(target[key], source[key]);
    }
  }
  return result;
}

function wrapWithTTL(value: any, ttl: number): any {
  return {
    __oto_value: value,
    __oto_expires: Date.now() + ttl,
  };
}

function unwrapWithTTL(wrapped: any): { value: any; expired: boolean } {
  // Only treat as TTL wrapper if both sentinel keys are present and __oto_expires is a number
  if (
    wrapped &&
    typeof wrapped === "object" &&
    "__oto_expires" in wrapped &&
    "__oto_value" in wrapped &&
    typeof wrapped.__oto_expires === "number"
  ) {
    const expired = Date.now() > wrapped.__oto_expires;
    return { value: wrapped.__oto_value, expired };
  }
  return { value: wrapped, expired: false };
}

function isEncryptedWrapper(value: any): value is EncryptedWrapper {
  return (
    value &&
    typeof value === "object" &&
    value.__oto_encrypted === true &&
    typeof value.__oto_payload === "string"
  );
}

function serializeForStorage(
  value: any,
  ttl?: number,
  encryption?: StorageEncryptionOptions,
): string {
  let valueToStore = value;
  if (ttl && ttl > 0) {
    valueToStore = wrapWithTTL(valueToStore, ttl);
  }

  if (!encryption) {
    return JSON.stringify(valueToStore);
  }

  const plainText = JSON.stringify(valueToStore);
  const cipherText = encryption.encrypt(plainText);
  return JSON.stringify({
    __oto_encrypted: true,
    __oto_payload: cipherText,
  } as EncryptedWrapper);
}

function migrateStoredValueToEncrypted(
  safeStorage: Storage,
  fullKey: string,
  rawParsed: any,
  encryption?: StorageEncryptionOptions,
): void {
  if (!encryption?.migrate || isEncryptedWrapper(rawParsed)) {
    return;
  }

  try {
    const cipherText = encryption.encrypt(JSON.stringify(rawParsed));
    const wrapped: EncryptedWrapper = {
      __oto_encrypted: true,
      __oto_payload: cipherText,
    };
    safeStorage.setItem(fullKey, JSON.stringify(wrapped));
  } catch (error) {
    console.error(`TypedProxy: Failed to migrate ${fullKey} to encrypted format`, error);
  }
}

function readStoredValue(
  storedValue: string,
  ttl?: number,
  encryption?: StorageEncryptionOptions,
): ReadStoredResult {
  let parsed: any;
  try {
    parsed = JSON.parse(storedValue);
  } catch {
    return {
      value: storedValue,
      parseError: true,
      decryptionError: false,
      expired: false,
      wasEncrypted: false,
    };
  }

  let payload = parsed;
  let wasEncrypted = false;

  if (encryption && isEncryptedWrapper(parsed)) {
    wasEncrypted = true;
    try {
      const plainText = encryption.decrypt(parsed.__oto_payload);
      payload = JSON.parse(plainText);
    } catch {
      return {
        value: undefined,
        rawParsed: parsed,
        parseError: false,
        decryptionError: true,
        expired: false,
        wasEncrypted,
      };
    }
  }

  if (ttl && ttl > 0) {
    const unwrapped = unwrapWithTTL(payload);
    if (unwrapped.expired) {
      return {
        value: undefined,
        rawParsed: parsed,
        parseError: false,
        decryptionError: false,
        expired: true,
        wasEncrypted,
      };
    }
    payload = unwrapped.value;
  }

  return {
    value: payload,
    rawParsed: parsed,
    parseError: false,
    decryptionError: false,
    expired: false,
    wasEncrypted,
  };
}

function getValueAtPath(
  safeStorage: Storage,
  prefix: string,
  rootKey: string,
  path: string[] = [],
  ttl?: number,
  encryption?: StorageEncryptionOptions,
): any {
  const fullKey = `${prefix}${rootKey}`;
  const storedValue = safeStorage.getItem(fullKey);
  if (storedValue === null) return undefined;

  const readResult = readStoredValue(storedValue, ttl, encryption);
  if (readResult.expired || readResult.decryptionError) {
    safeStorage.removeItem(fullKey);
    return undefined;
  }

  if (
    encryption?.migrate &&
    !readResult.parseError &&
    !readResult.wasEncrypted &&
    readResult.rawParsed !== undefined
  ) {
    migrateStoredValueToEncrypted(safeStorage, fullKey, readResult.rawParsed, encryption);
  }

  let current = readResult.value;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

function createNestedProxy(
  safeStorage: Storage,
  prefix: string,
  rootKey: string,
  path: string[] = [],
  defaultsAtRoot?: any,
  ttl?: number,
  encryption?: StorageEncryptionOptions,
): any {
  return new Proxy({} as any, {
    get(_target, prop: string | symbol) {
      if (typeof prop === "symbol") {
        return (getValueAtPath(safeStorage, prefix, rootKey, path, ttl, encryption) as any)?.[
          prop
        ];
      }

      const current = getValueAtPath(
        safeStorage,
        prefix,
        rootKey,
        path,
        ttl,
        encryption,
      );
      
      // Get defaults at this path level
      let defaultsAtPath: any;
      if (defaultsAtRoot !== undefined) {
        defaultsAtPath = defaultsAtRoot;
        for (const key of path) {
          if (defaultsAtPath && typeof defaultsAtPath === "object") {
            defaultsAtPath = defaultsAtPath[key];
          } else {
            defaultsAtPath = undefined;
            break;
          }
        }
      }

      // If no stored value and no defaults, return undefined
      if ((current === null || current === undefined) && !defaultsAtPath) {
        return undefined;
      }

      let value = current?.[prop];

      // Apply defaults at this path level
      if (defaultsAtPath && defaultsAtPath[prop] !== undefined) {
        value = deepMerge(defaultsAtPath[prop], value);
      }

      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        return createNestedProxy(
          safeStorage,
          prefix,
          rootKey,
          [...path, prop],
          defaultsAtRoot,
          ttl,
          encryption,
        );
      }
      return value;
    },
    set(_target, prop: string, value: any) {
      const fullKey = `${prefix}${rootKey}`;
      const storedValue = safeStorage.getItem(fullKey);
      let rootObj: any = {};

      if (storedValue !== null) {
        const readResult = readStoredValue(storedValue, ttl, encryption);
        if (readResult.expired || readResult.decryptionError) {
          safeStorage.removeItem(fullKey);
          rootObj = {};
        } else {
          if (
            encryption?.migrate &&
            !readResult.parseError &&
            !readResult.wasEncrypted &&
            readResult.rawParsed !== undefined
          ) {
            migrateStoredValueToEncrypted(
              safeStorage,
              fullKey,
              readResult.rawParsed,
              encryption,
            );
          }
          rootObj = readResult.value;
        }
      }

      if (rootObj === null || typeof rootObj !== "object" || Array.isArray(rootObj)) {
        rootObj = {};
      }

      let current = rootObj;
      for (const key of path) {
        if (current[key] === null || typeof current[key] !== "object") {
          current[key] = {};
        }
        current = current[key];
      }
      current[prop] = value;

      try {
        safeStorage.setItem(fullKey, serializeForStorage(rootObj, ttl, encryption));
        return true;
      } catch (error) {
        console.error(`TypedProxy: Failed to save ${rootKey}`, error);
        return true;
      }
    },
    ownKeys() {
      const current = getValueAtPath(
        safeStorage,
        prefix,
        rootKey,
        path,
        ttl,
        encryption,
      );
      const keys = current ? Object.keys(current) : [];
      
      // Include keys from defaults at this path
      if (defaultsAtRoot !== undefined) {
        let defaultsAtPath = defaultsAtRoot;
        for (const key of path) {
          if (defaultsAtPath && typeof defaultsAtPath === "object") {
            defaultsAtPath = defaultsAtPath[key];
          } else {
            defaultsAtPath = undefined;
            break;
          }
        }
        if (defaultsAtPath && typeof defaultsAtPath === "object") {
          const defaultKeys = Object.keys(defaultsAtPath);
          for (const key of defaultKeys) {
            if (!keys.includes(key)) {
              keys.push(key);
            }
          }
        }
      }
      
      return keys;
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      if (typeof prop === "symbol") return undefined;
      const current = getValueAtPath(
        safeStorage,
        prefix,
        rootKey,
        path,
        ttl,
        encryption,
      );
      
      // Get defaults at this path level
      let defaultsAtPath: any;
      if (defaultsAtRoot !== undefined) {
        defaultsAtPath = defaultsAtRoot;
        for (const key of path) {
          if (defaultsAtPath && typeof defaultsAtPath === "object") {
            defaultsAtPath = defaultsAtPath[key];
          } else {
            defaultsAtPath = undefined;
            break;
          }
        }
      }
      
      // Check if property exists in stored value or defaults
      const inCurrent = current && typeof current === "object" && prop in current;
      const inDefaults = defaultsAtPath && typeof defaultsAtPath === "object" && prop in defaultsAtPath;
      
      if (!inCurrent && !inDefaults) return undefined;
      
      let value = current?.[prop];

      // Apply defaults at this path level
      if (defaultsAtPath && defaultsAtPath[prop] !== undefined) {
        value = deepMerge(defaultsAtPath[prop], value);
      }

      const descriptorValue =
        value !== null && typeof value === "object" && !Array.isArray(value)
          ? createNestedProxy(
              safeStorage,
              prefix,
              rootKey,
              [...path, prop],
              defaultsAtRoot,
              ttl,
              encryption,
            )
          : value;
      return {
        value: descriptorValue,
        writable: true,
        enumerable: true,
        configurable: true,
      };
    },
    has(_target, prop: string | symbol) {
      if (typeof prop === "symbol") return false;
      const current = getValueAtPath(
        safeStorage,
        prefix,
        rootKey,
        path,
        ttl,
        encryption,
      );
      
      // Check if property exists in stored value
      if (current && typeof current === "object" && prop in current) {
        return true;
      }
      
      // Check if property exists in defaults at this path
      if (defaultsAtRoot !== undefined) {
        let defaultsAtPath = defaultsAtRoot;
        for (const key of path) {
          if (defaultsAtPath && typeof defaultsAtPath === "object") {
            defaultsAtPath = defaultsAtPath[key];
          } else {
            defaultsAtPath = undefined;
            break;
          }
        }
        if (defaultsAtPath && typeof defaultsAtPath === "object" && prop in defaultsAtPath) {
          return true;
        }
      }
      
      return false;
    },
  });
}

export function oto<T extends object>(options: StorageOptions = {}): T {
  const { prefix = "", type = "local", defaults = {}, ttl, encryption } = options;
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
      const fullKey = `${prefix}${prop}`;
      const storedValue = safeStorage.getItem(fullKey);
      let parsed: any;

      if (storedValue === null) {
        parsed = undefined;
      } else {
        const readResult = readStoredValue(storedValue, ttl, encryption);
        if (readResult.expired || readResult.decryptionError) {
          safeStorage.removeItem(fullKey);
          parsed = undefined;
        } else {
          if (
            encryption?.migrate &&
            !readResult.parseError &&
            !readResult.wasEncrypted &&
            readResult.rawParsed !== undefined
          ) {
            migrateStoredValueToEncrypted(
              safeStorage,
              fullKey,
              readResult.rawParsed,
              encryption,
            );
          }
          parsed = readResult.value;
        }
      }

      // Apply defaults
      if (defaults && defaults[prop] !== undefined) {
        parsed = deepMerge(defaults[prop], parsed);
      }

      if (parsed === undefined) return undefined;

      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return createNestedProxy(
          safeStorage,
          prefix,
          prop,
          [],
          defaults[prop],
          ttl,
          encryption,
        );
      }
      return parsed;
    },
    set(_target, prop: string, value: any) {
      try {
        safeStorage.setItem(`${prefix}${prop}`, serializeForStorage(value, ttl, encryption));
        return true;
      } catch (error) {
        console.error(`TypedProxy: Failed to save ${prop}`, error);
        return true;
      }
    },
    has(_target, prop: string) {
      // Check if key exists in storage
      if (safeStorage.getItem(`${prefix}${prop}`) !== null) {
        return true;
      }
      // Check if key exists in defaults
      if (defaults && prop in defaults) {
        return true;
      }
      return false;
    },
    deleteProperty(_target, prop: string) {
      const key = `${prefix}${String(prop)}`;
      safeStorage.removeItem(key);
      return true;
    },
  });
}

export const version = "0.4.0";
export type { StorageOptions, StorageEncryptionOptions };
