# MDX Blog Content Manager - Product Requirements Document (PRD)

## Overview
The MDX Blog Content Manager is a web application designed to facilitate the editing and management of blog content written in MDX format across multiple git repositories. It serves as a comprehensive content management system for bloggers and content creators who maintain their blog content in git repositories with a standardized structure.

## Problem Statement
Content creators who use MDX for blog posts in git repositories face challenges when they need to:
- Edit content across multiple repositories
- Replace images within blog posts
- Update metadata for posts
- Manage changes via git without manual command-line operations
- Preview changes before committing them

## Target Users
- Content creators who manage blogs in MDX format
- Blog editors and managers
- Technical teams who maintain blog content in git repositories

## Repository Structure Assumptions
Each repository is expected to follow a standard structure:
- `/posts/` - Contains MDX files named by their slug
- `/uploads/` - Contains image folders organized by post slug

MDX files contain frontmatter with fields such as:
- `title`: Post title
- `slug`: URL path for the post
- `date`: Publication date
- `excerpt`: Short description
- `tags`: List of topics
- `category`: Post category
- `author`: Author name
- `heroImage`: Path to the hero image

## Key Features

### 1. Multi-Repository Management
- Clone repositories via SSH
- Pull latest changes from repositories
- List and select from available repositories
- Support repositories with identical structure but different content

### 2. Post Listing & Navigation
- Display posts with thumbnails (hero images)
- Show key metadata (title, date, author, tags, etc.) with correct timezone handling
- Pagination (10 posts per page)
- Persistent navigation state when moving between post list and editor
- Remember selected repository and page position when returning to list
- Sort and filter options

### 3. Content Editing
- Edit markdown content directly
- Live preview of rendered MDX
- Clean, modern editor interface
- Toggle between editing and preview modes

### 4. Advanced Image Management
- **Traditional Replacement**:
  - Replace hero images via drag-and-drop
  - Replace in-blog images via drag-and-drop
  - Automatic path management and file replacement
  - Image preview before replacing
  - Image zoom functionality for detailed inspection
  - Visual feedback with zoom cursor indicator

- **AI-Powered Image Generation**:
  - Generate Image button for both hero and in-blog images
  - Intelligent prompt generation (hero vs in-blog specific)
  - Integration with external AI image generation services
  - Conversation ID management with session storage (1-hour expiry)
  - Extract generated images from AI conversations
  - One-click replacement of existing images with generated ones
  - Placeholder-specific instructions for in-blog images ("CREATE IMAGE FOR PLACEHOLDER N NOW")
  - Delete conversation functionality for cleanup
  - Manual conversation ID editing capability

- **URL-Based Replacement**:
  - Import images from external URLs
  - Optimized single-call API for efficient processing
  - Server-side URL validation and CORS handling

- **Image Enhancement**:
  - Stamp images with repository logos (overlay repository logo.png onto images at bottom-right corner)
  - Date stamping with customizable formats

### 5. Metadata Editing
- Edit all frontmatter fields
- Date picker for publication date
- Tag management (add/remove)
- Input validation

### 6. Git Integration
- Automatic clone and pull operations
- Local saving of changes
- Commit and push functionality with custom commit messages
- Status indicators for modified files

## Technical Requirements

### Front-end
- Next.js framework
- TypeScript for type safety
- TailwindCSS for styling
- Responsive design (mobile and desktop)

### Back-end
- Node.js API routes via Next.js
- File system operations for repository management
- Git operations via SSH
- MDX parsing and manipulation

### Performance
- Fast loading of post lists
- Responsive editing experience
- Efficient image handling to minimize upload time

### Security
- Secure handling of git operations
- Protection against unauthorized repository access
- Input sanitization for all user inputs

## User Workflows

### Repository Selection
1. User opens the application
2. User selects a repository from the list or enters a new repository URL to clone
3. Application clones/pulls the repository and displays available posts

### Post Editing
1. User selects a post from the list
2. Application displays the post editor interface
3. User edits content, metadata, and/or images
4. User saves changes locally
5. Changes are reflected in the local repository

### Image Replacement
1. User identifies an image to replace
2. User can click on the image to zoom and inspect details
3. User drags and drops a new image or selects from file browser
4. Application replaces the image file in the repository
5. Application updates image references if needed

### Image Prompt Generation
1. User edits a post in the editor
2. User clicks on either the "HeroImagePrompt" or "InBlogImagePrompt" tab
3. Application combines the system prompt with the post content
4. For in-blog images, the application transforms image prompt comments into placeholders
5. User can copy the generated prompt for use with AI image generation tools

### Publishing Changes
1. User makes changes to one or more posts
2. User clicks the commit button
3. User enters a commit message
4. Application commits and pushes changes to the remote repository

## Future Enhancements
- User authentication and authorization
- Multi-user collaboration
- Comment management
- SEO analysis and recommendations
- Auto-save functionality
- Media library management
- Custom MDX component preview

## Success Metrics
- Reduced time to edit and publish blog content
- Decreased errors in content management
- Increased frequency of blog updates
- Positive user feedback on the editing experience
