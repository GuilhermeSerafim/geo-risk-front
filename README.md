# GeoRisk Frontend

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Mapbox GL JS](https://img.shields.io/badge/Mapbox_GL_JS-3-4264FB?logo=mapbox&logoColor=white)

Frontend web do **GeoRisk**, com uma landing page institucional em `/` e uma tela de analise interativa em `/analise`. O app permite selecionar uma area no mapa, enviar a geometria para a API e visualizar classificacao de risco, score por componente e laudo tecnico retornado pelo backend.

**Demo:** [geo-risk-front.vercel.app](https://geo-risk-front.vercel.app/)

## O que o frontend faz

- Busca endereco, bairro ou coordenada com **Mapbox Geocoder**
- Seleciona ponto por clique no mapa
- Gera uma area circular a partir de **centro + raio**
- Permite ajustar o raio entre **100 m e 4000 m**
- Alterna entre visualizacao **2D e 3D** com terreno e edifícios
- Traz presets de teste para **Curitiba, Sao Paulo e Manaus**
- Exibe **score total**, classificacao de risco e breakdown por topografia, agua e solo
- Renderiza em Markdown a explicacao tecnica enviada pela API
- Suporta **tema claro e escuro**

## Stack usada no projeto

| Categoria | Tecnologias |
| --- | --- |
| Framework | Next.js 16, React 18 |
| Linguagem | TypeScript 5 |
| Estilo e UI | Tailwind CSS 4, shadcn/ui, Radix UI |
| Mapa | Mapbox GL JS, `@mapbox/mapbox-gl-geocoder`, `@turf/turf` |
| UX | `next-themes`, `react-markdown`, `lucide-react` |
| Observabilidade | `@vercel/analytics` |

## Fluxo de integracao

O componente principal de mapa fica em `components/ui/GeoRiskMap.tsx`. Quando o usuario clica no mapa, escolhe um preset ou faz uma busca, o frontend:

1. define um centro geográfico;
2. gera um poligono circular com `@turf/turf`;
3. envia esse GeoJSON para a API;
4. renderiza o resultado com score, metricas e laudo.

O payload enviado para o backend segue esta ideia:

```json
{
  "polygon": {
    "type": "Polygon",
    "coordinates": [[[...]]]
  }
}
```

Por padrao, o frontend chama `POST /geo/risk`.

## Instalacao

```bash
git clone https://github.com/GuilhermeSerafim/geo-risk-front.git
cd geo-risk-front
npm install
```

## Variaveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto. Se preferir, `.env` tambem funciona.

| Variavel | Obrigatoria | Descricao |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Sim | Token publico do Mapbox para renderizar o mapa e a busca |
| `NEXT_PUBLIC_API_BASE_URL` | Sim | URL base da API GeoRisk, por exemplo `http://localhost:8000` |
| `NEXT_PUBLIC_API_RISK_ENDPOINT` | Nao | Endpoint de risco. Se nao for definido, o frontend usa `/geo/risk` |

Exemplo:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.seu_token_mapbox
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_RISK_ENDPOINT=/geo/risk
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Com o servidor de desenvolvimento ativo, abra [http://localhost:3000](http://localhost:3000).

## Estrutura principal

```text
geo-risk-front/
├── app/
│   ├── layout.tsx          # Metadata, tema global e analytics
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Estilos globais + Mapbox + Tailwind
│   └── analise/
│       └── page.tsx        # Tela de analise interativa
├── components/
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   └── ui/
│       ├── GeoRiskMap.tsx  # Mapa principal e painel de risco
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── lib/
│   ├── api.ts              # Cliente da API e geracao do poligono
│   └── utils.ts
└── public/
    └── demo.gif
```

## Backend esperado

O frontend foi preparado para integrar com a **GeoRisk API** em FastAPI. Hoje, a chamada implementada no cliente e usada pela tela de analise eh:

| Endpoint | Metodo | Uso no frontend |
| --- | --- | --- |
| `/geo/risk` | `POST` | Envia um poligono GeoJSON e recebe classificacao, score e laudo |

Repositório do backend: [GuilhermeSerafim/geo-risk](https://github.com/GuilhermeSerafim/geo-risk)

## Observacoes

- Sem `NEXT_PUBLIC_MAPBOX_TOKEN`, o mapa nao e inicializado.
- A precisao da analise depende dos dados e da cobertura configurados no backend.
- O centro inicial do mapa fica em **Curitiba**, mas o frontend inclui presets para outras cidades.
