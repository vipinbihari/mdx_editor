import React, { useState, useEffect } from 'react';
import { Repository } from '@/types';
import Button from './ui/Button';
import ConfirmDialog from './ConfirmDialog';

interface RepoSelectorProps {
  repositories: Repository[];
  currentRepo: Repository | null;
  onSelectRepo: (repo: Repository | null) => void;
  loading: boolean;
}

const RepoSelector: React.FC<RepoSelectorProps> = ({
  repositories,
  currentRepo,
  onSelectRepo,
  loading,
}) => {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [cloneLoading, setCloneLoading] = useState(false);
  const [pullingRepos, setPullingRepos] = useState<{[key: string]: boolean}>({});
  const [deletingRepo, setDeletingRepo] = useState<Repository | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-extract repo name from URL
    if (newRepoUrl) {
      try {
        const url = new URL(newRepoUrl);
        const repoName = url.pathname.split('/').pop()?.replace('.git', '');
        if (repoName) {
          setNewRepoName(repoName);
        }
      } catch {
        // Ignore invalid URL format during typing
      }
    }
  }, [newRepoUrl]);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRepoUrl || !newRepoName) {
      setError('Please enter both repository URL and name');
      return;
    }
    
    try {
      setCloneLoading(true);
      const response = await fetch('/api/repositories/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: newRepoUrl,
          name: newRepoName,
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        // Reset form and hide it
        setNewRepoUrl('');
        setNewRepoName('');
        setShowAddNew(false);
        setError(null);
        
        // Reload repositories or add the new one to the list
        // This would typically be handled by the parent component
        if (data.repository) {
          onSelectRepo(data.repository);
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to clone repository');
    } finally {
      setCloneLoading(false);
    }
  };
  
  const handlePullRepo = async (repo: Repository) => {
    try {
      // Set the loading state for this specific repo
      setPullingRepos(prev => ({ ...prev, [repo.name]: true }));
      
      const response = await fetch(`/api/repositories/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoName: repo.name }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        // Handle successful pull
        // Maybe show a notification
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to pull repository');
    } finally {
      // Clear the loading state for this repo
      setPullingRepos(prev => {
        const newState = { ...prev };
        delete newState[repo.name];
        return newState;
      });
    }
  };

  const handleDeleteRepo = async () => {
    if (!deletingRepo) return;
    
    try {
      const response = await fetch(`/api/repositories/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoName: deletingRepo.name }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        // Handle successful deletion - reload repositories list or remove from current list
        // This should typically be handled by the parent component
        setIsDeleteConfirmOpen(false);
        setDeletingRepo(null);
        
        // If current repo is deleted, set it to null
        if (currentRepo?.name === deletingRepo.name) {
          const nextRepo = repositories.find(r => r.name !== deletingRepo.name);
          if (nextRepo) {
            onSelectRepo(nextRepo);
          } else {
            // Pass null but handle it in the parent component
            onSelectRepo(null);
          }
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to delete repository');
    }
  };
  
  return (
    <div className="card p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Git Repositories</h2>
        
        <div>
          {!showAddNew ? (
            <Button
              onClick={() => setShowAddNew(true)}
              variant="outline"
              disabled={loading}
              leftIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              }
            >
              Add Repository
            </Button>
          ) : (
            <Button
              onClick={() => setShowAddNew(false)}
              variant="ghost"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {showAddNew && (
        <form onSubmit={handleAddRepo} className="mb-6 p-5 border border-gray-200 dark:border-gray-700 rounded-lg dark:bg-gray-800 shadow-sm hover:shadow-md transition-all duration-200">
          <h3 className="text-lg font-medium mb-4 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Clone New Repository
          </h3>
          
          <div className="mb-3">
            <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Repository URL (SSH)
            </label>
            <input
              type="text"
              id="repoUrl"
              value={newRepoUrl}
              onChange={(e) => setNewRepoUrl(e.target.value)}
              className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:dark:border-primary-400 focus:dark:ring-primary-400/20 focus:outline-none"
              placeholder="git@github.com:username/repo.git"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="repoName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Repository Name
            </label>
            <input
              type="text"
              id="repoName"
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:dark:border-primary-400 focus:dark:ring-primary-400/20 focus:outline-none"
              placeholder="blog_content_english"
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary w-full dark:bg-primary-700 dark:hover:bg-primary-800 dark:text-white py-2 rounded-md flex items-center justify-center transition-all duration-200 mt-2 shadow-sm hover:shadow"
            disabled={cloneLoading}
          >
            {cloneLoading ? 'Cloning...' : 'Clone Repository'}
          </button>
        </form>
      )}
      
      {loading ? (
        <div className="py-4 text-center">
          <svg className="animate-spin h-6 w-6 mx-auto text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Loading repositories...</p>
        </div>
      ) : repositories.length === 0 ? (
        <div className="py-8 text-center border border-dashed rounded-lg dark:border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No repositories</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-300">Get started by adding a new repository</p>
        </div>
      ) : (
        <div className="space-y-3">
          {repositories.map((repo) => (
            <div
              key={repo.name}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border ${
                currentRepo?.name === repo.name
                  ? 'border-primary-500 bg-primary-50 dark:bg-gray-800 dark:border-primary-500'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
              }"
            >
              <div className="flex items-center mb-2 sm:mb-0 w-full min-w-0">
                <div 
                  className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${
                    repo.isCloned ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h3 className="font-medium text-gray-800 dark:text-white truncate">{repo.name}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-300 truncate max-w-full">{repo.path}</p>
                </div>
            </div>
            
            <div className="flex items-center justify-end space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
              <button
                onClick={() => handlePullRepo(repo)}
                className="p-1.5 sm:p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-gray-700 rounded-md flex items-center justify-center"
                title="Pull latest changes"
                disabled={pullingRepos[repo.name]}
              >
                {pullingRepos[repo.name] ? (
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <div className="flex space-x-1 sm:space-x-2">
                <Button
                  onClick={() => onSelectRepo(repo)}
                  disabled={loading || pullingRepos[repo.name]}
                  variant={currentRepo?.name === repo.name ? 'primary' : 'outline'}
                  size="sm"
                >
                  {currentRepo?.name === repo.name ? 'Selected' : 'Select'}
                </Button>
                <Button
                  onClick={() => {
                    setDeletingRepo(repo);
                    setIsDeleteConfirmOpen(true);
                  }}
                  disabled={loading || pullingRepos[repo.name]}
                  variant="danger"
                  size="sm"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
      
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Repository"
        message={`Are you sure you want to delete the repository '${deletingRepo?.name}'? This will permanently remove the folder from your filesystem.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleDeleteRepo}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeletingRepo(null);
        }}
      />
    </div>
  );
};

export default RepoSelector;
