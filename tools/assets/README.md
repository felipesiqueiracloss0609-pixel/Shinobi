# Importação da base Narutibia — Shinobi no Vale

## O que esta etapa faz

O objetivo é trazer a base de mapa e assets para dentro do nosso processo de produção sem tornar o jogo dependente do cliente original.

### Mapa

`MAPA1.otbm` é tratado como **fonte de level design**.

Ele pode ser:
- inspecionado;
- convertido em chunks;
- usado como referência de coordenadas/floors;
- refeito gradualmente com os nossos assets.

### Sprites

`Tibia.spr` pode ser extraído para PNG 32×32 quando a versão estiver dentro do suporte do parser escolhido.

### DAT

`Tibia.dat` pode ser convertido para JSON com o parser compatível quando a versão do client estiver na faixa suportada. Para versões fora dessa faixa, ObjectBuilder Studio e Assets And Map Editor são as ferramentas recomendadas.

### OTB

`items.otb` é usado para enriquecer o significado dos itens do OTBM, especialmente propriedades que não existem completamente no mapa binário.

## Comandos

### Inspeção do pacote

```
npm run assets:inspect -- "C:\ShinobiAuthoring" "source-inspection.json"
```

### Extrair sprites

```
npm run assets:extract-spr -- "C:\ShinobiAuthoring\Tibia.spr" "C:\ShinobiAuthoring\exports\sprites"
```

Para testar somente uma faixa:

```
npm run assets:extract-spr -- "C:\ShinobiAuthoring\Tibia.spr" "C:\ShinobiAuthoring\exports\sprites" 1 5000
```

### Processar o conjunto inteiro

```
npm run assets:import-source-set -- "C:\ShinobiAuthoring" "C:\ShinobiAuthoring\exports"
```

## Arquitetura de produção

```
MAPA1.otbm ───────┐
items.otb ────────┼─> Source Set ─> Map/Asset Intermediate ─> Shinobi Runtime
Tibia.dat ────────┤
Tibia.spr ────────┘
```

Depois:

```
Sprite original
      ↓
referência/extração
      ↓
edição Aseprite / IA
      ↓
sprite nosso
      ↓
assetId Shinobi
      ↓
Phaser
```

A ideia é **não jogar fora a base visual agora**. Vamos primeiro colocá-la em uma camada de referência/editável e, só depois, substituir progressivamente os elementos por arte própria.

## Regra de versionamento

Os arquivos originais do cliente não serão commitados no GitHub nem incluídos no build distribuído.

Podem existir apenas numa pasta local de autoria, por exemplo:

```
ShinobiAuthoring/
├── client-original/
├── map-source/
└── exports/
```

