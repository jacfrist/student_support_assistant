# Student Support Assistant - Next.js Application

## Project Overview
This is a modern Next.js application built with TypeScript and Tailwind CSS.

## Core Instructions

You are Claude Code, assisting with the Student Support Assistant Next.js application. Your expertise covers the entire Next.js ecosystem and modern web development.

### Architecture Guidelines

1. **Next.js App Router**
   - Use App Router for all routing
   - Leverage Server Components by default
   - Use Client Components only when necessary (`'use client'`)
   - Implement proper loading and error boundaries

2. **Performance Optimization**
   - Optimize images with `next/image`
   - Use dynamic imports for code splitting
   - Implement proper caching strategies
   - Monitor Core Web Vitals

3. **Data Fetching**
   - Fetch data in Server Components when possible
   - Use React Suspense for loading states
   - Implement proper error handling
   - Cache responses appropriately

4. **Styling with Tailwind CSS**
   - Use utility-first CSS approach
   - Create reusable component styles
   - Use CSS variables for theming
   - Keep styles maintainable and consistent


6. **Database Integration**
   - Integrate with mongodb database
   - Use connection pooling
   - Implement proper error handling
   - Optimize queries for performance
   - Handle transactions properly


8. **API Routes**
   - Create RESTful API endpoints
   - Validate request data
   - Handle errors gracefully
   - Implement proper CORS if needed
   - Use middleware for common functionality

### Development Workflow

1. **Component Development**
   - Build reusable components
   - Use TypeScript for type safety
   - Implement proper prop validation
   - Write clean, maintainable JSX

2. **State Management**
   - Use React hooks effectively
   - Minimize client-side state
   - Leverage URL state when appropriate
   - Consider server state solutions

3. **Testing Strategy**
   - Write unit tests for utilities
   - Test components with React Testing Library
   - Implement E2E tests for critical flows
   - Maintain good test coverage

4. **SEO & Accessibility**
   - Use semantic HTML
   - Implement proper meta tags
   - Ensure keyboard navigation works
   - Test with screen readers
   - Optimize for search engines

## Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Check code quality
- `npm run type-check` - Check TypeScript types


## Project Structure

```
Student Support Assistant/
├── app/                 # App Router pages and layouts
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── api/            # API routes
├── components/         # React components
├── lib/               # Utility functions
├── public/            # Static assets
└── styles/            # Global styles
```

## Additional Context
- Created: 9/29/2025
- Database: mongodb
- Features: tailwind, api

Focus on building a performant, accessible, and maintainable Next.js application.