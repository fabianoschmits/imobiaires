# Especificação — ImobiAires, versão inicial

## Produto

Portal local de imóveis, inicialmente focado em Venâncio Aires – RS. O cliente explora a cidade pelo mapa satélite e vê os imóveis anunciados por imobiliárias. A plataforma não identifica automaticamente terrenos vazios. Localização, área, dimensões, descrição, fotos e preços vêm dos anunciantes, ou são inseridos pelo administrador em seu nome.

## Identidade e layout

| Elemento | Definição |
| --- | --- |
| Nome | ImobiAires (marca em minúsculas: imobiaires) |
| Slogan | Sua cidade. Seu novo endereço. |
| URL de referência | https://imobiaires.vercel.app |
| Domínio comercial pretendido | imobiaires.com.br — não confirmado nem registrado |
| Fonte | Inter (400–800), fallback system-ui |
| Marca escura | #17243B |
| Marca azul | #2563EB |
| Cor principal | #1D4ED8 / #2255D4 |
| Fundo | #F6F8FB |
| Texto secundário | #65738A |
| Borda | #E1E7EF |
| Marcador padrão | rgba(255,255,255,.85), raio 7px, texto #142947, blur 9px |
| Marcador selecionado | rgba(27,77,200,.94), texto branco |
| Cabeçalho desktop | 74px, barra de filtros 69px |
| Desktop | Mapa à esquerda, painel de 425px à direita; 480px em telas grandes |
| Celular | Mapa como tela principal, painel inferior de lista/detalhe, breakpoint 760px |
| Movimento | Fade/translateY 5px na marca, atraso curto, brilho pontual no ícone; reduced-motion |

## Estrutura do protótipo

- `index.html`: estrutura semântica, filtros, diálogos, cabeçalho, mapa, painel e cadastro.
- `base.css`: layout estrutural, cards, formulários, responsividade.
- `style.css`: tema azul, transparências, fonte, animação e ajustes pequenos.
- `app.js`: seed, armazenamento local, controles de mapa, filtros, renderização, cadastro, favoritos e comparadores.
- `favicon.svg`: marca vetorial simplificada.
- `vercel.json`: configuração estática e noindex do ambiente de demonstração.

O protótipo não utiliza shadcn, Tailwind ou frameworks JS. Não é o projeto alternativo `imobiaires-shadcn`.

## Dados de exemplo

12 imóveis fictícios: 6 terrenos, 4 casas, 1 apartamento, 1 comercial. Três nomes fictícios de imobiliárias. A casa C08 é aluguel; os demais exemplos são venda. T01 possui 450 m², frente 15 m e profundidade 30 m, com ofertas de R$ 149.900, R$ 160.000 e R$ 165.000. Os polígonos são retângulos ilustrativos, não limites oficiais. Os pontos apenas situam os exemplos pela cidade.

## Fluxo cliente

1. Entrar direto no mapa. Alternar satélite/ruas, navegar e ampliar.
2. Buscar ou aplicar filtros. O painel lista os imóveis na área visível se a opção estiver ativa.
3. Abrir imóvel pelo card ou marcador. Ver ficha e ofertas ordenadas pelo menor preço.
4. Salvar ou adicionar à comparação; comparar 2–3 imóveis, compartilhar referência ou copiar mensagem de contato. Não misturar preços de venda e locação como se fossem equivalentes.

## Fluxo anunciante

1. Área da imobiliária > cadastrar imóvel ou acrescentar oferta em imóvel existente.
2. Informar título, tipo, negociação, bairro, preço, área, dimensões opcionais, quartos, descrição e foto.
3. Marcar localização; opcionalmente registrar limite usando pontos próprios/autorizados (um ponto = posição, três ou mais = polígono). O mapa não calcula automaticamente a área real nem confirma os limites.
4. Salvar e ver o anúncio. No demo, os dados ficam no navegador e é possível excluir os próprios cadastros.
5. Na versão real, autenticação mínima e autorização por imobiliária, publicação controlada e armazenamento compartilhado. Nenhuma imobiliária pode editar oferta de outra. Admin valida vínculos de imóveis para evitar agrupamento indevido.

## Modelo de dados sugerido para etapa real (não implementado)

| Entidade | Campos mínimos |
| --- | --- |
| agencies | id, name, slug, contact autorizado, status, created_at |
| agency_members | agency_id, user_id, role |
| properties | id, title, type, district, city, state, lat, lng, boundary opcional, area_m2, front_m, depth_m, bedrooms, description, status |
| offers | id, property_id, agency_id, deal_type, price_cents, status, timestamps |
| property_photos | id, property_id, agency_id, storage_path, position, visibilidade |
| favorites | user_id, property_id (opcional; localStorage atende o primeiro demo) |

Regra: comparar ofertas da mesma modalidade de negociação; não usar preço de aluguel para definir menor preço de venda. As permissões de atualização dos dados centrais devem ser controladas pelo proprietário autorizado do registro ou admin. Fotos e dados compartilhados exigem autorização. RLS e storage policies na etapa real; não confiar no cliente para autorizar operações.

## Serviços de mapa

- Leaflet 1.9.4: biblioteca de visualização.
- Esri World Imagery: camada satélite de demonstração, com atribuição.
- OpenStreetMap: camada de ruas de demonstração, com atribuição.
- Nenhuma chave incluída. Antes de uso comercial, verificar termos/licenciamento, capacidade, cobrança, requisitos de atribuição e escolher provedor adequado. Não raspar ou cachear tiles fora dos termos. Não deduzir limites cadastrais pela imagem.

## Fora do escopo inicial

IA, identificação automática de terrenos, banco cadastral municipal, avaliação automática, pagamentos, mensalidades, CRM, tours 3D, chat, notificações, integração de portais, anúncios reais automáticos e redesign. Primeiro validar a base.
