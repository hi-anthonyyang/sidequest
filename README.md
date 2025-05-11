# Major & Career Exploration Tool

A Next.js web application that helps students explore majors, careers, and opportunities at [University Name]. The tool uses OpenAI's GPT-4 to provide personalized recommendations based on student interests and goals.

## Features

- Interactive assessment with 5-7 open-ended questions
- Personalized recommendations for:
  - Relevant majors
  - Career paths
  - Student organizations
  - Upcoming events
- Clean, responsive UI with mobile support
- Collapsible sections for easy navigation of results

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- OpenAI GPT-4 API
- Headless UI
- Heroicons

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

## Project Structure

```
sidequest/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── page.tsx           # Landing page
│   │   ├── questions/         # Assessment questions
│   │   └── results/           # Results display
│   ├── components/            # React components
│   ├── lib/                   # Utility functions and types
│   └── data/                  # Static data files
├── public/                    # Static assets
└── .env.local                # Environment variables
```

## Data Files

The application uses the following data files (to be provided):
- Majors and Minors data
- Student Organizations data
- Events data

These files should be placed in the `src/data` directory in JSON format.

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

[Your chosen license]
