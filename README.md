# GeoRisk Frontend

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Mapbox GL JS](https://img.shields.io/badge/Mapbox_GL_JS-3-4264FB?logo=mapbox&logoColor=white)

GeoRisk's web frontend, with a marketing landing page at `/` and an interactive analysis screen at `/analise`. The app lets users select an area on the map, send the geometry to the API, and view the returned risk classification, component score breakdown, and technical report.

**Demo:** [geo-risk-front.vercel.app](https://geo-risk-front.vercel.app/)


## What the frontend does

- Search for an address, neighborhood, or coordinates with **Mapbox Geocoder**
- Select a point by clicking on the map
- Generate a circular area from **center + radius**
- Adjust the analysis radius between **100 m and 4000 m**
- Switch between **2D and 3D** map visualization with terrain and buildings
- Use test presets for **Curitiba, Sao Paulo, and Manaus**
- Display **total score**, risk classification, and score breakdown by topography, water, and soil
- Render the technical explanation returned by the API in Markdown
- Support **light and dark mode**

## Project stack

| Category | Technologies |
| --- | --- |
| Framework | Next.js 16, React 18 |
| Language | TypeScript 5 |
| Styling and UI | Tailwind CSS 4, shadcn/ui, Radix UI |
| Mapping | Mapbox GL JS, `@mapbox/mapbox-gl-geocoder`, `@turf/turf` |
| UX | `next-themes`, `react-markdown`, `lucide-react` |
| Observability | `@vercel/analytics` |

## Integration flow

The main map component lives in `components/ui/GeoRiskMap.tsx`. When a user clicks the map, picks a preset, or searches for a location, the frontend:

1. defines a geographic center;
2. generates a circular polygon with `@turf/turf`;
3. sends that GeoJSON to the API;
4. renders the result with score, metrics, and technical report.

The payload sent to the backend follows this shape:

```json
{
  "polygon": {
    "type": "Polygon",
    "coordinates": [[[...]]]
  }
}
```

By default, the frontend calls `POST /geo/risk`.

## Installation

```bash
git clone https://github.com/GuilhermeSerafim/geo-risk-front.git
cd geo-risk-front
npm install
```

## Environment variables

Create a `.env.local` file in the project root. If you prefer, `.env` also works.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Public Mapbox token used to render the map and search |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Base URL for the GeoRisk API, for example `http://localhost:8000` |
| `NEXT_PUBLIC_API_RISK_ENDPOINT` | No | Risk endpoint. If not defined, the frontend uses `/geo/risk` |

Example:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
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

With the development server running, open [http://localhost:3000](http://localhost:3000).

## Main structure

```text
geo-risk-front/
├── app/
│   ├── layout.tsx          # Metadata, global theme, and analytics
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles + Mapbox + Tailwind
│   └── analise/
│       └── page.tsx        # Interactive analysis screen
├── components/
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   └── ui/
│       ├── GeoRiskMap.tsx  # Main map and risk panel
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── lib/
│   ├── api.ts              # API client and polygon generation
│   └── utils.ts
└── public/
    └── demo.gif
```

## Expected backend

The frontend is prepared to integrate with the **GeoRisk API** built with FastAPI. At the moment, the client-side call implemented and used by the analysis screen is:

| Endpoint | Method | Frontend usage |
| --- | --- | --- |
| `/geo/risk` | `POST` | Sends a GeoJSON polygon and receives classification, score, and technical report |

Backend repository: [GuilhermeSerafim/geo-risk](https://github.com/GuilhermeSerafim/geo-risk)

## Notes

- Without `NEXT_PUBLIC_MAPBOX_TOKEN`, the map will not initialize.
- Analysis accuracy depends on the data and coverage configured in the backend.
- The map starts centered on **Curitiba**, but the frontend includes presets for other cities.
