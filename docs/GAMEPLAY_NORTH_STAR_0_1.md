# Shinobi no Vale — Gameplay North Star 0.1

## Fonte principal
Este documento consolida o modelo de gameplay que será usado como referência para o projeto. A base histórica principal é o Manual Básico Naruto Game (2014) fornecido no projeto e a referência atual do Naruto Game. O projeto não replica literalmente o produto; ele usa suas estruturas como inspiração de design e cria uma implementação própria.

## Princípios extraídos das fontes
- Personagem é construído pela combinação de classe, atributos e escolhas estratégicas.
- O sistema de atributos influencia ataque, defesa, dano e requisitos de aprendizado.
- O manual descreve Ninjutsu, Taijutsu, Bukijutsu, Genjutsu, Agilidade, Selo, Força, Energia, Inteligência e Resistência como atributos base; a calculadora atual também expõe Concentração, Convicção, Determinação e Percepção em habilidades/resultados.
- Jutsus possuem requisitos e custo; requisitos podem incluir atributos, graduação, nível e classe.
- O manual descreve três barras de combate: Vida, Chakra e Stamina. A economia entre Chakra e Stamina varia conforme o estilo/classes.
- O combate de referência utiliza precisão, chance de crítico, intervalo/cooldown e duração de efeitos.
- Elementos possuem relações de vantagem/desvantagem; o manual dá o exemplo de Katon > Fuuton e Katon < Suiton, com referência de +/-50% no dano.
- O personagem pode seguir caminhos mutuamente excludentes, como Clã versus Portões; o manual também estabelece que Mode Sennin não pode coexistir com Portões ou Selo Amaldiçoado.
- Invocações são entidades/armas de suporte com requisitos e bônus específicos; certas invocações são pré-requisitos para modos Sennin.
- Progressão inclui graduação, talentos, jutsus, equipamentos, missões, equipes e organizações.

## Decisões de adaptação para Shinobi no Vale
1. Manteremos o limite de até 3 naturezas elementais por personagem como regra de build.
2. Vantagens elementais usarão 1.50x e desvantagens 0.50x como ponto inicial de balanceamento, com tabela de matchup explícita.
3. Clã, Portões e Selo Amaldiçoado formarão famílias de build com exclusões configuráveis; regras exatas serão dados, não hard-code.
4. Mode Sennin exigirá uma Invocação compatível e será incompatível com Portões e Selo Amaldiçoado.
5. Jutsus terão: classe, elemento/tipo, nível, requisitos, custo, dano/efeito, precisão, crítico, cooldown/duração e tags.
6. As habilidades serão divididas em três grupos: base (atributos), especializações (clã/invocação/modo) e técnicas (jutsus).
7. O combate do mapa será em tempo real para preservar a movimentação estilo MMORPG; arenas/duelos podem usar regras turn-based ou action snapshots em etapa posterior.

## Escopo executável imediato
Engine 0.1.1 deverá representar os dados abaixo mesmo que parte da UI ainda seja mínima:
- 10 atributos base.
- recursos Vida/Chakra/Stamina.
- 4 classes iniciais: Taijutsu, Ninjutsu, Genjutsu, Bukijutsu.
- elementos fundamentais: Katon, Suiton, Fuuton, Doton, Raiton; derivados entram depois.
- requisitos de jutsu por level/grade/atributo/classe.
- sistema de caminhos excludentes.
- invocação como escolha de progressão com bônus.
- Mode Sennin e Selo como sistemas de progressão futuros.
- cooldown, precisão e crítico data-driven.

## Fonte histórica vs estado atual
A fonte PDF é um manual de 2014 e descreve um round específico. O site atual está em Round 53 em setembro de 2026. Portanto, valores numéricos históricos não serão assumidos como atuais; o PDF é usado como referência de estrutura e o site atual como confirmação de que a filosofia de combinar classe, clã, invocação e elemento continua presente.