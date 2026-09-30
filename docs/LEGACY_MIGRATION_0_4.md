# Legacy 0.4 Migration

A 0.4 legacy package was produced before the GitHub project existed. Its concepts are being migrated into the Engine 0.1.1 architecture rather than copying the old monolithic HTML wholesale.

## Mapped
- Player walk/attack/hit/death/cast -> Sprite + Animation pipeline.
- Grass/dirt/stone/wood/water -> tile asset families.
- NPCs and monsters -> entity definitions.
- Inventory/equipment/quests/skills -> game data and domain systems.
- Element selection -> elements.json + ElementSystem.
- Save/load -> SaveManager/GameSession abstraction.

## Known asset migration boundary
The first engine commit uses a small original SVG asset set committed under public/assets to make loading deterministic and diagnose the previous invisible-sprite issue. The legacy PNG package remains a reference source; final production PNG/Aseprite atlases will replace the SVG prototypes after their art pass.
