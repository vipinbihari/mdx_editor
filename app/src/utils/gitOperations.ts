import { simpleGit, SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';
import { Repository, GitOperation } from '@/types';

const REPOS_DIR = path.join(process.cwd(), 'repositories');

// Initialize repositories directory if it doesn't exist
export const initRepoDirectory = async (): Promise<void> => {
  try {
    await fs.ensureDir(REPOS_DIR);
    console.log('Repositories directory initialized');
  } catch (error) {
    console.error('Failed to initialize repositories directory:', error);
    throw error;
  }
};

// Get repositories that are already cloned
export const getClonedRepositories = async (): Promise<Repository[]> => {
  try {
    await initRepoDirectory();
    const directories = await fs.readdir(REPOS_DIR);
    
    const repositories: Repository[] = [];
    
    for (const dir of directories) {
      const repoPath = path.join(REPOS_DIR, dir);
      const isDirectory = (await fs.stat(repoPath)).isDirectory();
      const isGitRepo = await fs.pathExists(path.join(repoPath, '.git'));
      
      if (isDirectory && isGitRepo) {
        const git = simpleGit(repoPath);
        const remotes = await git.getRemotes(true);
        
        if (remotes.length > 0) {
          repositories.push({
            name: dir,
            path: repoPath,
            url: remotes[0].refs.fetch,
            isCloned: true,
            isCurrent: false,
          });
        }
      }
    }
    
    return repositories;
  } catch (error) {
    console.error('Failed to get cloned repositories:', error);
    return [];
  }
};

// Clone a repository
export const cloneRepository = async (
  repoUrl: string,
  repoName: string
): Promise<Repository | null> => {
  try {
    await initRepoDirectory();
    const repoPath = path.join(REPOS_DIR, repoName);
    
    // Check if directory already exists
    if (await fs.pathExists(repoPath)) {
      throw new Error(`Repository path ${repoPath} already exists`);
    }
    
    const git = simpleGit();
    
    // Clone the repository with SSH and depth=1 for shallow clone
    await git.clone(repoUrl, repoPath, ['--depth', '1']);
    console.log(`Repository ${repoName} cloned successfully with depth=1`);
    
    return {
      name: repoName,
      path: repoPath,
      url: repoUrl,
      isCloned: true,
      isCurrent: false,
    };
  } catch (error) {
    console.error(`Failed to clone repository ${repoName}:`, error);
    return null;
  }
};

// Pull latest changes from a repository
export const pullRepository = async (repoPath: string): Promise<boolean> => {
  try {
    const git = simpleGit(repoPath);
    
    // Pull the latest changes
    const pullResult = await git.pull();
    console.log(`Repository at ${repoPath} pulled successfully:`, pullResult);
    
    return true;
  } catch (error) {
    console.error(`Failed to pull repository at ${repoPath}:`, error);
    return false;
  }
};

// Commit changes to a repository
export const commitChanges = async (
  repoPath: string,
  message: string
): Promise<boolean> => {
  try {
    const git = simpleGit(repoPath);
    
    // Add all changes
    await git.add('.');
    
    // Check if there are changes to commit
    const status = await git.status();
    
    if (!status.staged.length && !status.created.length && !status.deleted.length) {
      console.log('No changes to commit');
      return true;
    }
    
    // Commit the changes
    const commitResult = await git.commit(message);
    console.log(`Changes committed to ${repoPath}:`, commitResult);
    
    return true;
  } catch (error) {
    console.error(`Failed to commit changes to repository at ${repoPath}:`, error);
    return false;
  }
};

// Push changes to remote repository
export const pushChanges = async (repoPath: string): Promise<boolean> => {
  try {
    const git = simpleGit(repoPath);
    
    // Push the changes
    const pushResult = await git.push();
    console.log(`Changes pushed from ${repoPath}:`, pushResult);
    
    return true;
  } catch (error) {
    console.error(`Failed to push changes from repository at ${repoPath}:`, error);
    return false;
  }
};

// Full operation to commit and push changes
export const commitAndPushChanges = async (
  repoPath: string,
  message: string
): Promise<boolean> => {
  try {
    const commitSuccess = await commitChanges(repoPath, message);
    
    if (!commitSuccess) {
      return false;
    }
    
    const pushSuccess = await pushChanges(repoPath);
    return pushSuccess;
  } catch (error) {
    console.error(`Failed to commit and push changes to repository at ${repoPath}:`, error);
    return false;
  }
};

// Get the status of a repository
export const getRepositoryStatus = async (
  repoPath: string
): Promise<{ clean: boolean; status: any }> => {
  try {
    const git = simpleGit(repoPath);
    
    // Get the status
    const status = await git.status();
    const isClean = status.isClean();
    
    return {
      clean: isClean,
      status,
    };
  } catch (error) {
    console.error(`Failed to get status of repository at ${repoPath}:`, error);
    throw error;
  }
};
