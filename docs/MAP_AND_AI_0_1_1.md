# Map + AI 0.1.1

O mapa passou a ser definido por dados em data/maps, com largura/altura, grid de terreno, colisões e objetos. O renderer converte símbolos de terreno em texturas.

A IA dos monstros usa quatro estados: idle, wander, chase e attack. Ela percebe o jogador a até 7 tiles, tenta aproximar-se sem ocupar o mesmo tile e ataca quando adjacente. É uma base pequena; pathfinding avançado, leash, grupos e perfis de IA entram depois.
