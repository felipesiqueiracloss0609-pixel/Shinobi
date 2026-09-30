# Development Workflow

1. Game design and system specification are documented before large features.
2. Code lives in TypeScript modules; gameplay values live in JSON.
3. Assets live in the repository and are referenced through the asset manifest.
4. Every feature adds unit tests where deterministic logic is involved.
5. CI runs tests and build on pushes/PRs.
6. Browser runtime is for rapid development; future desktop client reuses the game/domain layers.

## Local
- npm install
- npm run dev

## Production check
- npm run test
- npm run build
