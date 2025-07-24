# MDX Blog Content Manager - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Repository Management](#repository-management)
4. [Post Management](#post-management)
5. [Content Editing](#content-editing)
6. [Image Management](#image-management)
7. [Saving and Publishing](#saving-and-publishing)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Troubleshooting](#troubleshooting)

## Introduction

Welcome to the MDX Blog Content Manager! This application allows you to manage MDX blog content across multiple git repositories with a modern, user-friendly interface. This guide will walk you through all the features of the application.

## Getting Started

### System Requirements

- Node.js v14.0 or higher
- Git with SSH keys configured for repository access

### Installation

1. Clone the application repository:
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

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Repository Management

### Adding a Repository

1. On the home page, click "Add Repository" button
2. Enter a name for the repository (this will be used to identify it in the application)
3. Enter the SSH URL of the Git repository (must have proper SSH key access configured)
4. Click "Clone Repository" to add it to your workspace

### Selecting a Repository

1. On the home page, you'll see a list of all available repositories
2. Each repository will show its name and full path
3. Click the "Select" button next to the repository you wish to work with

### Managing Repositories

- **Pull Latest Changes**: Click the down arrow icon next to a repository to pull the latest changes from the remote
- **Delete Repository**: Click the "Delete" button next to a repository to remove it completely from your filesystem
  - A confirmation dialog will appear asking you to confirm deletion
  - This action cannot be undone as it removes the entire repository folder

### Theme Support

The application supports both light and dark themes:

1. Click the sun/moon icon in the header to toggle between light and dark modes
2. Your preference will be saved for future sessions
3. All UI elements automatically adjust to the chosen theme

### Viewing Available Repositories

The home page displays all your cloned blog repositories. Each repository card shows:
- Repository name
- Last commit information
- Status (up to date, modified, etc.)
- Mobile-optimized responsive design with proper text truncation and button sizing

### Cloning a New Repository

1. Click the "Clone New Repository" button
2. Enter the SSH URL of your Git repository (e.g., `git@github.com:yourusername/blog_content.git`)
3. Click "Clone Repository"
4. Wait for the cloning process to complete

### Syncing a Repository

To pull the latest changes from a remote repository:

1. Find the repository card on the dashboard
2. Click the "Pull Latest Changes" button (with a downward arrow icon)
3. A loading spinner will appear to indicate the pull operation is in progress
4. Wait for the sync process to complete
5. The button will be re-enabled once the operation is finished

## User Interface Overview

### Dark Mode Support

The MDX Blog Content Manager features comprehensive dark mode support throughout the application:

- Toggle between light and dark mode using the theme toggle in the header
- Consistent styling across all components in both themes, including confirmation dialogs
- Optimized contrast ratios for better readability
- Custom scrollbar styling in dark mode
- Modern card styling with subtle shadows and hover effects
- Appropriate icon coloring for both light and dark themes

### Modern UI Elements

The application uses modern UI design patterns for an improved user experience:

- Input fields with rounded corners, proper padding and focus states
- Subtle shadow effects and smooth transitions for interactive elements
- Consistent styling for buttons and form elements
- Visual feedback for hover and active states
- Responsive design that adapts to different screen sizes

## Post Management

### Viewing Posts

1. Select a repository from the dashboard
2. The posts list will display with the following information for each post:
   - **Hero Image Thumbnail**: Visual preview of the post's hero image
   - **Title**: The post title as defined in frontmatter
   - **Excerpt**: Brief description from the frontmatter
   - **Tags**: Color-coded tags for easy categorization
   - **Author**: Post author name from frontmatter
   - **Date**: Publication date in readable format
   - **Category**: Post category if specified in frontmatter
   - **Featured Status**: Yellow star icon indicates featured posts
   - **Delete Button**: Red trash icon for post deletion

#### Post Card Layout
- **Desktop**: Horizontal layout with image on the left and content on the right
- **Mobile**: Responsive vertical layout optimized for mobile devices
- **Interactive Elements**: Hover effects and smooth transitions
- **Mobile Experience**: Fully responsive with proper overflow prevention and touch-friendly buttons

- Posts are displayed 10 per page
- Use the pagination controls at the bottom of the list to navigate between pages
- When switching between repositories, the page automatically resets to page 1
- The current page is preserved when navigating to and from the post editor

### Deleting Posts

To delete a blog post:

1. Find the post you want to delete in the posts list
2. Click the delete button (red trash icon) on the post card
3. A confirmation dialog will appear asking you to confirm the deletion
4. Click "Delete" to permanently remove the post and its associated images
5. Click "Cancel" if you changed your mind

> **Note:** Post deletion permanently removes both the MDX file and the associated images folder. This action cannot be undone unless you have a backup or the changes haven't been committed yet.

### Featured Posts

Posts can be marked as featured, indicated by a yellow star icon in the top-right corner of the post card. Featured posts are highlighted for special attention.

### Categories

Posts can be organized by categories, which are displayed alongside the author and date information. Categories help organize and filter content effectively.

### Searching and Filtering Posts

1. Use the search box above the posts list to find specific posts
2. Filter by tags using the tag dropdown menu
3. Filter by category using the category filter

## Content Editing

### Opening the Editor

Click on any post in the posts list to open it in the editor.

### Editor Tabs

The editor has three main tabs:

1. **Content** - Edit the MDX content
2. **Metadata** - Edit frontmatter fields
3. **Images** - Manage post images

### Editing Content

In the Content tab, you can:

1. Edit MDX content directly
2. Toggle preview mode to see how the content will render

#### Editor Features

- Edit markdown content directly
- Use standard markdown syntax for formatting:
  - **Bold** and *italic* text
  - Links using `[text](url)` syntax
  - Lists with `- ` or `1. ` prefixes
  - Code blocks with triple backticks
  - Images with `![alt text](image-path)` syntax
- Toggle between editing and preview mode with the "Preview" button

### Editing Metadata

In the Metadata tab, you can edit:

- Title
- Featured post toggle (mark posts as featured)
- Slug (URL path)
- Publication date
- Author
- Category
- Tags (add/remove)
- Excerpt
- Hero image information

## Image Management

### Viewing Images

The Images tab shows:

- Hero image (if present) - displayed at the same size as content images for consistent UI
- All images used in the post content

### Replacing Images

You can replace images in two ways:

#### Method 1: Upload from your computer

1. Go to the Images tab
2. Click "Replace Image" on the image you want to replace
3. A replacement interface will appear directly below the selected image
4. Drag and drop a new image or click to select one from your computer
5. The image will be uploaded and replaced in the post

#### Method 2: Import from URL

1. Go to the Images tab
2. Click "Replace Image" on the image you want to replace
3. In the replacement interface that appears below the selected image, paste an image URL in the "Import from URL" field
4. Click the "Import" button
5. The system will fetch the image from the URL, upload it, and replace the existing image

### Stamping Images with Logos

The application allows you to overlay repository logos onto your images:

1. Go to the Images tab
2. Click "Stamp Image" on the image you want to add a logo to
3. A stamping interface will appear below the selected image
4. From the dropdown, select the repository whose logo you want to use (each repo should have a logo.png in its root)
5. Click the "Stamp Now" button
6. The system will overlay the selected repository's logo onto the bottom-right corner of your image
7. The original image will be replaced with the stamped version

**Note:** For best results, repository logos should have a transparent background. Logos will be resized to 128x128 pixels and placed at the bottom-right with proper padding.

### Stamping Images with Dates

The application allows you to overlay date stamps onto your images with professional styling:

1. Go to the Images tab
2. Click "Stamp Date" on the image you want to add a date to
3. A date stamping interface will appear below the selected image
4. Enter your desired date in DD/MM/YYYY format (e.g., "07/06/2025")
5. The date input field is pre-populated with today's date for convenience
6. Click the "Stamp Date" button
7. The system will overlay the date onto the top-right corner of your image with a semi-transparent background
8. The original image will be replaced with the date-stamped version

**Date Stamp Features:**
- **Responsive Design**: Font size and spacing automatically adjust based on image dimensions (32-48px range)
- **Color-Coded Components**: 
  - Day: Gold/amber color
  - Month: Light blue
  - Year: Light green
  - Separators ("/"): White
- **Professional Styling**: Semi-transparent background with text stroke for visibility
- **Perfect Centering**: Date components are evenly spaced and centered within the background rectangle
- **Format Preservation**: Maintains original image format and transparency (PNG, JPEG, WebP)
- **Quality Optimization**: Balanced compression to maintain visual quality while controlling file size

**Note:** Date stamps are positioned in the top-right corner with responsive margins. The format is always DD / MM / YYYY with proper spacing between components.

### Image Best Practices

- Use optimized images (JPEG, PNG, or WebP)
- Keep file sizes reasonable (under 500KB recommended)
- Use descriptive alt text for accessibility
- When importing from URLs, ensure the source allows hotlinking/downloading

## Saving and Publishing

### Saving Changes

1. While editing a post, click the "Save Changes" button in the editor toolbar
2. This will save your changes to the file system but will not commit them to the repository
3. The button will be disabled if there are no unsaved changes
4. A loading state will be displayed while the save operation is in progress
5. Your changes will be saved locally to the cloned repository

### Committing Changes

1. Click the "Commit Changes" button in the top navigation bar
2. Enter a descriptive commit message explaining your changes
3. Click "Commit & Push" to commit your changes and push them to the remote repository
4. A loading state will indicate the progress of the commit and push operation

### Navigating Back

1. Click the "Back to List" button to return to the posts listing page
2. If you have unsaved changes, you will be prompted to save them before navigating away

### Publishing Changes

After committing, your changes will be pushed to the remote git repository. This will:

1. Make changes available to other team members
2. Trigger any deployment pipelines connected to your repository
3. Allow you to revert changes if needed through standard git operations

## Keyboard Shortcuts

- **Ctrl/Cmd + S**: Save changes
- **Ctrl/Cmd + P**: Toggle preview mode
- **Ctrl/Cmd + R**: Toggle raw markdown mode
- **Ctrl/Cmd + 1**: Switch to Content tab
- **Ctrl/Cmd + 2**: Switch to Metadata tab
- **Ctrl/Cmd + 3**: Switch to Images tab
- **Esc**: Close modal dialogs

## Troubleshooting

### Common Issues

**Q: I can't clone a repository.**  
A: Make sure your SSH keys are properly configured and have access to the repository.

**Q: My changes weren't saved.**  
A: Check if there were any error notifications. Make sure you clicked the "Save Changes" button.

**Q: Image upload fails.**  
A: Check that the image format is supported (JPEG, PNG, GIF) and that the file isn't too large.

**Q: Commit and push failed.**  
A: Ensure you have write access to the repository. Check if there are any conflicts that need to be resolved.

**Q: The UI appears unstyled or styling is inconsistent.**  
A: The application uses pre-compiled Tailwind CSS. If styles aren't loading correctly:
1. Make sure you're running the application with the proper scripts (`npm run dev` or `npm run build`)
2. Verify that the CSS file was generated correctly in `public/tailwind-output.css`
3. Try clearing your browser cache with Ctrl+F5
4. Check that the custom `_document.tsx` file includes the CSS stylesheet link

### Need More Help?

If you encounter any issues not covered here:

1. Check the console for error messages
2. Review the project documentation
3. Submit an issue on the GitHub repository with detailed information about your problem
