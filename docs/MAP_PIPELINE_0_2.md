# Pipeline de Mapa e Sprites — Shinobi no Vale 0.2

## Objetivo

Usar o mapa OTBM recebido como base espacial de autoria, sem acoplar o jogo final aos formatos proprietários do cliente original.

A ideia é separar três camadas:

1. Fonte de edição: OTBM + RME/DME.
2. Fonte de arte: PNG/Aseprite/atlas próprios; os arquivos Tibia DAT/SPR servem apenas como referência/local de importação.
3. Runtime do jogo: mapas em chunks compactos e assets próprios do Shinobi no Vale.

## Arquivos recebidos

- MAPA1.otbm: mapa binário principal; é o arquivo mais valioso para reaproveitamento da geometria, tiles, posições, andares e objetos.
- items.otb: definições de itens do lado do servidor; precisamos dele para interpretar corretamente atributos e IDs do mapa durante a conversão.
- items.otbm: arquivo adicional de dados de itens; deve ser tratado como material de suporte até confirmarmos sua origem e uso exato no conjunto.
- Tibia.dat: metadados de objetos do cliente.
- Tibia.spr: banco de sprites do cliente.
- Tibia.otfi: configuração e metadata auxiliar usada por ferramentas da família OT para interpretar o par DAT/SPR.
- MAPA1-house.xml: sidecar de casas. O arquivo recebido declara as casas 125, 126 e 127, com tamanhos 45, 32 e 20; os demais campos estão zerados.
- MAPA1-spawn.xml: sidecar de spawn; atualmente está vazio.

## O que vamos reaproveitar

### Reaproveitar diretamente como base

- coordenadas X/Y/Z;
- andares/floors;
- composição de cada tile;
- IDs e quantidade de objetos;
- casas e portas quando estiverem presentes;
- waypoints, towns e destinos de teleporte, quando existirem;
- flags de tile relevantes para regras do mundo.

### Não reaproveitar como dependência do jogo final

- nomes e identidade visual de itens originais;
- sprites originais do Tibia;
- UI original;
- lógica e protocolo do cliente Tibia;
- qualquer arquivo do cliente original dentro do build distribuído do Shinobi no Vale.

O objetivo é reconstruir a apresentação visual e semântica do mundo com arte nossa, mantendo a geometria útil do mapa como ponto de partida.

## Ferramenta de mapa

### RME — ferramenta principal de autoria

O Remere's Map Editor continua sendo a referência mais segura para abrir e editar OTBM. A fork da OpenTibiaBR está ativa e a release v4.0 adicionou suporte a assets de cliente 11+ e melhorias de carregamento e renderização de OTBM.

Uso proposto:

- abrir MAPA1.otbm;
- configurar o conjunto Tibia.dat + Tibia.spr + items.otb + Tibia.otfi;
- localizar as áreas úteis;
- reorganizar o mapa e criar áreas Naruto;
- salvar o OTBM mestre.

### Alternativa: Assets And Map Editor

O projeto DistTopic/assets-and-map-editor é interessante porque junta no mesmo aplicativo edição de DAT/SPR/OTB e OTBM, além de brushes, autoborder e preview de múltiplos floors. Pode ser usado como laboratório complementar.

## Ferramenta de sprites

### Pipeline recomendado

PixelLab → Aseprite → ObjectBuilder Studio → Shinobi no Vale

- PixelLab: geração de base com IA, variações, personagens, tilesets e animações; oferece consistência por referência e geração de ambientes.
- Aseprite: limpeza e acabamento manual em pixel art, animação por frames e exportação de sprite sheets.
- ObjectBuilder Studio: ponte quando precisarmos trabalhar especificamente com DAT/SPR legado, incluindo import/export de PNG 32×32 e edição de objetos e animações.
- Runtime: nossos PNGs e atlases + JSON próprios, sem depender de DAT/SPR.

Para o projeto, IA deve ser acelerador de produção, não a autoridade visual: a arte final precisa passar por padronização de grade, paleta, outline, escala e animação.

## Integração do mapa no engine

O OTBM será o master de autoria, mas não a representação principal do jogo em execução.

Pipeline:

MAPA1.otbm
→ OTBM Importer
→ Map Intermediate
→ 64×64 chunks
→ ShinobiMapChunk-v1
→ Phaser WorldRenderer

Cada tile convertido deverá carregar, no mínimo:

- posição X/Y/Z;
- ground;
- lista ordenada de objetos;
- colisão;
- elevação/altura;
- flags de interação;
- referência ao asset visual nosso;
- dados de zona/área quando aplicável.

O mapa será carregado por chunks ao redor do jogador, em vez de colocar o OTBM inteiro na memória gráfica de uma vez.

## Primeira ferramenta criada no projeto

Foi adicionada a rotina:

npm run map:inspect -- <MAPA.otbm> [saida.json]

Ela lê o OTBM e gera um relatório com:

- versão do OTBM;
- largura e altura;
- item major/minor version;
- quantidade de tiles;
- quantidade de instâncias de itens;
- IDs de itens usados;
- distribuição por floor;
- casas;
- waypoints;
- towns;
- ranking dos IDs mais usados.

A biblioteca do primeiro estágio é @v0rt4c/otbm 0.2.0. Ela lê e escreve OTBM até a versão 3 e expõe tiles, itens, casas, towns e waypoints; o próprio projeto alerta que alguns atributos dependem do items.otb correspondente.

## Próxima etapa prática

1. Rodar o inspector diretamente no MAPA1.otbm recebido.
2. Confirmar a versão e os headers reais do mapa.
3. Gerar o inventário de IDs.
4. Cruzar esses IDs com items.otb e Tibia.dat.
5. Renderizar uma primeira área do mapa com nossos próprios placeholders.
6. Substituir os placeholders por tiles Naruto originais.
7. Criar brushes próprios para RME ou DME.
8. Converter a área inicial para ShinobiMapChunk-v1 e ligá-la ao Phaser.

## Licenciamento e distribuição

Os arquivos Tibia.dat, Tibia.spr e demais client assets originais devem permanecer fora do repositório e fora do pacote distribuído do jogo. Ferramentas modernas desse ecossistema também deixam explícito que os client assets proprietários não são redistribuídos.

### Referências

- RME OpenTibiaBR: https://github.com/opentibiabr/remeres-map-editor
- Assets And Map Editor: https://github.com/DistTopic/assets-and-map-editor
- OTBM parser: https://github.com/V0RT4C/ot-otbm
- ObjectBuilder Studio: https://github.com/NesDevr/objectbuilder-studio
- Aseprite: https://www.aseprite.com/
- PixelLab: https://www.pixellab.ai/
