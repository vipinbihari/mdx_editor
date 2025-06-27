/**
 * Types for the MDX blog content manager
 */

// Represents a Git repository with blog content
export interface Repository {
  name: string;
  path: string;
  url: string;
  isCurrent: boolean;
  isCloned: boolean;
}

// Represents the frontmatter of an MDX file
export interface BlogPostFrontmatter {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags: string[];
  category: string;
  author: string;
  featured?: boolean; // Whether post is featured or not
  heroImage: string; // Path to hero image
  heroImagePrompt?: string; // Optional AI prompt used to generate the image
  quiz?: QuizQuestion[]; // Optional quiz section
}

// Optional quiz structure for blog posts
export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
}

// Represents a complete blog post with content
export interface BlogPost {
  frontmatter: BlogPostFrontmatter;
  content: string; // MDX content
  images: BlogImage[]; // List of images referenced in the content
}

// Represents an image in a blog post
export interface BlogImage {
  altText: string;
  path: string; // Path as it appears in MDX (/images/uploads/...)
  fullPath: string; // Full path on disk (/uploads/...)
  inHero: boolean; // Whether this is the hero image
  file?: File; // Optional File object for when uploading replacements
}

// Represents a paginated list of blog posts
export interface PostsPage {
  posts: BlogPost[];
  currentPage: number;
  totalPages: number;
  postsPerPage: number;
}

// For managing Git operations
export interface GitOperation {
  type: 'clone' | 'pull' | 'commit' | 'push';
  repoPath: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  error?: string;
}

// Application state interface
export interface AppState {
  repositories: Repository[];
  currentRepository?: Repository;
  posts: BlogPost[];
  currentPost?: BlogPost;
  pagination: {
    currentPage: number;
    postsPerPage: number;
    totalPosts: number;
  };
  gitOperations: GitOperation[];
  uiState: {
    isEditing: boolean;
    isPreviewMode: boolean;
    showRawContent: boolean;
    selectedTab: 'content' | 'metadata' | 'images' | 'heroImagePrompt';
  };
}

// Parameters for image replacement operation
export interface ImageReplaceParams {
  postSlug: string;
  oldImagePath: string;
  newImage: File;
  isHeroImage: boolean;
}
