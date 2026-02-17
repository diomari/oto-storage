# Encryption

Use sync `encrypt` and `decrypt` hooks.

```ts
const keyPrefix = "my-key:";

const storage = oto<{ token: string }>({
  encryption: {
    encrypt: (plainText) => btoa(`${keyPrefix}${plainText}`),
    decrypt: (cipherText) => {
      const decoded = atob(cipherText);
      if (!decoded.startsWith(keyPrefix)) throw new Error("Invalid key");
      return decoded.slice(keyPrefix.length);
    },
    migrate: true,
  },
});
```

`migrate: true` upgrades plain JSON entries to the encrypted wrapper when values are read.

Security warning: `btoa`/`atob` is encoding, not cryptographic encryption. Use a real cipher (for example Web Crypto AES-GCM) for production.

Security note: encryption-at-rest does not protect against active XSS. If malicious code runs in your page, it can still access decrypted data.

Reserved keys note: `__oto_encrypted` and `__oto_payload` are reserved for the encryption envelope. Objects matching that shape will be treated as encrypted wrappers.
