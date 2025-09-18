import { useState, useEffect } from 'react';

export default function ViewDocuments() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [entities, setEntities] = useState([]);
  const [folderStructure, setFolderStructure] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  useEffect(() => {
    loadEntities();
  }, []);

  useEffect(() => {
    if (selectedEntity) {
      loadFolderStructure(selectedEntity);
    }
  }, [selectedEntity]);

  const loadEntities = async () => {
    try {
      const response = await fetch('/api/entities/list');
      if (response.ok) {
        const data = await response.json();
        setEntities(data);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  };

  const loadFolderStructure = async (entityName) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/structure?entity=${encodeURIComponent(entityName)}`);
      if (response.ok) {
        const data = await response.json();
        setFolderStructure(data);
        setCurrentPath([entityName]);
      }
    } catch (error) {
      console.error('Error loading folder structure:', error);
      setFolderStructure(null);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    return '📎';
  };

  const openFile = (file) => {
    if (file.webViewLink) {
      window.open(file.webViewLink, '_blank');
    } else {
      window.open(`https://drive.google.com/file/d/${file.id}/view`, '_blank');
    }
  };

  const navigateToFolder = (folder, path) => {
    // This would expand folder view - for now just show message
    alert(`Navigate to: ${path.join('/')}/${folder.name}`);
  };

  const renderFolderContents = (structure) => {
    if (!structure || !structure.structure) return null;

    const folders = structure.structure.filter(item => item.type === 'folder');
    const files = structure.structure.filter(item => item.type === 'file');

    return (
      <div className="space-y-6">
        {/* Folders */}
        {folders.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Folders</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                  onClick={() => navigateToFolder(folder, currentPath)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📁</span>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{folder.name}</h5>
                      <p className="text-sm text-gray-500">
                        {folder.fileCount || 0} files
                      </p>
                      <p className="text-xs text-gray-400">
                        Created: {formatDate(folder.createdTime)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {files.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Files ({files.length})
            </h4>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => openFile(file)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-xl">{getFileIcon(file.mimeType)}</span>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-blue-600 hover:underline truncate">
                          {file.name}
                        </h5>
                        {file.path && (
                          <p className="text-sm text-gray-500 truncate">
                            Path: {file.path}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span>{formatDate(file.createdTime)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openFile(file);
                      }}
                      className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {folders.length === 0 && files.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📂</div>
            <p className="text-gray-500">No documents found</p>
            <p className="text-sm text-gray-400">Upload some documents to get started</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">View Documents</h2>
        
        {/* Entity Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Entity/Person
          </label>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full md:w-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose Entity...</option>
            {entities.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </div>

        {/* Breadcrumb */}
        {currentPath.length > 0 && (
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              {currentPath.map((path, index) => (
                <li key={index} className="inline-flex items-center">
                  {index > 0 && (
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm font-medium text-gray-500">
                    {path}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      ) : selectedEntity ? (
        renderFolderContents(folderStructure)
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📂</div>
          <p className="text-gray-500">Select an entity to view documents</p>
        </div>
      )}
    </div>
  );
}
