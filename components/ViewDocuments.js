import { useState, useEffect } from 'react';
import ShareFolder from './ShareFolder';

export default function ViewDocuments() {
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load entities on mount
  useEffect(() => {
    loadEntities();
  }, []);

  // Load documents when entity changes
  useEffect(() => {
    if (selectedEntity) {
      loadDocuments(selectedEntity);
    } else {
      setDocuments([]);
    }
  }, [selectedEntity]);


  const [showShare, setShowShare] = useState(false);

// Add this button near the entity selector:
{selectedEntity && (
  <button
    onClick={() => setShowShare(true)}
    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
  >
    Share Folders
  </button>
)}

  
  const loadEntities = async () => {
    try {
      const response = await fetch('/api/entities/list');
      if (response.ok) {
        const data = await response.json();
        setEntities(data);
        if (data.length > 0) {
          setSelectedEntity(data[0]); // Auto-select first entity
        }
      }
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  };

  const loadDocuments = async (entity) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/list?entity=${encodeURIComponent(entity)}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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

  const openFile = (googleDriveLink, googleDriveId) => {
    const url = googleDriveLink || `https://drive.google.com/file/d/${googleDriveId}/view`;
    window.open(url, '_blank');
  };

  // Group documents by category
  const groupedDocuments = documents.reduce((acc, doc) => {
    const category = doc.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">View Documents</h2>
        
        {/* Entity Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Entity/Person</label>
          <select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full md:w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose an entity...</option>
            {entities.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Entity Display */}
        {selectedEntity && (
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">{selectedEntity}</h3>
            <p className="text-sm text-gray-500">
              {documents.length} document{documents.length !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Documents Display */}
      {!loading && selectedEntity && documents.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Documents Yet</h3>
          <p className="text-gray-600">
            Upload your first document for {selectedEntity} to get started
          </p>
        </div>
      )}

      {/* Grouped Documents */}
      {!loading && documents.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedDocuments).map(([category, docs]) => (
            <div key={category} className="bg-white rounded-lg shadow">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-lg font-bold text-gray-900">
                  {category} ({docs.length})
                </h3>
              </div>
              <div className="p-4">
                <div className="grid gap-4">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                      onClick={() => openFile(doc.googleDriveLink, doc.googleDriveId)}
                    >
                      <div className="flex items-start space-x-4">
                        <span className="text-3xl">{getFileIcon(doc.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-blue-600 hover:underline">
                            {doc.fileName}
                          </h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {doc.filePath}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                            <span>{formatFileSize(doc.fileSize)}</span>
                            <span>•</span>
                            <span>{formatDate(doc.createdAt)}</span>
                            {doc.financialYear && (
                              <>
                                <span>•</span>
                                <span>FY {doc.financialYear}</span>
                              </>
                            )}
                          </div>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {doc.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {doc.description && (
                            <p className="text-sm text-gray-600 mt-2">{doc.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


{showShare && <ShareFolder entityName={selectedEntity} />}
