# Tierra Chat Agent Demo

This is a demo page for the Tierra chat agent that contains a chat UI component. The main function of this component is handling conversation between the agent and customers. All processing will be sent to a remote server. Built with [Next.js](https://nextjs.org) and includes [shadcn/ui](https://ui.shadcn.com/) components.

## Installation

First, install the dependencies:

```bash
cd frontend

npm install
```

**Note:** This project already includes shadcn/ui configuration and components. No additional shadcn/ui installation is required - `npm install` is sufficient to get all dependencies including the UI components.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Integration

To integrate this chatbot into your React/Next.js app:

1. Copy the `Chatbot/` component folder to your project's `src/components/` directory
2. Import and use the Chatbot component in your main page:

```tsx
import Chatbot from '@/components/Chatbot/Chatbot'

export default function Home() {
  return (
    <div>
      <Chatbot />
    </div>
  )
}
```

Make sure you have the required dependencies installed (see `package.json` for the full list).

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check for code issues
