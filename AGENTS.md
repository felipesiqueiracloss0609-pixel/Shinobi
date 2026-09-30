# Shinobi no Vale — Agent Instructions

## Stack
- Phaser 4
- TypeScript
- Vite
- Vitest

## Engenharia
1. Nunca voltar ao modelo monolítico de um único HTML/JS.
2. Separar engine, domínio, world, UI, assets e data.
3. Preferir sistemas data-driven.
4. Centralizar referências de assets em registry.
5. Assets devem possuir metadata e validação.
6. Não usar emojis ou formas geométricas como assets finais.
7. Pixel-perfect e nearest-neighbour.
8. Tile lógico padrão: 32x32.
9. Evitar dependências desnecessárias.
10. Não acoplar regras do jogo ao DOM/localStorage.

## Visual
Direção: linguagem visual de Tibia 8.54/8.6 + Narutibia clássico, com arte própria.

## Workflow
Leia docs/ART_BIBLE_0_4.md e docs/SPRITE_PRODUCTION_SHEET_0_4_A.md antes de alterações gráficas.
Mudanças estruturais devem consultar docs/ARCHITECTURE_0_1.md.
Rode build e testes antes de declarar uma tarefa pronta.
