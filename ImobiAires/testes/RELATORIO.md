# Relatório de validação do pacote

## Executado com sucesso
- `node --check prototipo/app.js`: sintaxe JavaScript aprovada.
- Checagem estrutural HTML: IDs únicos; referências literais do JavaScript presentes no HTML ou geradas pelo próprio JS.
- Checagem dos arquivos essenciais e JSON de demonstração: 12 imóveis, 6 terrenos, IDs únicos, áreas e ofertas positivas, três ofertas do T01 e quatro pontos por terreno demonstrativo.

## Não executado até o fim
- Teste Playwright em Chromium: o ambiente bloqueou a navegação local (`net::ERR_BLOCKED_BY_ADMINISTRATOR`), inclusive com interceptação de recursos. Nenhum fluxo de navegador foi considerado aprovado.
- Não foi possível baixar os arquivos completos diretamente do deployment nem verificar a renderização do site online, o mapa, a fonte externa ou as imagens de satélite.

## Repetir no ambiente do Antigravity
Na raiz do pacote, com Python, Playwright e Chromium instalados, execute `python testes/teste_demo.py`. O script exercita os fluxos de catálogo, busca por categoria, preço, ordenação, detalhe, favoritos, comparador, cadastro, oferta, exclusão e mobile usando um stub de Leaflet. Ele não substitui testes com Leaflet real. Abra a referência local também em um navegador conectado à internet e valide visualmente as duas larguras e o mapa real.
