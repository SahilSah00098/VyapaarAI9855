# Contributing to VyapaarAI 🚀

We welcome contributions from developers, designers, and local business advocates!

## How to Contribute
1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Run Smoke Tests** (`npm test` or `node smoke-test.js`)
4. **Commit Changes** (`git commit -m 'feat: Add Voice command dialect support'`)
5. **Push to Branch** (`git push origin feature/AmazingFeature`)
6. **Open a Pull Request**

## Development Guidelines
- **Offline-First & Zero Friction**: Core features must always work 100% offline without external mandatory dependencies.
- **Privacy & Safety**: Shop data must remain client-side (in `localStorage`). AI calls should be explicitly user-triggered with encrypted or local key storage.
- **Accessibility & Speed**: Ensure high contrast, mobile responsiveness (touch targets >= 44px), and sub-50ms render latency.
- **Pass All Tests**: Always verify `node smoke-test.js` passes before submitting PRs.
