# Ambiente de Autoria do Mapa — Shinobi no Vale

## Ferramenta principal

Usaremos o **Remere's Map Editor (RME)** para autoria de mapa porque ele trabalha diretamente com OTBM e possui uma base madura de edição de floors, brushes, casas, spawn e paleta. A fork OpenTibiaBR está ativa e a versão 4.0 é a release indicada atualmente para o ecossistema Canary/OT. 

## Ferramenta complementar

Para nossa fase de montagem do pacote de assets, o **Assets And Map Editor** é particularmente útil porque reúne DAT, SPR, OTB e OTBM no mesmo aplicativo e oferece brushes XML, autoborder, minimap, ghost floor e operações em lote. Ele é distribuído como aplicativo standalone para Windows/macOS/Linux. O projeto está sob GPLv3, portanto vamos usá-lo como ferramenta externa, não como parte do jogo. 

## Estrutura local recomendada

Não enviar os arquivos do cliente original para GitHub.

Criar uma pasta local somente para autoria:

```
ShinobiAuthoring/
├── client-original/
│   ├── Tibia.dat
│   ├── Tibia.spr
│   ├── Tibia.otfi
│   └── items.otb
├── map-source/
│   ├── MAPA1.otbm
│   ├── MAPA1-house.xml
│   └── MAPA1-spawn.xml
├── shinobi-client/
│   ├── Shinobi.dat
│   ├── Shinobi.spr
│   └── Shinobi.otfi
└── exports/
```

O diretório `shinobi-client/` será criado a partir de assets nossos. O original é apenas a fonte local para abrir/inspecionar o mapa recebido.

## Como colocaremos sprites nossas no editor

O RME normalmente apresenta os objetos por meio dos dados de cliente carregados no perfil. Portanto, PNG solto não é a camada certa para o editor de mapa.

O pipeline será:

**PNG/Aseprite**
→ criação do sprite
→ **ObjectBuilder Studio**
→ objeto + sprite no DAT/SPR de autoria
→ perfil customizado do editor
→ brush/palette
→ **MAPA1.otbm**
→ mapa Shinobi

O ObjectBuilder Studio permite editar objetos/animacões e importar/exportar PNG 32×32 e spritesheets, além de substituir sprites em lote. citeturn592464view2

## O que faremos com o mapa recebido

### Preservar

- coordenadas;
- estrutura X/Y/Z;
- pisos e níveis subterrâneos;
- posição relativa de paredes, caminhos, rios e estruturas;
- casas e outros metadados quando presentes;
- composição espacial útil para criar nossa versão.

### Reconstruir

- terrenos e texturas;
- árvores, rochas, móveis e objetos;
- NPCs;
- monstros;
- efeitos;
- elementos de interface;
- nomes e identidade visual.

Isso nos deixa com um mapa derivado em termos de **layout**, mas com a apresentação visual e o conteúdo semântico próprios do Shinobi no Vale.

## Observação importante sobre o material recebido

`MAPA1-house.xml` declara três casas (IDs 125, 126 e 127), com tamanhos 45, 32 e 20. Os campos de entrada, aluguel e cidade estão zerados no arquivo recebido. fileciteturn411file0L2-L6

`MAPA1-spawn.xml` não contém spawns; está vazio. fileciteturn411file1L1-L2

## Primeiro marco de integração

O repositório já possui:

```
npm run map:inspect -- "CAMINHO\\MAPA1.otbm" "map-inspection.json"

npm run map:export -- "CAMINHO\\MAPA1.otbm" "data/maps/imported" 64
```

Essas ferramentas são o primeiro adaptador entre o OTBM e o nosso formato `ShinobiMapChunk-v1`.

## Por que não vamos usar o OTBM como runtime

O OTBM é excelente como formato de autoria, mas queremos que o cliente do Shinobi carregue somente os dados necessários ao redor do jogador.

O runtime deve receber:

- chunks;
- tiles;
- layers;
- colisão;
- referências a assets internos;
- zonas/interações.

Assim podemos trocar arte e semântica sem reescrever o mapa inteiro.

## Plano de arte

### Tier 1 — Tiles

- grama;
- terra;
- pedra;
- água;
- areia;
- neve;
- madeira;
- telhados;
- paredes;
- pontes;
- bordas.

### Tier 2 — Decoração

- árvores;
- arbustos;
- pedras;
- postes;
- casas;
- bancadas;
- placas;
- baús;
- fogueiras;
- vegetação.

### Tier 3 — Entidades

- protagonista;
- NPCs;
- mobs;
- summons;
- efeitos;
- projéteis.

### Tier 4 — Assets de sistema

- ícones;
- jutsus;
- equipamentos;
- cursor;
- indicadores;
- partículas.

A IA pode acelerar a geração dos rascunhos; Aseprite será nossa etapa de padronização, limpeza, animação e exportação. Aseprite oferece pixel-perfect, tiled mode, spritesheets PNG/JSON e CLI para automatização do pipeline. citeturn186060search4

## IA

Para gerar a base dos assets, o **PixelLab** é interessante porque possui ferramentas específicas para pixel art e até geração de mapas em vista top-down; a documentação atual também permite controlar orientação, detalhes, paleta e seed. citeturn592464view3

Nossa regra será:

**IA gera → humano/automação padroniza → engine valida**

A validação deve garantir:

- grade consistente;
- escala coerente;
- pivô/alinhamento;
- paleta compatível;
- transparência correta;
- frames consistentes;
- nomenclatura;
- colisão/âncoras separadas da arte.

## Resultado esperado

O objetivo não é transformar o Shinobi no Vale em um "cliente Tibia com skin Naruto".

O OTBM será nossa **base de geografia**.

O sistema final será:

**Mapa OTBM**
→ conversão
→ **ShinobiMapChunk**
→ renderer Phaser
→ **assets próprios**
→ regras do Shinobi no Vale.

Isso também permite mudar completamente a arte depois sem perder o trabalho de level design.
