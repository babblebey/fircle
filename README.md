# Fircle - Family Circle App

A modern family management application built with Next.js, tRPC, Prisma, and PostgreSQL. Features a sophisticated family member system where members can exist independently of user accounts, enabling flexible family content sharing and tagging.

## 🚀 Features

- **Next.js 15** with App Router and TypeScript
- **tRPC** for type-safe API calls
- **Prisma** for database ORM with PostgreSQL
- **Tailwind CSS** for styling
- **React Query** for data fetching and caching
- **Advanced Family Management**: Members can exist without accounts and be claimed later
- **Post System**: Rich content sharing with member tagging
- **Flexible Authentication**: Support for OAuth and traditional login

## 🏗️ Database Architecture

### Core Models
- **Member**: Family member profiles (can exist without accounts)
- **User**: Login accounts (must be linked to a member)
- **Post**: Family content with rich media support
- **PostMember**: Junction table for post-member tagging

### Key Relationships
- Member ↔ User (Optional one-to-one)
- User → Posts (One-to-many, user authors posts)
- Member ↔ Posts (Many-to-many via PostMember, members get tagged)

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed documentation.

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: tRPC, Prisma
- **Database**: PostgreSQL
- **Dev Tools**: ESLint, TypeScript

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18+ 
- npm or yarn
- PostgreSQL database

## 🚀 Getting Started

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd fircle
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database for the project
2. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```
3. Update the `DATABASE_URL` in `.env` with your PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/fircle_db?schema=public"
   ```

### 3. Database Migration

Generate Prisma client and push the schema to your database:

```bash
npm run db:generate
npm run db:push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/trpc/          # tRPC API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── providers/         # Context providers
│   ├── member-list.tsx    # Member management
│   ├── add-member-form.tsx # Add new members
│   ├── post-list.tsx      # Post display
│   └── [legacy components] # Backward compatibility
├── lib/                   # Utility libraries
│   ├── api.ts            # tRPC React client
│   ├── db.ts             # Prisma client
│   └── trpc.ts           # tRPC configuration
└── server/               # Server-side code
    └── api/              # tRPC routers
        ├── routers/      # Individual route handlers
        │   ├── member.ts # Member management
        │   ├── user.ts   # User management
        │   ├── post.ts   # Post management
        │   └── familyMember.ts # Legacy support
        ├── root.ts       # Main router
        └── trpc.ts       # tRPC setup
```

## 🎯 API Endpoints

### Member Management
- `member.getAll` - Get all family members
- `member.getUnclaimed` - Get members without accounts
- `member.create` - Add new family member
- `member.update` - Update member info
- `member.delete` - Remove member

### User Management  
- `user.getAll` - Get all user accounts
- `user.claimMember` - Link user to existing member
- `user.create` - Create new user account
- `user.getByEmail` - Find user by email

### Post System
- `post.getAll` - Get all family posts
- `post.getByTaggedMember` - Get posts where member is tagged
- `post.create` - Create post with member tags
- `post.update` - Update post and tags

## 📊 Database Schema

### Member Model
```typescript
{
  id: string
  name: string
  email?: string        // Optional - can exist without account
  birthDate?: Date
  avatar?: string
  bio?: string
  user?: User          // Optional relationship
  taggedIn: PostMember[] // Posts where tagged
}
```

### User Model  
```typescript
{
  id: string
  email: string
  username?: string
  memberId: string     // Required - must link to member
  member: Member
  posts: Post[]        // Authored posts
}
```

### Post Model
```typescript
{
  id: string
  title?: string
  content: string
  imageUrls: string[]
  videoUrls: string[]
  isPublic: boolean
  author: User
  taggedMembers: Member[] // Via PostMember junction
}
```

## 🌟 Use Cases

### 1. Unclaimed Member Workflow
1. Add family members to the system (like "Grandma Rose")
2. Tag them in posts and family updates
3. When they join, they claim their existing profile
4. They can see all historical content where they were tagged

### 2. Family Content Sharing
- Users create posts with rich content (text, images, videos)
- Tag relevant family members in posts
- Members receive notifications if they have accounts
- Content remains organized by family relationships

### 3. Flexible Account Management
- Members exist independently of user accounts
- Multiple registration paths: direct signup or claiming existing profiles
- Supports OAuth providers (Google, Facebook, etc.)
- Maintains family relationships regardless of account status

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio

## 🌐 Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/fircle_db?schema=public"

# Next.js
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment
1. Build the application: `npm run build`
2. Start the server: `npm run start`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- tRPC team for type-safe APIs
- Prisma team for the excellent ORM
- Tailwind CSS for utility-first styling