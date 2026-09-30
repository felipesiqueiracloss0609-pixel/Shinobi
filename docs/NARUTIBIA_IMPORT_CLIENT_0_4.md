# Base gráfica real — importação no cliente Windows

A build do Shinobi no Vale pode importar localmente uma base de cliente/mapa contendo:

- MAPA1.otbm
- Tibia.dat
- Tibia.spr
- items.otb
- opcionalmente: Tibia.otfi, MAPA1-house.xml, MAPA1-spawn.xml, items.otbm

Na primeira execução, o BootScene verifica se já existe um pacote importado. Se não existir, pressione F2 e selecione a pasta que contém os arquivos.

O importador cria o pacote em:

    %APPDATA%\\shinobi-no-vale\\base-pack

Ele gera:

- manifesto da base;
- atlas PNG da biblioteca SPR;
- mapa em chunks PNG de 64×64 tiles;
- JSON de colisão/interações por chunk;
- relação server item → client item → sprite;
- perfil técnico da base.

## Atalho automático

Também é possível colocar a pasta:

    base-source

ao lado do `.exe`, contendo os quatro arquivos obrigatórios. O cliente tentará fazer a importação automaticamente no primeiro lançamento.

## Objetivo técnico

O cliente não depende de OTBM/DAT/SPR em runtime. Esses arquivos são fonte de importação. O runtime usa o formato próprio:

    ShinobiBasePack-v1
    ShinobiMapChunk-v1

Isso permite substituir posteriormente sprites, tiles e entidades sem reescrever o level design.

## Observação

A extração foi desenhada para trabalhar com os arquivos fornecidos, mas os binários de origem não são colocados no GitHub nem dentro da build compartilhada. A importação ocorre localmente na máquina que possui esses arquivos.