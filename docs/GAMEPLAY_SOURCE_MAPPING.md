# Gameplay Source Mapping 0.1.1

## PDF manual 2014
A progressão apresentada no manual é mais ampla que um simples sistema de níveis: tarefas levam o jogador a treinar atributos; pontos distribuídos influenciam fórmulas e requisitos; jutsus têm requisitos de atributos, graduação, nível e classe e possuem custos; graduações desbloqueiam mapa; talentos são uma árvore; clãs e portões são caminhos mutuamente excludentes; invocações têm atributos/requisitos; Mode Sennin requer invocação compatível e não combina com Portões/Selo; elementos possuem vantagem/desvantagem; Kinjutsus e jutsus medicinais dependem de modos de batalha/equipe.

## Modelo atual do projeto
- attributes.json → atributos base e recursos.
- classes.json → quatro estilos iniciais.
- elements.json → máximo 3 naturezas e matchups.
- specializations.json → exclusões.
- invocations.json → árvores de invocação.
- sage_modes.json → três famílias de Mode Sennin.
- cursed_seals.json → famílias de selo.
- talents.json → árvore de talentos.
- jutsus_demo.json → schema de jutsu para protótipo.
- progression.json → graus e slots de aprimoramento.

## Regra de implementação
Nenhum desses sistemas deverá ser hard-coded em Scene. As Scenes só orquestram sistemas; dados vivem em JSON; regras puras vivem em src/game; apresentação vive em src/engine/render e src/ui.
