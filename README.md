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

## Project Structure

```
sidequest/
├── public/
│   └── data/onet/json/             # O*NET JSON datasets (client + server reuse)
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
├── middleware.ts                    # Blocks /assignments access
└── .env.local                       # Environment variables
```

## Data Files

- O*NET datasets are served from `public/data/onet/json/*` so they are accessible to both client and server code.
- Internal application data (e.g., `majors_count.json`, university datasets) live under `src/data/*`.

This separation keeps the repo root clean and clarifies which data is public versus app-internal.

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

[Your chosen license]
