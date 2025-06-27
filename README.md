# MDX Blog Content Manager

A modern, modular web-based MDX blog content manager using Next.js, TypeScript, and TailwindCSS.

## Features

- **Multi-repository support**: Manage MDX blog content across multiple git repositories with ability to add, select, and delete repositories
- **Git integration**: Clone, pull, commit, and push changes via SSH with visual loading indicators
- **Post listing**: View blog posts with pagination, thumbnails, and metadata with correct timezone handling
- **Post management**: Create, edit, and delete posts with confirmation dialogs and proper feedback
- **MDX editing**: Edit frontmatter metadata and MDX content with direct markdown editing and preview
- **Image management**: Drag-and-drop image replacement for hero and in-blog images, with image zoom preview
- **Image prompt generation**: Generate prompts for both hero images and in-blog images for AI image generation tools
- **Persistent navigation**: Seamless navigation between post list and editor with preserved state
- **Modern UI**: Clean, responsive interface built with TailwindCSS featuring:
  - Full dark/light theme support with automated theme detection
  - Consistent button components with multiple variants (primary, secondary, outline, ghost, danger)
  - Loading states and animations for better user feedback
  - Sleek modals with backdrop blur effects

## Project Structure

```
mdx_editor/
├── app/                        # Next.js application
│   ├── public/                 # Static files
│   ├── repositories/           # Cloned repositories (git-ignored)
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── editor/         # Editor-specific components
│   │   ├── pages/              # Next.js pages and API routes
│   │   │   ├── api/           # Backend API endpoints
│   │   │   ├── editor/        # Editor pages
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

- Node.js 14+ and npm/yarn
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

3. Create a `.env.local` file with the following (optional):
```
REPOS_DIR=/path/to/repos
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) to access the application

## Usage Guide

### Repository Management

1. **Clone a repository**: Enter the SSH URL of your git repository
2. **Select a repository**: Choose from the list of cloned repositories
3. **Pull latest changes**: Sync with remote repository

### Post Management

1. **Browse posts**: View paginated list of blog posts with thumbnails and correct date formatting
2. **Edit a post**: Click on a post to open the editor
3. **Delete a post**: Remove a blog post and its associated images with a confirmation dialog
4. **Edit metadata**: Update frontmatter fields like title, date, tags
5. **Edit content**: Modify MDX content with direct markdown editing and toggle preview option
6. **Replace images**: Use drag-and-drop to replace hero or content images
7. **View images**: Click on any image to see an enlarged preview
8. **Generate image prompts**: Generate prompts for hero images and in-blog images for AI image generation tools
9. **Save changes**: Save modifications to the local repository
10. **Commit changes**: Push all changes with a custom commit message

## API Endpoints

- `GET /api/repos`: List cloned repositories
- `POST /api/repos/clone`: Clone a new repository
- `POST /api/repos/pull`: Pull latest changes for a repository
- `GET /api/posts/:repoName`: List posts in a repository
- `GET /api/posts/:repoName/:slug`: Get a specific post
- `PUT /api/posts/:repoName/:slug`: Update a post
- `DELETE /api/posts/:repoName/:slug`: Delete a post and its associated images
- `POST /api/images/replace`: Replace an image
- `GET /api/repos/status/:repoName`: Get git status for a repository
- `POST /api/repos/commit`: Commit and push changes
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

## License

MIT
