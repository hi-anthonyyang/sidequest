# SIDEQUEST — Major & Career Exploration

Sidequest is a Next.js web application that helps students discover their main and side quests: majors, careers, and campus opportunities that align with their interests and goals.

The experience centers around a short assessment that generates personalized recommendations with the help of OpenAI.

## Features

- Interactive assessment (6 short questions)
- Quests flow
  - Select a university, then begin the assessment
  - Recommendations summarized as “quests” (majors, careers, orgs, events)
- Results page with sections and copy-to-calendar support
- Skill search API endpoint (O*NET skills) used across features
- Sidebar navigation with clear visibility of future features
  - Calendar and Assignments are intentionally greyed out and disabled
  - Direct access to Assignments is blocked by middleware
- Modern, responsive UI

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- OpenAI API
- Headless UI / Heroicons

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
cd sidequest
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

Notes
- The homepage redirects to `/quests` (`src/app/page.tsx`).
- `middleware.ts` blocks access to `/assignments/*` while the feature is in development.

### Maintenance scripts

Common commands added to ease local workflows:

- `npm run clean`: remove Next.js build artifacts (`.next/`)
- `npm run clean:deps`: remove `node_modules/`
- `npm run reset`: remove `.next/` and `node_modules/`, then reinstall with `npm ci`
- `npm run onet:convert`: convert O*NET `.xlsx` files from `src/data/onet/` into JSON under `src/data/onet/json/`
- `npm run onet:dedupe`: generate `public/data/onet/json/{unique_skills,occupation_skills}.json` used by the app

Feature flags
- `FEATURE_ASSIGNMENTS_ENABLED` (server): when `true`, enables `/api/differentiate`; otherwise returns 403
- `NEXT_PUBLIC_FEATURE_CALENDAR_ENABLED` (client): when `true`, renders Calendar UI components

Model configuration (assessment)
- Defaults (overridable via env):
  - `OPENAI_ASSESS_MODEL=gpt-4o-mini`
  - `OPENAI_ASSESS_FALLBACK_MODEL=gpt-4o`

## Project Structure

```
sidequest/
├── public/
│   └── data/onet/json/             # Canonical O*NET datasets (client + server reuse)
├── src/
│   ├── app/
│   │   ├── page.tsx                # Redirects to /quests (homepage)
│   │   ├── quests/                 # Quests landing (main entry)
│   │   ├── questions/              # Assessment flow
│   │   ├── results/                # Results display
│   │   ├── skill-tree/             # Experimental skill tree
│   │   └── api/
│   │       ├── assess/route.ts     # GPT-backed assessment
│   │       ├── differentiate/route.ts  # Assignment differentiation (future)
│   │       ├── majors-count/route.ts   # Reads src/data/majors_count.json
│   │       └── skills/search/route.ts  # O*NET skill search
│   ├── components/                  # UI components (e.g., Sidebar, QuestsTab)
│   ├── lib/                         # Utilities, types, university data helpers
│   └── data/
│       ├── universities/*           # Per-university datasets
│       └── majors_count.json        # App data
├── src/pages/api/careers/*          # Legacy routes (use app router when possible)
├── middleware.ts                    # Blocks /assignments access
└── .env.local                       # Environment variables
```

## Data Files

- O*NET datasets are served from `public/data/onet/json/*` (canonical location) so they are accessible to both client and server code.
- Internal application data (e.g., `majors_count.json`, university datasets) live under `src/data/*`.

This separation keeps the repo root clean and clarifies which data is public versus app-internal.

## API overview

- `POST /api/assess` (App Router): accepts `{ answers, universityId }` and returns recommendations
- `POST /api/differentiate` (App Router): generates assignment variations (feature in progress)
- `GET /api/majors-count` (App Router): returns `{ count }` used by counters
- `POST /api/skills/search` (App Router): skill search over O*NET datasets
- Legacy: `/pages/api/careers/*` retained for backward compatibility and reads from `public/data/onet/json/*`

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

[Your chosen license]