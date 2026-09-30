# Desktop — Windows

O cliente web Phaser é empacotado com Electron para gerar um executável Windows portátil.

## Local

```bash
npm install
npm run desktop:build
```

Saída esperada:

```
release/Shinobi-no-Vale-0.1.1-portable.exe
```

## CI

A pipeline `.github/workflows/build-windows.yml` executa em `windows-latest`, instala dependências, roda os testes, gera a build Vite e empacota o portable EXE.

O executável é um pacote Electron portátil e, nesta etapa, não é assinado digitalmente.

## Arquitetura

Electron carrega o build estático `dist/index.html` com `loadFile`. O renderer continua sendo o cliente Phaser existente; não existe dependência de Node no renderer.

O mapa e os assets originais fornecidos para estudo não fazem parte do pacote do cliente.
