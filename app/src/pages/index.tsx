import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Repository } from '@/types';
import RepoSelector from '@/components/RepoSelector';
import PostsList from '@/components/PostsList';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CommitChangesModal from '@/components/CommitChangesModal';

export default function Home() {
  const router = useRouter();
  const { repo: repoNameFromUrl, page: pageFromUrl } = router.query;
  
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [currentRepo, setCurrentRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [page, setPage] = useState(pageFromUrl && !isNaN(Number(pageFromUrl)) ? Number(pageFromUrl) : 1);
  const postsPerPage = 10;
  
  // Handle URL parameters when they change
  useEffect(() => {
    // Set page from URL parameter
    if (pageFromUrl && !isNaN(Number(pageFromUrl))) {
      setPage(Number(pageFromUrl));
    }
    
    // Handle repository from URL parameter
    if (repoNameFromUrl && typeof repoNameFromUrl === 'string' && repositories.length > 0) {
      const repoToSelect = repositories.find((r: Repository) => r.name === repoNameFromUrl);
      if (repoToSelect && (!currentRepo || currentRepo.name !== repoToSelect.name)) {
        // Set the current repository directly without resetting page
        setCurrentRepo(repoToSelect);
        
        // Make the API call to select the repository in the backend
        fetch(`/api/repositories/select`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ repoName: repoToSelect.name }),
        }).catch(err => {
          console.error('Error selecting repository:', err);
        });
      }
    }
  }, [pageFromUrl, repoNameFromUrl, repositories, currentRepo]);

  // Load repositories on component mount
  useEffect(() => {
    const loadRepositories = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/repositories');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          const repos = data.repositories || [];
          setRepositories(repos);
          // No longer doing repo selection here, it's handled by the URL parameters effect
        }
      } catch (err) {
        setError((err as Error).message || 'Failed to load repositories');
      } finally {
        setLoading(false);
      }
    };
    
    loadRepositories();
  }, []);
  
  // Handle repository selection (only for explicit user selection from dropdown)
  const handleSelectRepo = async (repo: Repository | null) => {
    if (!repo) {
      setCurrentRepo(null);
      router.push('/', undefined, { shallow: true });
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/repositories/select`, {
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
        // Check if this is a different repository than the current one
        const isRepoChange = !currentRepo || currentRepo.name !== repo.name;
        
        setCurrentRepo(repo);
        
        // Only reset to page 1 when explicitly switching repositories from the dropdown
        if (isRepoChange) {
          // When explicitly changing repos, reset to page 1
          setPage(1);
          
          // Update URL with the new repository and reset page to 1
          router.push({
            pathname: '/',
            query: { repo: repo.name, page: 1 },
          }, undefined, { shallow: true });
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to select repository');
    } finally {
      setLoading(false);
    }
  };
  


  // Handle commit and push
  const handleCommitChanges = async (message: string) => {
    if (!currentRepo) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/repositories/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          repoName: currentRepo.name,
          message 
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setShowCommitModal(false);
        // Show success message or notification here
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to commit changes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>MDX Blog Content Manager</title>
        <meta name="description" content="Manage your MDX blog content with ease" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Header 
        onCommitClick={() => setShowCommitModal(true)} 
        showCommitButton={Boolean(currentRepo)} 
      />
      
      <main className="container mx-auto px-4 py-8 dark:bg-gray-900">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
          MDX Blog Content Manager
        </h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="ml-2 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        <div className="mb-8">
          <RepoSelector 
            repositories={repositories} 
            currentRepo={currentRepo} 
            onSelectRepo={handleSelectRepo}
            loading={loading} 
          />
        </div>
        
        {currentRepo && (
          <PostsList 
            repoName={currentRepo.name} 
            currentPage={page}
            postsPerPage={postsPerPage}
            onPageChange={(newPage: number) => {
              setPage(newPage);
              // Update URL with the page number while preserving repo parameter
              const url = `/?repo=${currentRepo.name}&page=${newPage}`;
              router.push(url, undefined, { shallow: true });
            }}
          />
        )}
      </main>
      
      <Footer />
      
      {showCommitModal && (
        <CommitChangesModal 
          onClose={() => setShowCommitModal(false)} 
          onCommit={handleCommitChanges}
          loading={loading}
        />
      )}
    </>
  );
}
