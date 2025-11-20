# AI Studio Application Rules

This document outlines the core technologies and guidelines for developing and maintaining the FireStock PWA application.

## Tech Stack Overview

*   **Frontend Framework**: React (version 19) for building dynamic and interactive user interfaces.
*   **Language**: TypeScript for enhanced code quality, type safety, and improved developer experience.
*   **Styling**: Tailwind CSS for a utility-first approach to styling, enabling rapid and consistent UI development.
*   **Build Tool**: Vite for a fast development server, efficient module bundling, and optimized production builds.
*   **AI Integration**: Google Gemini API, accessed via the `@google/genai` SDK, for advanced AI capabilities such as image recognition and intelligent text analysis.
*   **Icons**: Lucide React for a comprehensive and customizable set of SVG icons.
*   **State Persistence**: Browser's `localStorage` for client-side data storage, ensuring user data persists across sessions.
*   **PWA Capabilities**: Configured as a Progressive Web App, including camera permissions for AI scanning features.

## Library Usage Guidelines

To maintain consistency and efficiency, please adhere to the following rules when developing:

*   **UI Components**:
    *   **Prioritize `shadcn/ui`**: For all new UI elements, leverage components from the `shadcn/ui` library. These components are pre-styled with Tailwind CSS and provide accessibility features.
    *   **Custom Components**: If a specific `shadcn/ui` component does not meet the requirements, create new, small, and focused custom components in `src/components/`, styled exclusively with Tailwind CSS.
*   **Styling**:
    *   **Tailwind CSS Only**: All styling must be implemented using Tailwind CSS classes. Avoid inline styles or separate CSS files unless absolutely necessary for global overrides (e.g., base styles in `index.html`).
*   **Icons**:
    *   **Lucide React**: Use `lucide-react` for all icon needs throughout the application.
*   **AI Services**:
    *   **`@google/genai` SDK**: All interactions with AI models (e.g., image analysis, text generation) must be handled through the `@google/genai` SDK. Encapsulate AI logic within `src/services/geminiService.ts`.
*   **State Management**:
    *   **React Hooks & `localStorage`**: Continue to use React's built-in `useState` and `useEffect` hooks for component-level state and `localStorage` for application-wide persistence. Avoid introducing external state management libraries unless the complexity of the application explicitly demands it.
*   **Routing**:
    *   **React Router**: If more complex navigation and routing are required beyond the current tab-based system, implement it using React Router. All routes should be defined and managed within `src/App.tsx`.
*   **File Structure**:
    *   **New Components**: Always create a new, dedicated file for every new component or hook, no matter how small. Place components in `src/components/` and pages in `src/pages/`.