import { useState, useEffect } from 'react';

export default function ShareFolder({ entityName }) {
  const [folders, setFolders] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareForm, setShareForm] = useState({
    folderId: '',
    folderName: '',
    email: '',
    role: 'reader'
  });
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (entityName) {
      loadFolders();
    }
  }, [entityName]);

  const loadFolders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/folders/list?entityName=${encodeURIComponent(entityName)}`);
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const openShareModal = (folderId, folderName) => {
    setShareForm({
      folderId,
      folderName,
      email: '',
      role: 'reader'
    });
    setShowShareModal(true);
  };

  const handleShare = async (e) => {
    e.preventDefault();
    
    if (!shareForm.email) {
      alert('Please enter an email address');
      return;
    }

    setSharing(true);
    try {
      const response = await fetch('/api/folders/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: shareForm.folderId,
          email: shareForm.email,
          role: shareForm.role
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${shareForm.folderName} shared with ${shareForm.email} successfully!`);
        setShowShareModal(false);
        setShareForm({ folderId: '', folderName: '', email: '', role: 'reader' });
      } else {
        throw new Error(result.error || 'Failed to share folder');
      }
    } catch (error) {
      console.error('Share error:', error);
      alert('❌ Failed to share folder: ' + error.message);
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading folders...</p>
      </div>
    );
  }

  if (!folders) {
    return (
      <div className="text-center py-8 text-gray-600">
        No folders found for {entityName}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Share Folders - {entityName}</h3>
        
        {/* Main Entity Folder */}
        <div className="border rounded-lg p-4 mb-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📁</span>
              <div>
                <h4 className="font-bold">{folders.entityFolder.name}</h4>
                <p className="text-sm text-gray-600">Main entity folder</p>
              </div>
            </div>
            <button
              onClick={() => openShareModal(folders.entityFolder.id, folders.entityFolder.name)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Category Subfolders */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700 mb-2">Category Folders:</h4>
          {folders.subfolders.length === 0 ? (
            <p className="text-gray-500 text-sm">No category folders yet</p>
          ) : (
            folders.subfolders.map((folder) => (
              <div key={folder.id} className="border rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">📂</span>
                    <div>
                      <p className="font-medium">{folder.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openShareModal(folder.id, folder.name)}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    Share
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Share Folder</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Sharing:</p>
              <p className="font-medium">{shareForm.folderName}</p>
            </div>

            <form onSubmit={handleShare} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={shareForm.email}
                  onChange={(e) => setShareForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="colleague@example.com"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Permission Level</label>
                <select
                  value={shareForm.role}
                  onChange={(e) => setShareForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reader">Viewer (Can view only)</option>
                  <option value="commenter">Commenter (Can view and comment)</option>
                  <option value="writer">Editor (Can view, comment, and edit)</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sharing}
                  className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
                >
                  {sharing ? 'Sharing...' : 'Share Folder'}
                </button>
              </div>
            </form>

            <p className="text-xs text-gray-500 mt-4">
              The recipient will receive an email notification with access to this folder.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
