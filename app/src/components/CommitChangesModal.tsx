import React, { useState } from 'react';
import Button from './ui/Button';

interface CommitChangesModalProps {
  onClose: () => void;
  onCommit: (message: string) => void;
  loading: boolean;
}

const CommitChangesModal: React.FC<CommitChangesModalProps> = ({
  onClose,
  onCommit,
  loading,
}) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    onCommit(message);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 border dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Commit Changes</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="commitMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Commit Message
            </label>
            <textarea
              id="commitMessage"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full h-24 resize-none border rounded-lg p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:placeholder-gray-400"
              placeholder="Describe the changes you&apos;ve made..."
              required
              disabled={loading}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
              size="md"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || !message.trim()}
              isLoading={loading}
              size="md"
              className="shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              {loading ? 'Committing...' : 'Commit & Push'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CommitChangesModal;
