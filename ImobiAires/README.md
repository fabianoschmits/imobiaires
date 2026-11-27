# ImobiAires — pacote de continuidade

**Sua cidade. Seu novo endereço.**

Referência visual escolhida: https://imobiaires.vercel.app/ (versão original, sem shadcn/ui). Projeto Vercel: `imobiaires`. A versão alternativa shadcn não integra este pacote.

## Comece aqui

1. Extraia a pasta `ImobiAires` para seu computador.
2. Abra a pasta inteira no Google Antigravity.
3. Copie o conteúdo de `PROMPT_ANTIGRAVITY.txt` e envie no chat do agente.
4. Confira `documentacao/ESPECIFICACAO.md` para entender os detalhes do projeto.

## Executar o protótipo localmente

Não há npm, build, login, banco ou chave de API necessários para a demonstração. Na pasta `prototipo`, execute:

```bash
python -m http.server 8000
```

No Windows, caso o comando seja `py`, execute `py -m http.server 8000`.
Abra http://localhost:8000/. Não abra o HTML por duplo clique (`file://`), pois os caminhos são relativos à raiz do servidor.

O mapa e a fonte utilizam serviços externos pela internet. A aplicação exibe uma mensagem se a biblioteca Leaflet ou as imagens de satélite não carregarem; o catálogo continua disponível. Em celular, toque em Lista para abrir os imóveis. A licença, a atribuição, a cobertura e as condições de uso dos provedores de mapa precisam ser validadas antes de uso comercial.

## Conteúdo

- `prototipo/`: implementação HTML, CSS e JavaScript com o layout aprovado, marca animada, Leaflet, filtros, comparações e cadastro demonstrativo.
- `dados/imoveis-demo.json`: cópia estruturada dos 12 imóveis e ofertas fictícias. O catálogo também está incorporado no JavaScript para inicialização simples; não é necessário carregar este JSON para executar.
- `documentacao/ESPECIFICACAO.md`: regras de produto, arquitetura, identidade visual e limites.
- `PROMPT_ANTIGRAVITY.txt`: instrução de implementação pronta para copiar.
- `testes/`: relatório e script de validação de navegador.

## Origem e limitações

O pacote foi reconstituído a partir do código da versão original publicado durante a conversa (incluindo as mudanças posteriores de cor e identidade ImobiAires). Não é uma exportação byte a byte do deployment: a consulta aos arquivos hospedados retornava conteúdo truncado e não foi possível baixar os arquivos integralmente pelo ambiente de execução. A marca foi incorporada diretamente no HTML e os estilos foram consolidados; há pequenos ajustes de robustez e um favicon. Nenhuma alteração foi publicada por este pacote.

As imobiliárias, os imóveis, valores, fotos ilustrativas e polígonos são fictícios. Os dados que alguém cadastrou em seu navegador não podem ser recuperados deste pacote. A versão local lê as mesmas chaves de armazenamento `t360-mine`, `t360-offers` e `t360-fav`, mas o armazenamento é isolado por origem (domínio e porta). Não há credenciais nem dados pessoais incluídos.

Para recuperar manualmente seus dados locais, abra o site no navegador em que foram cadastrados, abra as ferramentas de desenvolvedor, entre em Application/Storage > Local Storage e exporte as três chaves acima, se existirem. Não execute scripts desconhecidos. A versão real deverá fazer uma importação validada, se esses dados forem úteis.
