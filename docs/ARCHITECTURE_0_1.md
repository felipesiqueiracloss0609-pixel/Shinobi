# Engine 0.1 — Architecture

## Objetivo
Phaser fornece runtime, rendering e primitives. A camada src/engine contém as convenções do Shinobi no Vale.

## Camadas
1. Platform: Vite/desktop host no futuro.
2. Engine: assets, scenes, map, animation, input, persistence.
3. Domain: entities, combat, inventory, skills, quests.
4. Presentation: world renderer e UI.
5. Data: JSON/configs.

## Portabilidade
O domínio não deve depender diretamente de DOM ou localStorage. Persistência, input e plataforma devem ser abstraídos.

## Renderer
ground -> transition -> decor -> object -> entity -> overhead -> effect -> labels -> UI.
