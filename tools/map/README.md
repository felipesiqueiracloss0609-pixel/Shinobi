# Importação OTBM → ShinobiMapChunk

Esta pasta contém ferramentas offline para transformar o OTBM de autoria em dados consumíveis pelo Shinobi no Vale.

## Inspeção

    npm run map:inspect -- "C:\caminho\MAPA1.otbm" "map-inspection.json"

## Exportação para chunks

    npm run map:export -- "C:\caminho\MAPA1.otbm" "data/maps/imported" 64

O resultado terá:

    data/maps/imported/
    ├── manifest.json
    └── <z>/<chunkX>/<chunkY>.json

Cada chunk usa o esquema ShinobiMapChunk-v1 e preserva posição, floor, houseId, tile flags e a lista ordenada de IDs/atributos dos objetos do OTBM.

## Importante

A exportação deliberadamente mantém os IDs de objetos como IDs de origem. A segunda etapa do pipeline fará o cruzamento:

    itemId do OTBM
    → items.otb
    → Tibia.dat
    → sprite(s)
    → assetId do Shinobi no Vale

Somente depois disso o renderer terá uma referência visual própria, independente de Tibia.dat/Tibia.spr.

Os arquivos de cliente fornecidos pelo usuário permanecem como materiais locais de importação/referência e não devem ser colocados no repositório nem no build distribuído.
