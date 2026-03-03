# Copilot Workspace Instructions

- Stack: Next.js 14 (App Router, TypeScript, Tailwind CSS), npm, ESLint.
- Use `src/app` with layout/root components; keep imports using `@/*` alias.
- Prefer functional components, server components by default; add `"use client"` only when needed (state/effects/event handlers).
- Keep styling in Tailwind when practical; use `globals.css` for tokens and base styles.
- Navigation: shared navbar/footer components; pages: home, live auctions, marketplace, running bids, seller dashboard, buyer dashboard, product details, auth (signin/signup), static (about/contact/faq/privacy/terms).
- Accessibility: semantic HTML, focus states, aria labels for interactive elements.
- Lint/format: honor ESLint defaults from create-next-app; avoid adding new formatters.
- Do not store secrets in code or config.
