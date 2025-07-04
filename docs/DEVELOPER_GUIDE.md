# MDX Blog Content Manager - Developer Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Data Models and Interfaces](#data-models-and-interfaces)
4. [Key Components](#key-components)
5. [State Management](#state-management)
6. [API Architecture](#api-architecture)
7. [Git Operations](#git-operations)
8. [MDX Processing](#mdx-processing)
9. [Image Handling](#image-handling)
10. [Workflow Examples](#workflow-examples)
11. [Configuration](#configuration)
12. [Extending the Application](#extending-the-application)
13. [Testing](#testing)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)

## Architecture Overview

The MDX Blog Content Manager is built with:

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: For type safety and better developer experience
- **TailwindCSS**: For styling components with dark/light theme support
- **simple-git**: For Git operations (clone, pull, push, commit)
- **gray-matter**: For parsing MDX frontmatter
- **@mdx-js/react**: For rendering MDX content
- **react-dropzone**: For drag-and-drop file uploads
- **classnames**: For conditional class name management in components

The application follows a client-server architecture with Next.js API routes handling server-side operations and React components for the UI.

## Project Structure

```
app/
├── public/                    # Static assets
│   └── placeholders/          # Placeholder images
├── repositories/              # Cloned repositories (git-ignored)
├── src/
│   ├── components/            # React components
│   │   ├── editor/            # Editor-specific components
│   │   │   ├── ContentEditor.tsx    # MDX content editing
│   │   │   ├── EditorToolbar.tsx    # Editor navigation tabs
│   │   │   ├── ImageManager.tsx     # Image replacement UI
│   │   │   ├── MetadataEditor.tsx   # Frontmatter editing
│   │   │   ├── MdxPreview.tsx       # MDX content preview
│   │   │   └── PreviewModal.tsx     # Full-screen preview
│   │   ├── ConfirmDialog.tsx      # Confirmation dialogs
│   │   ├── CommitChangesModal.tsx # Git commit modal
│   │   ├── Footer.tsx           # App footer
│   │   ├── Header.tsx           # App header
│   │   ├── Notification.tsx     # Toast notifications
│   │   ├── PostsList.tsx        # Posts listing with pagination
│   │   ├── RepoSelector.tsx     # Repository selection
│   │   └── ui/                  # Reusable UI components
│   │       └── Button.tsx       # Reusable button component with variants
│   ├── contexts/                # React contexts for state
│   │   └── NotificationContext.tsx # Notification state management
│   ├── pages/                   # Next.js pages
│   │   ├── api/                 # API endpoints
│   │   │   ├── images/          # Image management endpoints
│   │   │   │   └── replace.ts   # Image replacement
│   │   │   ├── posts/           # Post management endpoints
│   │   │   │   └── [repoName]/  # Repository-specific endpoints
│   │   │   │       └── [slug].ts # Post-specific operations
│   │   │   └── repositories/    # Repository management endpoints
│   │   │       ├── commit.ts    # Commit & push changes
│   │   │       ├── delete.ts    # Delete repository from filesystem
│   │   │       └── status/      # Repository status
│   │   │           └── [repoName].ts # Repo-specific status
│   │   ├── editor/              # Editor pages
│   │   │   └── [repoName]/      # Repository-specific editor
│   │   │       └── [slug].tsx   # Post editor
│   │   ├── _app.tsx             # Main Next.js app wrapper
│   │   └── index.tsx            # Home page (repo & post selection)
│   ├── styles/                  # Global styles
│   │   └── globals.css          # TailwindCSS and custom styles
│   ├── types/                   # TypeScript interfaces
│   │   └── index.ts             # Core data models
│   └── utils/                   # Utility functions
│       ├── gitOperations.ts     # Git repository operations
│       └── mdxOperations.ts     # MDX file operations
├── .gitignore                   # Git ignore configuration
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies and scripts
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.js           # TailwindCSS configuration
├── tsconfig.json                # TypeScript configuration
└── docs/                        # Documentation
    ├── USER_GUIDE.md            # End-user documentation
    └── DEVELOPER_GUIDE.md       # Developer documentation
```

## Data Models and Interfaces

All TypeScript interfaces are defined in `/src/types/index.ts`. Below are the core data models used throughout the application:

### Repository Management

```typescript
// Repository information
interface Repository {
  name: string;         // Name of the repository
  path: string;         // Local filesystem path
  url?: string;         // Remote git URL (SSH format)
  status?: string;      // Git status information
}

// Result of git operations
interface GitOperationResult {
  success: boolean;     // Operation success status
  error?: string;       // Error message if operation failed
  commitHash?: string;  // Hash of the created commit (for commit operations)
}

// Repository status information
interface GitStatusResult extends GitOperationResult {
  status?: string;      // Text summary of repo status
  modified: string[];   // List of modified files
  staged: string[];     // List of staged files
  untracked: string[];  // List of untracked files
}
```

### Blog Post Models

```typescript
// Blog post frontmatter
interface BlogPostFrontmatter {
  title: string;         // Post title
  slug: string;          // URL slug & identifier
  date: string;          // Publication date (ISO format)
  excerpt: string;       // Short description/summary
  tags: string[];        // List of tags
  category: string;      // Category classification
  author: string;        // Author name
  featured?: boolean;    // Whether the post is featured (optional)
  heroImage: string;     // Path to hero image
  heroImagePrompt?: string; // AI prompt used for hero image
  quiz?: QuizQuestion[]; // Optional quiz content
}

// Quiz question (optional feature)
interface QuizQuestion {
  question: string;      // Question text
  options: string[];     // Multiple choice options
  answer: number;        // Index of correct answer
}

// Complete blog post
interface BlogPost {
  frontmatter: BlogPostFrontmatter; // Metadata
  content: string;       // MDX content
  images: BlogImage[];   // Images used in the post
}

// Image reference information
interface BlogImage {
  path: string;          // Web path to image (/images/uploads/...)
  fullPath: string;      // File system path (/uploads/...)
  altText?: string;      // Alt text for accessibility
  inHero: boolean;       // Whether used as hero image
}

// Parameters for image replacement
interface ImageReplaceParams {
  oldImagePath: string;  // Path to image being replaced
  newImagePath: string;  // Path to replacement image
  slug: string;          // Post slug
  isHero: boolean;       // Whether it's the hero image
}

// Result of save operations
interface SaveResult {
  success: boolean;      // Operation success status
  error?: string;        // Error message if failed
}

// Result of image replacement
interface ImageReplaceResult extends SaveResult {
  newImagePath?: string; // New image path after replacement
}
```

### Application State

```typescript
// Global app state
interface AppState {
  repositories: Repository[];  // List of available repos
  selectedRepo?: string;       // Currently selected repo
  posts: BlogPost[];           // List of posts in current repo
  currentPage: number;         // Current pagination page
  totalPosts: number;          // Total number of posts
  postsPerPage: number;        // Posts per page (default: 10)
  loading: boolean;            // Loading state
  error: string | null;        // Error state
}
```

## Key Components

### UI Components

#### Button Component

The application uses a centralized Button component that provides consistent styling and behavior across the app.

```typescript
// src/components/ui/Button.tsx
<Button
  variant="primary" // primary, secondary, outline, ghost, danger
  size="md" // sm, md, lg
  isLoading={false} // Shows loading spinner when true
  leftIcon={<IconComponent />} // Optional icon on left side
  rightIcon={<IconComponent />} // Optional icon on right side
  className="additional-classes" // Optional extra classes
  disabled={false} // Disables button when true
  onClick={() => handleClick()} // Click handler
>
  Button Text
</Button>
```

This component supports:
- Multiple variants: primary, secondary, outline, ghost, danger
- Different sizes: sm, md, lg
- Loading state with animated spinner
- Left and right icons
- Full-width option
- Dark/light theme compatibility

### Confirmation Dialogs

The `ConfirmDialog` component is used for actions requiring user confirmation, like repository deletion:

```typescript
<ConfirmDialog
  isOpen={isDialogOpen}
  title="Confirm Action"
  message="Are you sure you want to perform this action?"
  confirmLabel="Delete"
  cancelLabel="Cancel"
  confirmVariant="danger"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>
```

### Core Components

#### Header (`Header.tsx`)
```typescript
interface HeaderProps {
  repoName?: string;
  hasUnsavedChanges?: boolean;
  onSave?: () => void;
  onCommitClick?: () => void;
}
```
Main navigation component with:
- Navigation links to home
- Current repository indicator
- Save button for the editor
- Commit button to open commit modal
- Unsaved changes indicator

#### Footer (`Footer.tsx`)
```typescript
const Footer: React.FC = () => { /* ... */ }
```
Simple footer with links to documentation and project information.

#### RepoSelector (`RepoSelector.tsx`)
```typescript
interface RepoSelectorProps {
  repositories: Repository[];
  currentRepo: Repository | null;
  onSelectRepo: (repo: Repository) => void;
  loading: boolean;
}
```
Repository selection UI with:
- List of available repositories
- Visual indication of selected repo
- Clone new repository form
- Repository status indicators
- Pull latest changes functionality with loading indicator
- Error handling
- Dark mode supportark mode support
- Clone new repository form with modern input styling and transitions
- Shadow effects and hover states for interactive elements
- Consistent dark mode styling across all components
- Pull latest changes button with loading indicator

#### PostsList (`PostsList.tsx`)
```typescript
interface PostsListProps {
  currentRepo: Repository;
  onSelectPost: (post: BlogPostSummary) => void;
  pageSize?: number;
}
```
Paginated list of blog posts with:
- Hero image thumbnails with fallbacks
- Post metadata (title, date, excerpt)
- Pagination controls
- Post deletion functionality with confirmation dialog
- Loading skeletons
- Error handling
- Click handler to navigate to editor

#### CommitChangesModal (`CommitChangesModal.tsx`)
```typescript
interface CommitChangesModalProps {
{{ ... }}

#### ConfirmDialog (`ConfirmDialog.tsx`)
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}
```
Reusable confirmation dialog with:
- Modal overlay with focus trap
- Customizable title and message
- Configurable button labels
- Color variants for different actions
- Keyboard accessibility (Escape to cancel)
- Animated transitions
- Full dark mode support

### Editor Components

#### MetadataEditor (`editor/MetadataEditor.tsx`)
```typescript
{{ ... }}
      }
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update post' });
    }
  }

  // DELETE: Delete a post and its associated images
  if (req.method === 'DELETE') {
    try {
      // Check if post exists
      const post = await getBlogPost(repoPath, slug as string);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      // Delete MDX file
      const postFilePath = path.join(repoPath, 'posts', `${slug}.mdx`);
      if (existsSync(postFilePath)) {
        await fs.unlink(postFilePath);
      }
      
      // Delete associated images folder
      const uploadsPath = path.join(repoPath, 'uploads', slug as string);
      if (existsSync(uploadsPath)) {
        // Recursively delete the folder and its contents
        await fs.rm(uploadsPath, { recursive: true, force: true });
      }
      
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Error deleting post:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete post' });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
}
```

### Image Management
{{ ... }}

#### `/api/images/replace`
```typescript
// POST: Replace an image
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse the multipart form data
    const form = new formidable.IncomingForm();
    form.keepExtensions = true;
    
    const [fields, files] = await form.parse(req) as unknown as [formidable.Fields, formidable.Files];
    
    // Extract fields
    const repoName = fields.repoName?.[0];
    const slug = fields.slug?.[0];
    const oldImagePath = fields.oldImagePath?.[0];
    const isHero = fields.isHero?.[0] === 'true';
    
    // Get the uploaded file
    const uploadedFile = files.image?.[0];
    
    if (!repoName || !slug || !oldImagePath || !uploadedFile) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Define paths
    const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repos');
    const repoPath = path.join(reposDir, repoName);
    
    // Get file extension
    const fileExt = path.extname(uploadedFile.originalFilename || '');
    if (!fileExt) {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    // Perform the image replacement
    const result = await replaceImage(
      repoPath,
      slug,
      oldImagePath,
      uploadedFile.filepath,
      fileExt,
      isHero
    );
    
    if (result.success) {
      return res.status(200).json({ 
        message: 'Image replaced successfully',
        newImagePath: result.newImagePath
      });
    } else {
      return res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error replacing image:', error);
    return res.status(500).json({ error: 'Failed to replace image' });
  }
}
```

### API Error Handling

All API endpoints follow a consistent error handling pattern:

1. Input validation with appropriate error messages
2. Try-catch blocks for async operations
3. Proper HTTP status codes:
   - 200: Success
   - 400: Bad request (invalid input)
   - 404: Not found
   - 405: Method not allowed
   - 500: Server error
4. Consistent response format: `{ message: string }` or `{ error: string }`

## Repository Management

### Repository Deletion

The application supports deleting repositories from the filesystem:

#### Frontend Implementation

```typescript
// in RepoSelector.tsx
const handleDeleteRepo = async (repo: Repository) => {
  // Show confirmation dialog
  setRepoToDelete(repo);
  setShowDeleteConfirm(true);
};

const confirmDelete = async () => {
  if (!repoToDelete) return;
  
  setDeletingRepo(true);
  try {
    const response = await fetch(`/api/repositories/delete?repoName=${repoToDelete.name}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      // Remove from local state and show success notification
      setRepositories(repositories.filter(r => r.id !== repoToDelete.id));
      showNotification(`Repository '${repoToDelete.name}' deleted successfully`, 'success');
    } else {
      const error = await response.json();
      showNotification(`Failed to delete repository: ${error.error}`, 'error');
    }
  } catch (error) {
    showNotification(`Error deleting repository: ${error.message}`, 'error');
  } finally {
    setDeletingRepo(false);
    setShowDeleteConfirm(false);
    setRepoToDelete(null);
  }
};
```

#### Backend API

```typescript
// pages/api/repositories/delete.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { repoName } = req.query;
  
  if (!repoName || typeof repoName !== 'string') {
    return res.status(400).json({ error: 'Repository name is required' });
  }

  try {
    // Determine repository path
    const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
    const repoPath = path.join(reposDir, repoName);
    
    // Check if repository exists
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Delete the repository directory recursively
    await rm(repoPath, { recursive: true, force: true });

    // Return success
    return res.status(200).json({ 
      success: true, 
      message: `Repository '${repoName}' deleted successfully` 
    });
  } catch (error) {
    return res.status(500).json({ error: `Failed to delete repository: ${error.message}` });
  }
}
```

## Git Operations

Git operations are abstracted in `src/utils/gitOperations.ts`, leveraging the `simple-git` package. This module handles all interactions with git repositories.

### Core Functions

```typescript
/**
 * Clone a git repository from a URL to a local destination.
 * @param url - The SSH URL of the git repository
 * @param destination - The local path where the repository should be cloned
 * @returns GitOperationResult with success/error information
 */
export async function cloneRepository(
  url: string, 
  destination: string
): Promise<GitOperationResult> {
  try {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    
    // Initialize simple-git
    const git = simpleGit();
    
    // Clone repository
    await git.clone(url, destination);
    
    return { success: true };
  } catch (error) {
    console.error('Error cloning repository:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Pull latest changes from the remote repository.
 * @param repoPath - The local path of the repository
 * @returns GitOperationResult with success/error information
 */
export async function pullRepository(repoPath: string): Promise<GitOperationResult> {
  try {
    // Initialize simple-git in the repository directory
    const git = simpleGit(repoPath);
    
    // Pull latest changes
    await git.pull();
    
    return { success: true };
  } catch (error) {
    console.error('Error pulling repository:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Commit all changes in the repository and push to remote.
 * @param repoPath - The local path of the repository
 * @param message - The commit message
 * @returns GitOperationResult with success/error and commit hash
 */
export async function commitAndPushChanges(
  repoPath: string, 
  message: string
): Promise<GitOperationResult> {
  try {
    // Initialize simple-git in the repository directory
    const git = simpleGit(repoPath);
    
    // Add all changed files
    await git.add('.');
    
    // Commit changes
    const commitResult = await git.commit(message);
    
    // Push to remote
    await git.push();
    
    return { 
      success: true, 
      commitHash: commitResult.commit 
    };
  } catch (error) {
    console.error('Error committing and pushing changes:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get the status of a git repository.
 * @param repoPath - The local path of the repository
 * @returns GitStatusResult with status information
 */
export async function getRepoStatus(repoPath: string): Promise<GitStatusResult> {
  try {
    // Check if directory exists
    try {
      await fs.access(repoPath);
    } catch {
      return { 
        success: false, 
        error: 'Repository directory does not exist', 
        modified: [], 
        staged: [], 
        untracked: [] 
      };
    }
    
    // Initialize simple-git in the repository directory
    const git = simpleGit(repoPath);
    
    // Check if it's a git repository
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      return { 
        success: false, 
        error: 'Not a git repository', 
        modified: [], 
        staged: [], 
        untracked: [] 
      };
    }
    
    // Get status
    const status = await git.status();
    
    return {
      success: true,
      status: status.isClean() ? 'Clean' : 'Modified',
      modified: status.modified,
      staged: status.staged,
      untracked: status.not_added
    };
  } catch (error) {
    console.error('Error getting repository status:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      modified: [], 
      staged: [], 
      untracked: [] 
    };
  }
}
```

### Error Handling

All git operations follow a consistent error handling pattern:

1. Wrap operations in try/catch blocks
2. Log errors to the console for debugging
3. Return a standardized `GitOperationResult` object:
   - `success`: boolean indicating success/failure
   - `error`: optional error message on failure
   - `commitHash`: optional hash for commit operations

### SSH Authentication

The application assumes SSH keys are already configured on the system for repository access. The application does not manage SSH keys or credentials directly.

## MDX Processing

MDX processing is handled in `src/utils/mdxOperations.ts`. This module is responsible for parsing MDX files, extracting frontmatter and content, and managing the reading and writing of blog posts.

### Core MDX Functions

```typescript
/**
 * Get all blog posts in a repository with pagination.
 * @param repoPath - Path to the repository
 * @param page - Page number (1-based)
 * @param pageSize - Number of posts per page
 * @returns Array of blog posts with frontmatter and content
 */
export async function getBlogPosts(
  repoPath: string,
  page: number = 1,
  pageSize: number = 10
): Promise<BlogPost[]> {
  try {
    // Path to posts directory
    const postsDir = path.join(repoPath, 'posts');
    
    // Read all .mdx files
    const files = await fs.readdir(postsDir);
    const mdxFiles = files.filter(file => file.endsWith('.mdx'));
    
    // Calculate pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedFiles = mdxFiles.slice(startIndex, endIndex);
    
    // Read each post
    const posts = await Promise.all(
      paginatedFiles.map(async (filename) => {
        const slug = filename.replace('.mdx', '');
        return await getBlogPost(repoPath, slug);
      })
    );
    
    // Filter out null results and sort by date
    return posts
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => {
        return new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime();
      });
  } catch (error) {
    console.error('Error getting blog posts:', error);
    return [];
  }
}

/**
 * Get the total number of posts in a repository.
 * @param repoPath - Path to the repository
 * @returns Total number of MDX posts
 */
export async function getTotalPostsCount(repoPath: string): Promise<number> {
  try {
    const postsDir = path.join(repoPath, 'posts');
    const files = await fs.readdir(postsDir);
    return files.filter(file => file.endsWith('.mdx')).length;
  } catch (error) {
    console.error('Error getting total posts count:', error);
    return 0;
  }
}

/**
 * Get a single blog post by slug.
 * @param repoPath - Path to the repository
 * @param slug - Post slug (filename without .mdx extension)
 * @returns Blog post with frontmatter, content, and images
 */
export async function getBlogPost(repoPath: string, slug: string): Promise<BlogPost | null> {
  try {
    // Path to post file
    const postPath = path.join(repoPath, 'posts', `${slug}.mdx`);
    
    // Read file
    const fileContent = await fs.readFile(postPath, 'utf-8');
    
    // Parse frontmatter and content
    const { data: frontmatter, content } = matter(fileContent);
    
    // Extract image references
    const images = await extractImageReferences(repoPath, content, slug);
    
    // Add hero image to images list if not already included
    const heroImagePath = frontmatter.heroImage as string;
    
    if (heroImagePath && !images.some(img => img.path === heroImagePath)) {
      // Convert web path to file system path
      const fullPath = heroImagePath.replace('/images/uploads', '/uploads');
      
      images.push({
        path: heroImagePath,
        fullPath,
        altText: 'Hero Image',
        inHero: true
      });
    }
    
    return {
      frontmatter: frontmatter as BlogPostFrontmatter,
      content,
      images
    };
  } catch (error) {
    console.error(`Error getting blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Save a blog post to the repository.
 * @param repoPath - Path to the repository
 * @param post - Blog post object with frontmatter and content
 * @returns SaveResult with success/error information
 */
export async function saveBlogPost(repoPath: string, post: BlogPost): Promise<SaveResult> {
  try {
    // Create frontmatter string
    const frontmatterContent = matter.stringify(post.content, post.frontmatter);
    
    // Path to post file
    const postPath = path.join(repoPath, 'posts', `${post.frontmatter.slug}.mdx`);
    
    // Write file
    await fs.writeFile(postPath, frontmatterContent);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving blog post:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract image references from MDX content.
 * @param repoPath - Path to the repository
 * @param mdxContent - MDX content string
 * @param slug - Post slug
 * @returns Array of BlogImage objects
 */
export async function extractImageReferences(
  repoPath: string,
  mdxContent: string,
  slug: string
): Promise<BlogImage[]> {
  // Find all image references in the MDX content
  // Format: ![alt text](/images/uploads/path/to/image.jpg)
  const imageRegex = /!\[(.*?)\]\((\S+\/images\/uploads\/[\w\-\/\.]+)\)/g;
  const matches = Array.from(mdxContent.matchAll(imageRegex));
  
  // Convert web paths to file system paths
  const images: BlogImage[] = matches.map(match => {
    const altText = match[1];
    const webPath = match[2]; // /images/uploads/slug/image.jpg
    const fullPath = webPath.replace('/images/uploads', '/uploads'); // /uploads/slug/image.jpg
    
    return {
      path: webPath,
      fullPath,
      altText,
      inHero: false
    };
  });
  
  return images;
}
```

### Frontmatter Handling

The application uses `gray-matter` for parsing YAML frontmatter in MDX files:

```typescript
const { data: frontmatter, content } = matter(fileContent);
```

This extracts structured metadata from the beginning of MDX files, which typically looks like:

```markdown
---
title: "Sample Blog Post"
slug: "sample-blog-post"
date: "2023-01-01"
excerpt: "This is a sample blog post"
tags: ["sample", "blog"]
category: "sample"
author: "John Doe"
heroImage: "/images/uploads/sample-blog-post/hero.jpg"
heroImagePrompt: "A beautiful landscape"
---

# Sample Blog Post

Content goes here...
```

### Path Handling

The application maintains a consistent approach to handling paths:

1. Web paths in MDX content: `/images/uploads/<slug>/<image>`
2. File system paths: `/uploads/<slug>/<image>`

Converting between the two is handled in several functions, particularly in `extractImageReferences` and `replaceImage`.

## Image Handling

Image operations are implemented in the MDX operations utility (`src/utils/mdxOperations.ts`) and the API routes. This includes image serving, replacement (both file upload and URL import), and reference updating for both hero images and in-blog images.

### Image Serving

Images are served through a dedicated API endpoint (`/api/image`) that resolves repository paths and serves the correct image with proper content type headers. This provides secure access to images stored in the repository structure.

```typescript
// /pages/api/image.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Extract repoName and imagePath from query params
  const { repoName, imagePath } = req.query;
  
  // Map web path to file system path
  const actualImagePath = imagePath.replace('/images/uploads/', '/uploads/');
  const fullImagePath = path.join(repoPath, actualImagePath);
  
  // Serve the image with appropriate content type
  const imageBuffer = await fs.readFile(fullImagePath);
  res.setHeader('Content-Type', contentType);
  res.send(imageBuffer);
}
```

### Image Replacement API

The `/api/images/replace` endpoint handles image replacement requests from the frontend. It supports two methods of image replacement:

1. **File Upload**: Processing multipart form data with uploaded files
2. **URL Import**: Fetching an image from an external URL

```typescript
// /pages/api/images/replace.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data using formidable
    const { fields, files } = await parseForm(req);
    const { repoName, slug, oldImagePath, isHero, imageUrl } = fields;
    
    // Handle URL-based image import
    if (imageUrl && typeof imageUrl === 'string') {
      // Fetch image from URL, save to temp file, then replace
      const tempFilePath = await fetchAndSaveImage(imageUrl);
      const extension = path.extname(new URL(imageUrl).pathname) || '.jpg';
      
      // Use the replaceImage utility to complete the operation
      const result = await replaceImage({
        repoName: repoName as string,
        slug: slug as string,
        oldImagePath: oldImagePath as string,
        newImagePath: tempFilePath,
        extension,
        isHero: isHero === 'true',
      });
      
      return res.status(200).json(result);
    }
    // Handle file upload replacement
    else {
      // Process the uploaded file
      const fileInfo = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!fileInfo || !fileInfo.filepath) {
        return res.status(400).json({ error: 'Invalid file upload' });
      }
      
      // Get file extension
      const extension = path.extname(fileInfo.originalFilename || '');
      
      // Use the replaceImage utility to complete the operation
      const result = await replaceImage({
        repoName: repoName as string,
        slug: slug as string,
        oldImagePath: oldImagePath as string,
        newImagePath: fileInfo.filepath,
        extension,
        isHero: isHero === 'true',
      });
      
      return res.status(200).json(result);
    }
  } catch (error) {
    console.error('Error replacing image:', error);
    return res.status(500).json({ error: 'Failed to replace image' });
  }
}
```

### replaceImage Utility

```typescript
/**
 * Replace an image in the repository.
 * @param params - Object containing replacement parameters
 * @returns ImageReplaceResult with success/error and new path information
 */
export async function replaceImage(params: ImageReplaceParams): Promise<ImageReplaceResult> {
  const { repoName, slug, oldImagePath, newImagePath, extension, isHero } = params;
  
  // Determine repository path
  const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
  const repoPath = path.join(reposDir, repoName);

  try {
    // Convert web path to file system path
    const oldFullPath = path.join(
      repoPath,
      oldImagePath.replace('/images/uploads', 'uploads')
    );
    
    // Create directory if it doesn't exist
    const targetDir = path.dirname(oldFullPath);
    await fs.mkdir(targetDir, { recursive: true });
    
    // Get filename from old path
    const fileName = path.basename(oldImagePath);
    
    // Create new image path, preserving the original filename but updating extension
    const newFileName = isHero
      ? 'hero' + extension
      : path.parse(fileName).name + extension;
    
    const newFullPath = path.join(targetDir, newFileName);
    
    // Create web path for frontend reference
    const newWebPath = '/images/' + newFullPath.split('/uploads/')[1];
    
    // Copy new image to target location
    await fs.copyFile(newImagePath, newFullPath);
    
    // Delete old image if it exists and has different name
    if (oldFullPath !== newFullPath && await fs.exists(oldFullPath)) {
      await fs.unlink(oldFullPath);
    }
    
    // If this is a hero image, update the post frontmatter
    if (isHero) {
      const postPath = path.join(repoPath, 'posts', `${slug}.mdx`);
      const fileContent = await fs.readFile(postPath, 'utf8');
      
      const { data: frontmatter, content } = matter(fileContent);
      frontmatter.heroImage = newWebPath;
      
      // Re-write the file with updated frontmatter
      const updatedContent = matter.stringify(content, frontmatter);
      await fs.writeFile(postPath, updatedContent);
    }
    // If this is an in-blog image, update references in the post content
    else {
      const postPath = path.join(repoPath, 'posts', `${slug}.mdx`);
      const fileContent = await fs.readFile(postPath, 'utf8');
      
      const { data: frontmatter, content } = matter(fileContent);
      
      // Replace image references in content
      // Format: ![alt text](/images/uploads/path/to/image.jpg)
      const escapedOldPath = oldImagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const imageRegex = new RegExp(
        `(!\\[.*?\\])\\(${escapedOldPath}\\)`, 'g'
      );
      
      const updatedContent = content.replace(
        imageRegex,
        `$1(${newWebPath})`
      );
      
      // Re-write the file with updated content
      const updatedFileContent = matter.stringify(updatedContent, frontmatter);
      await fs.writeFile(postPath, updatedFileContent);
    }
    
    return { 
      success: true,
      newImagePath: newWebPath
    };
  } catch (error) {
    console.error('Error replacing image:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Delete an image from the repository.
 * @param repoPath - Path to the repository
 * @param imagePath - Path to the image (web path)
 * @returns Boolean indicating success
 */
export async function deleteImage(repoPath: string, imagePath: string): Promise<boolean> {
  try {
    // Convert web path to file system path
    const fullPath = path.join(
      repoPath,
      imagePath.replace('/images/uploads', 'uploads')
    );
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      // File doesn't exist
      return false;
    }
    
    // Delete the file
    await fs.unlink(fullPath);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}
```

### Image Stamping

The application provides two types of image stamping functionality using the Sharp library:

#### Logo Stamping (`/api/images/stamp`)

Overlays repository logos onto images with the following features:
- Automatic logo resizing to 128x128 pixels
- Transparency preservation with proper alpha blending
- Bottom-right positioning with responsive margins
- Format-aware processing (PNG, JPEG, WebP)
- Quality optimization to balance file size and visual quality

```typescript
// Key implementation details
const resizedLogo = await sharp(logoPath)
  .resize(128, 128, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
  })
  .png({ quality: 100, compressionLevel: 3, adaptiveFiltering: true })
  .toBuffer();

// Composite with proper alpha blending
pipeline = pipeline.composite([{
  input: resizedLogo,
  top: height - 128 - margin,
  left: width - 128 - margin,
  blend: 'over' // Proper transparency handling
}]);
```

#### Date Stamping (`/api/images/stampDate`)

Adds professional date overlays with:
- Responsive font sizing (32-48px based on image dimensions)
- Color-coded components (day: gold, month: blue, year: green, separators: white)
- Perfect centering with balanced spacing
- Semi-transparent background rectangle
- SVG-based overlay for crisp rendering

```typescript
// Responsive calculations
const fontSize = Math.max(32, Math.min(48, width * 0.04));
const componentSpacing = fontSize * 0.8;
const estimatedWidth = fontSize * 8.5;

// Centered positioning
const centerX = rectX + (rectWidth / 2);
const positions = {
  day: centerX - componentSpacing * 2.5,
  firstSlash: centerX - componentSpacing * 1.5,
  month: centerX - componentSpacing * 0.5,
  secondSlash: centerX + componentSpacing * 0.5,
  year: centerX + componentSpacing * 2.2
};
```

**Technical Features:**
- **Transparency Preservation**: Uses `blend: 'over'` for proper alpha compositing
- **Quality Optimization**: Balanced compression (PNG: level 3, JPEG: 95%, WebP: near-lossless)
- **Format Detection**: Automatically preserves original image format
- **Responsive Design**: All elements scale proportionally with image size
- **Memory Efficiency**: Sequential read and optimized Sharp pipelines

### Image Path Handling

The application maintains a clear distinction between web paths and file system paths:

1. Web paths in MDX content: `/images/uploads/<slug>/<image>`
2. File system paths: `<repoPath>/uploads/<slug>/<image>`

Converting between the two is a critical operation handled by several utility functions.

### Image Upload Handling

Image uploads in the frontend are managed using React Dropzone:

```typescript
// From ImageManager.tsx
const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
  if (fileRejections.length > 0) {
    showNotification('Invalid file. Please upload a valid image file.', 'error');
    return;
  }
  
  if (acceptedFiles.length === 0) return;
  
  const file = acceptedFiles[0];
  
  // Create form data
  const formData = new FormData();
  formData.append('image', file);
  formData.append('repoName', repoName);
  formData.append('slug', slug);
  formData.append('oldImagePath', image.path);
  formData.append('isHero', String(image.inHero));
  
  // Replace image
  try {
    setUploading(true);
    const response = await fetch('/api/images/replace', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('Image replaced successfully.', 'success');
      onImageReplace(image.path, data.newImagePath, image.inHero);
    } else {
      showNotification(`Failed to replace image: ${data.error}`, 'error');
    }
  } catch (error) {
    showNotification('An error occurred while replacing the image.', 'error');
  } finally {
    setUploading(false);
  }
}, [image, repoName, slug, onImageReplace, showNotification]);
```

## Workflow Examples

This section provides examples of key workflows in the application to help developers understand how the different components interact.

### Repository Cloning Workflow

1. **User Interaction**: User enters SSH URL and repo name in the UI
2. **Frontend**: 
   ```typescript
   // In Home page component
   const cloneRepository = async () => {
     setCloning(true);
     try {
       const response = await fetch('/api/repositories/clone', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           url: repoUrl,
           name: repoName,
         }),
       });
       
       const data = await response.json();
       
       if (response.ok) {
         showNotification('Repository cloned successfully.', 'success');
         fetchRepositories(); // Refresh repo list
       } else {
         showNotification(`Failed to clone repository: ${data.error}`, 'error');
       }
     } catch (error) {
       showNotification('An error occurred while cloning the repository.', 'error');
     } finally {
       setCloning(false);
     }
   };
   ```

3. **API**: `/api/repositories/clone` handles the request
4. **Backend**: `gitOperations.cloneRepository()` clones the repo via SSH
5. **Response**: Success/failure message returned to frontend
6. **Frontend**: Updates UI with notification and refreshes repo list

### Post Editing Workflow

1. **User Interaction**: User selects a post to edit
2. **Frontend**: Navigates to `/editor/[repoName]/[slug]`
3. **Page Load**: 
   ```typescript
   // In [slug].tsx
   useEffect(() => {
     const fetchPost = async () => {
       setLoading(true);
       try {
         const response = await fetch(`/api/posts/${repoName}/${slug}`);
         
         if (response.ok) {
           const postData = await response.json();
           setPost(postData);
           setHasUnsavedChanges(false);
         } else {
           const error = await response.json();
           showNotification(`Failed to load post: ${error.error}`, 'error');
         }
       } catch (error) {
         showNotification('An error occurred while loading the post.', 'error');
       } finally {
         setLoading(false);
       }
     };
     
     fetchPost();
   }, [repoName, slug, showNotification]);
   ```

4. **API**: `/api/posts/[repoName]/[slug]` gets the post
5. **Backend**: `mdxOperations.getBlogPost()` reads and parses the MDX
6. **User Editing**: User edits content, metadata, or images
7. **Save Action**:
   ```typescript
   // In [slug].tsx
   const handleSave = async () => {
     if (!post) return;
     
     setSaving(true);
     try {
       const response = await fetch(`/api/posts/${repoName}/${slug}`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(post),
       });
       
       if (response.ok) {
         showNotification('Post saved successfully.', 'success');
         setHasUnsavedChanges(false);
       } else {
         const error = await response.json();
         showNotification(`Failed to save post: ${error.error}`, 'error');
       }
     } catch (error) {
       showNotification('An error occurred while saving the post.', 'error');
     } finally {
       setSaving(false);
     }
   };
   ```

8. **Backend**: `mdxOperations.saveBlogPost()` updates the MDX file

### Image Replacement Workflow

1. **User Interaction**: User drops new image in the image card
2. **Frontend**: Uploads image via form data
3. **API**: `/api/images/replace` processes the upload
4. **Backend**: `mdxOperations.replaceImage()` replaces the file and updates references
5. **Frontend**: Updates UI with new image

### Frontend Image Replacement Implementation

The `ImageManager` component handles the UI for image replacement. Key features include:

1. **Contextual UI placement**: The image replacement UI appears directly below the selected image
2. **Consistent image sizing**: Hero images are displayed at the same size as content images
3. **Dual replacement methods**: Support for both file upload and URL imports

Here's the implementation of the URL-based image replacement in the `ImageManager` component:

```typescript
// State for URL input and loading state
const [imageUrl, setImageUrl] = useState('');
const [isImporting, setIsImporting] = useState(false);

// Handler for URL-based image replacement
const handleImportFromUrl = async () => {
  if (!imageUrl) return;
  
  setIsImporting(true);
  setUploadError(null);
  
  try {
    const formData = new FormData();
    formData.append('repoName', repoName);
    formData.append('slug', slug);
    formData.append('oldImagePath', selectedImage.path);
    formData.append('isHero', selectedImage.inHero.toString());
    formData.append('imageUrl', imageUrl);
    
    const response = await fetch('/api/images/replace', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to import image');
    }
    
    const data = await response.json();
    onImageReplace(selectedImage.path, data.newImagePath, selectedImage.inHero);
    setImageUrl('');
    setImageUrlSelected(false);
  } catch (error) {
    setUploadError(error.message);
  } finally {
    setIsImporting(false);
  }
};

// Render the URL import input field
const renderUrlInput = () => (
  <div className="flex flex-col space-y-2 w-full">
    <label className="text-sm font-medium">Import from URL:</label>
    <div className="flex space-x-2">
      <input
        type="text"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://example.com/image.jpg"
        className="flex-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
      />
      <button
        onClick={handleImportFromUrl}
        disabled={!imageUrl || isImporting}
        className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isImporting ? 'Importing...' : 'Import'}
      </button>
    </div>
  </div>
);
```

## Configuration

### Environment Variables

The application uses the following environment variables:

```env
# Directory to store cloned repositories
REPOS_DIR=/path/to/repos

# Optional: Server port
PORT=3000

# Optional: Maximum file upload size in bytes (default: 5MB)
MAX_FILE_SIZE=5242880
```

Create a `.env.local` file in the root directory to set these variables.

### Next.js Configuration

The Next.js configuration (`next.config.js`) includes:

```javascript
module.exports = {
  reactStrictMode: true,
  images: {
    domains: ['localhost'],
  },
  // Increase API payload size limit for image uploads
  api: {
    bodyParser: {
      sizeLimit: process.env.MAX_FILE_SIZE || '5mb',
    },
  },
};
```

### TailwindCSS Configuration

The MDX Blog Content Manager uses a pre-compiled Tailwind CSS approach for styling. The TailwindCSS configuration (`tailwind.config.js`) includes:

```javascript
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
```

#### CSS Processing

Rather than relying on Next.js's built-in CSS processing, we use a pre-compiled approach for better consistency and reliability:

1. The `generate-css.js` script in the project root compiles Tailwind CSS:

```javascript
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

async function generateCSS() {
  // Tailwind CSS content
  const tailwindCssContent = `@tailwind base;\n@tailwind components;\n@tailwind utilities;`;

  try {
    // Process the CSS with PostCSS and plugins
    const result = await postcss([
      tailwindcss,
      autoprefixer,
    ]).process(tailwindCssContent, { from: undefined });

    // Create the output directory if it doesn't exist
    const outputPath = path.resolve('./public/tailwind-output.css');
    fs.writeFileSync(outputPath, result.css);
    console.log(`CSS file generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating CSS:', error);
  }
}

generateCSS();
```

2. This script is automatically executed during development and build:

```json
// In package.json
{
  "scripts": {
    "css:build": "node generate-css.js",
    "dev": "node generate-css.js && next dev",
    "build": "node generate-css.js && next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

3. The compiled CSS is included in the application via a custom `_document.tsx` file:

```tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="stylesheet" href="/tailwind-output.css" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

4. Global styles that don't use Tailwind directives are maintained in `src/styles/globals.css` and imported in `_app.tsx`

## Troubleshooting

### Common Issues

#### SSH Authentication Failures

**Problem**: Git operations fail with SSH authentication errors.

**Solution**:
1. Verify SSH keys are properly configured with repositories
2. Check that the SSH agent is running: `eval "$(ssh-agent -s)"`
3. Add your key to the agent: `ssh-add ~/.ssh/id_rsa`
4. Test connection: `ssh -T git@github.com`

#### Image Replacement Failures

**Problem**: Image replacement fails with 413 error.

**Solution**:
1. Check image file size (current limit is 5MB)
2. Increase limit in Next.js API config
3. Verify proper file permissions in uploads directory

#### MDX Parsing Errors

**Problem**: MDX content fails to parse or render.

**Solution**:
1. Verify frontmatter has valid YAML syntax
2. Check for proper formatting of image references
3. Validate content with a linter

### Debugging Tips

#### Backend API Debugging

```typescript
// Add console logs for debugging
console.error('Error details:', error);

// Return detailed errors in development
const errorMessage = process.env.NODE_ENV === 'development' 
  ? error.message 
  : 'An error occurred';
return res.status(500).json({ error: errorMessage });
```

#### Frontend Debugging

```typescript
// Network request debugging
const response = await fetch('/api/endpoint');
console.log('Response status:', response.status);
const data = await response.json();
console.log('Response data:', data);
```

#### Component Debugging

```typescript
// Component re-rendering debugging
const renders = useRef(0);
useEffect(() => {
  console.log(`Component rendered ${++renders.current} times`);
});
```

## Conclusion

This developer guide provides a comprehensive overview of the MDX Blog Content Manager's architecture, components, and functionality. It's designed to serve as the single point of reference for understanding the project and extending its capabilities.

For user documentation, please refer to the `USER_GUIDE.md` document.

## Extending the Application

### Adding a New Feature

1. **Define the interfaces**: Add any necessary TypeScript interfaces in `src/types`
2. **Implement the API endpoint**: Create or modify files in `src/pages/api`
3. **Implement the UI components**: Create React components in `src/components`
4. **Add utility functions**: Add helper functions in `src/utils`

### Example: Adding a New Component

```tsx
import React, { useState } from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  const [isActive, setIsActive] = useState(false);
  
  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-medium">{title}</h3>
      <button 
        className="btn btn-primary mt-2"
        onClick={() => {
          setIsActive(true);
          onAction();
        }}
      >
        {isActive ? 'Active' : 'Activate'}
      </button>
    </div>
  );
};

export default MyComponent;
```

### Example: Adding a New API Endpoint

```typescript
// src/pages/api/example/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  
  if (req.method === 'GET') {
    // Handle GET request
    return res.status(200).json({ id, message: 'Example endpoint' });
  }
  
  // Handle unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
}
```

## Testing

Add tests using Jest and React Testing Library:

```typescript
// Example test
import { render, screen } from '@testing-library/react';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent title="Test Title" onAction={() => {}} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
```

## Deployment

### Build for Production

```bash
# Create a production build
npm run build

# Start the production server
npm start
```

### Docker Deployment

A Dockerfile is provided for containerized deployment:

```Dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## Performance Considerations

- **Pagination**: Posts are loaded in pages to improve performance
- **Image Optimization**: Use the Next.js Image component for optimized images
- **Code Splitting**: Next.js handles code splitting automatically

## Security Considerations

- **Input Validation**: Always validate input data on the server side
- **Git Operations**: Use SSH keys for secure repository access
- **API Rate Limiting**: Consider adding rate limiting for API endpoints

## Conclusion

This developer guide provides an overview of the MDX Blog Content Manager's architecture and implementation. For more detailed information, refer to the codebase documentation and comments.
