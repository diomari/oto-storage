# FAQ

## Does this work in SSR?

Yes. In non-browser environments, operations are no-op safe.

## Does encryption protect against XSS?

No. It protects storage at rest only. If malicious code executes in your app, it can still access data.

## How does `in` behave?

`"key" in storage` returns `true` for defaults and readable stored values. Expired or unreadable encrypted values are treated as non-existent.

## Can I migrate existing plain JSON values?

Yes. Enable `encryption.migrate: true` to upgrade plain values on read.
