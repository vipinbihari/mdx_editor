# MDX Blog Content Manager

A modern, modular web-based MDX blog content manager using Next.js, TypeScript, and TailwindCSS.

## Features

- **Multi-repository support**: Manage MDX blog content across multiple git repositories with ability to add, select, and delete repositories
- **Git integration**: Clone, pull, commit, and push changes via SSH with visual loading indicators
- **Post listing**: View blog posts with pagination, thumbnails, metadata, categories, and featured status indicators with correct timezone handling
- **Post management**: Create, edit, and delete posts with confirmation dialogs and proper feedback
- **MDX editing**: Edit frontmatter metadata and MDX content with direct markdown editing and preview
- **Image management**: Drag-and-drop image replacement for hero and in-blog images, with image zoom preview, logo stamping, and date stamping with customizable formats
- **Image prompt generation**: Generate prompts for both hero images and in-blog images for AI image generation tools
- **Persistent navigation**: Seamless navigation between post list and editor with preserved state
- **Modern UI**: Clean, responsive interface built with TailwindCSS featuring:
  - Full dark/light theme support with automated theme detection
  - Consistent button components with multiple variants (primary, secondary, outline, ghost, danger)
  - Loading states and animations for better user feedback
  - Sleek modals with backdrop blur effects
  - Mobile-optimized responsive design with overflow prevention

## Project Structure

```
mdx_editor/
├── app/                        # Next.js application
│   ├── public/                 # Static files
│   ├── repositories/           # Cloned repositories (git-ignored)
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── contexts/           # React contexts
│   │   ├── hooks/              # React hooks
│   │   ├── lib/                # Library files
│   │   ├── pages/              # Next.js pages and API routes
│   │   │   ├── api/           # Backend API endpoints
│   │   ├── styles/             # CSS styles
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Utility functions
│   ├── .gitignore
│   ├── next.config.js          # Next.js configuration
│   ├── package.json            # Dependencies
│   ├── postcss.config.js       # PostCSS configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── tsconfig.json           # TypeScript configuration
└── README.md                   # Project documentation
```

## Repository Structure Assumptions

The tool expects repositories with the following structure:
- `/posts`: Contains MDX files named by slug
- `/uploads`: Contains image folders named by slug

MDX files are expected to have frontmatter with fields like:
```yaml
---
title: Post Title
slug: post-slug
date: 2023-01-01T00:00:00Z
excerpt: Short description
tags: ["tag1", "tag2"]
category: Category
author: Author Name
featured: false  # Whether the post is featured
heroImage: /images/uploads/post-slug/hero.jpg
---
```

## Setup and Installation

### Prerequisites

- Node.js 18+ and npm/yarn (Node 18+ is required for best compatibility)
- Git (with SSH keys for private repo access)
- Linux server or local machine with persistent storage (for production)
- Git with SSH keys configured for repository access

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/mdx-editor.git
cd mdx-editor/app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file (required for production):
```
REPOS_DIR=/absolute/path/to/repos
```
- This is where your cloned blog repositories will be stored.
- Example: `/var/www/mdx-repos` on a server, or `/Users/yourname/mdx-repos` locally.

4. Start the development server (for local testing):
```bash
npm run dev
# or
yarn dev
```

5. Build and run in production:
```bash
npm run build
npm start
```
- Use a process manager like `pm2` for reliability in production.
- The app will run at `http://localhost:3000` by default.

5. Open [http://localhost:3000](http://localhost:3000) to access the application

## Usage Guide (UI)

### 1. Repository Management
- **Add New Repository**: Enter the SSH URL (e.g., `git@github.com:user/repo.git`) to clone and manage your blog repo.
- **Select Repository**: Use the dropdown (powered by `RepoSelector`) to switch between repos.
- **Pull Latest**: Sync with remote changes.

### 2. Post Management
- **Browse**: Paginated list of posts with images and metadata.
- **Edit**: Click to open in the MDX editor.
- **Delete**: Remove posts (with confirmation).
- **Metadata**: Edit frontmatter (title, date, tags, etc).
- **Content**: Edit markdown/MDX directly, with preview toggle.
- **Images**: Drag-and-drop to replace hero or in-blog images.
- **Save**: Save changes locally.
- **Commit & Push**: Use the Commit button to push all changes to your remote repo (with custom commit message).

### 3. Image Prompt Generation
- Generate AI prompts for hero/in-blog images from the editor UI.

### 4. Troubleshooting
- **Build/Lint Fails**: Run `npm run lint` and fix errors as reported.
- **SSH Issues**: Make sure your server has SSH keys configured for your git host.
- **Permissions**: Ensure `REPOS_DIR` is writable by the app user.
- **File Not Found**: Check that your repo matches the expected structure (`/posts`, `/uploads`).

### 5. Production Deployment
- Use a Linux VPS or server for best results.
- Set `REPOS_DIR` to a persistent, writable location.
- Use `npm run build` then `npm start` (optionally with `pm2`).
- Open your server's IP/domain in a browser to access the app.

## Component Reference

### RepoSelector
- Located at: `src/components/RepoSelector.tsx`
- Props:
  - `repositories: Repository[]` - List of available repos
  - `currentRepo: Repository | null` - Currently selected repo
  - `onSelectRepo: (repo: Repository | null) => void` - Callback for repo selection
  - `loading: boolean` - Loading state
- Features:
  - Dropdown to select repo
  - Add new repo (clone by SSH URL)
  - Pull latest changes
  - Delete repo (with confirmation)

## API Endpoints

- `GET /api/repositories`: List cloned repositories
- `POST /api/repositories/clone`: Clone a new repository
- `POST /api/repositories/pull`: Pull latest changes for a repository
- `POST /api/repositories/delete`: Delete a repository
- `POST /api/repositories/commit`: Commit and push changes
- `GET /api/posts?repoName=<repoName>`: List posts in a repository (with pagination)
- `GET /api/posts/[repoName]/[slug]`: Get a specific post
- `PUT /api/posts/[repoName]/[slug]`: Update a post
- `DELETE /api/posts/[repoName]/[slug]`: Delete a post
- `GET /api/image?repoName=<repoName>&imagePath=<imagePath>`: Get an image
- `POST /api/images/replace`: Replace an image
- `GET /api/system-prompt`: Get the system prompt for hero image generation
- `GET /api/inblog-system-prompt`: Get the system prompt for in-blog image generation

## Development and Extension

### Adding New Features

The codebase is designed to be modular and extensible:

1. **Add new components**: Create files in the components directory
2. **Extend API endpoints**: Add new files in the pages/api directory
3. **Add utility functions**: Extend the utils directory with new helpers

### Future Enhancements

- Markdown linting and formatting
- Image optimization and advanced editing tools
- Collaborative editing
- Multiple user support with authentication
- Custom MDX component previews
- Batch operations for posts
- Enhanced search capabilities

## Build & Lint Status

- **Build:** Clean (`npm run build` passes)
- **Lint:** Clean (`npm run lint` passes)
- **TypeScript:** No `any` or unused variable errors

## License

MIT
