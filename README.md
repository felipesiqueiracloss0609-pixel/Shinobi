# Shinobi no Vale

RPG 2D inspirado na linguagem visual de MMORPGs clássicos e no universo ninja.

## Engine 0.1
Foundation técnica: Phaser 4 + TypeScript + Vite, preparada para futuro client desktop.

## Princípios
- Tiles lógicos 32x32.
- Pixel art com nearest-neighbour.
- Dados separados do código.
- Assets versionados.
- Renderer modular.
- Browser é alvo de desenvolvimento/prototipagem, não o limite arquitetural.

## Estrutura
- src/engine: infraestrutura.
- src/game: regras do jogo.
- src/world: mapas/rendering.
- src/ui: interface.
- assets: arte.
- data: dados.
- docs: especificações.
- tests: validação.

## Comandos
- npm install
- npm run dev
- npm run build
- npm run test
