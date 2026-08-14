# Next.js + Drizzle + Better Auth + Biome Template

A modern, production-ready Next.js template with authentication, database integration, and best practices built-in.

## 🚀 Features

- **Next.js 15** with App Router and TypeScript
- **Better Auth** for authentication (email/password + Google OAuth)
- **Drizzle ORM** with PostgreSQL support
- **Biome** for lightning-fast linting and formatting
- **Tailwind CSS** with shadcn/ui components
- **Dark/Light theme** support
- **Email** integration with Resend
- **File uploads** with UploadThing
- **Rate limiting** and security headers
- **Environment validation** with Zod
- **Pre-commit hooks** with Husky and lint-staged
- **Spell checking** with cspell
- **GitHub Actions** for CI/CD

## 🛠️ Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd your-project-name
pnpm install
```

### 2. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `BETTER_AUTH_SECRET` - 32+ character secret key
- `RESEND_API_KEY` - For email functionality
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - For Google OAuth
- `UPLOADTHING_TOKEN` - For file uploads

### 3. Database Setup

```bash
# Generate and run migrations
pnpm db:generate
pnpm db:migrate

# Or push schema directly (development)
pnpm db:push

# Open Drizzle Studio to inspect your database
pnpm db:studio
```

### 4. Start Development

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

## 📚 Available Scripts

### Development
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server

### Code Quality
- `pnpm lint` - Run Biome linter with auto-fix
- `pnpm format` - Format code with Biome
- `pnpm check` - Run all Biome checks
- `pnpm spell` - Check spelling in source files

### Database
- `pnpm db:generate` - Generate migrations from schema
- `pnpm db:migrate` - Apply migrations to database
- `pnpm db:push` - Push schema changes directly
- `pnpm db:studio` - Open Drizzle Studio

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth-related pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── providers.tsx      # App providers
├── components/            # Reusable components
│   ├── auth/             # Auth-specific components
│   └── ui/               # shadcn/ui components
├── db/                   # Database configuration
│   ├── migrations/       # Database migrations
│   ├── schema/          # Database schema
│   └── index.ts         # Database connection
└── lib/                 # Utility functions
    ├── auth.ts          # Better Auth configuration
    ├── auth-client.ts   # Client-side auth utilities
    ├── config.ts        # App configuration
    ├── email.ts         # Email utilities
    ├── env.ts           # Environment validation
    ├── rate-limit.ts    # Rate limiting utilities
    └── utils.ts         # General utilities
```

## 🔐 Authentication

This template uses [Better Auth](https://better-auth.com) with the following features:

- **Email/Password** authentication with verification
- **Google OAuth** integration
- **Password reset** functionality
- **Account deletion** with admin protection
- **Session management** with cookie caching
- **Rate limiting** on auth endpoints

## 🗄️ Database

- **Drizzle ORM** with PostgreSQL
- **Type-safe** database queries
- **Automatic migrations** generation
- **Snake case** column naming
- **Connection pooling** configured

## 🎨 UI Components

- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Radix UI** primitives
- **Dark/Light theme** toggle
- **Responsive design** patterns

## 🔒 Security Features

- **Content Security Policy** headers
- **Rate limiting** on API routes
- **Environment variable** validation
- **SQL injection** protection with Drizzle
- **XSS protection** with proper escaping

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

This template works with any platform that supports Node.js:
- Railway
- Render
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Run `pnpm check` to ensure code quality
5. Commit using conventional commits
6. Push to your fork and create a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- Check the [CLAUDE.md](CLAUDE.md) file for development guidance
- Open an issue for bugs or feature requests
- Refer to the official documentation of used technologies

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Better Auth Documentation](https://better-auth.com)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Biome Documentation](https://biomejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [shadcn/ui Documentation](https://ui.shadcn.com)
