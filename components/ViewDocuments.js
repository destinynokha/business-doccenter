import { useState, useEffect } from 'react';

export default function ViewDocuments() {
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    message: '',
    permission: 'reader'
  });
  const [sending, setSending] = useState(false);
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [selectedDocForAccess, setSelectedDocForAccess] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  useEffect(() => {
    loadEntities();
  }, []);

  useEffect(() => {
    if (selectedEntity) {
      loadDocuments(selectedEntity);
    } else {
      setDocuments([]);
    }
  }, [selectedEntity]);

  const loadEntities = async () => {
    try {
      const response = await fetch('/api/entities/list');
      if (response.ok) {
        const data = await response.json();
        setEntities(data);
        if (data.length > 0) {
          setSelectedEntity(data[0]);
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

  const toggleDocSelection = (docId) => {
    setSelectedDocs(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const selectAll = () => {
    setSelectedDocs(documents.map(doc => doc.id));
  };

  const deselectAll = () => {
    setSelectedDocs([]);
  };

  const handleEmailShare = async (e) => {
    e.preventDefault();
    
    if (selectedDocs.length === 0) {
      alert('Please select at least one document');
      return;
    }

    if (!emailForm.recipientEmail) {
      alert('Please enter recipient email');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/documents/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedDocs,
          recipientEmail: emailForm.recipientEmail,
          message: emailForm.message,
          permission: emailForm.permission
        })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.sharedCount} document(s) shared with ${emailForm.recipientEmail}`);
        setShowEmailModal(false);
        setEmailForm({ recipientEmail: '', message: '', permission: 'reader' });
        setSelectedDocs([]);
      } else {
        throw new Error(result.error || 'Failed to share documents');
      }
    } catch (error) {
      console.error('Email share error:', error);
      alert('❌ Failed to share: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const loadPermissions = async (docId) => {
    setLoadingPermissions(true);
    try {
      const response = await fetch(`/api/documents/${docId}/permissions`);
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.sharedWith || []);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const openManageAccess = (doc) => {
    setSelectedDocForAccess(doc);
    setShowManageAccess(true);
    loadPermissions(doc.id);
  };

  const handleRevokeAccess = async (email) => {
    if (!confirm(`Revoke access for ${email}?`)) return;

    try {
      const response = await fetch('/api/documents/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocForAccess.id,
          email
        })
      });

      if (response.ok) {
        alert(`✅ Access revoked for ${email}`);
        loadPermissions(selectedDocForAccess.id);
      } else {
        throw new Error('Failed to revoke access');
      }
    } catch (error) {
      alert('❌ Failed to revoke access: ' + error.message);
    }
  };

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

        {selectedEntity && (
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{selectedEntity}</h3>
              <p className="text-sm text-gray-500">
                {documents.length} document{documents.length !== 1 ? 's' : ''} found
                {selectedDocs.length > 0 && ` • ${selectedDocs.length} selected`}
              </p>
            </div>
            {documents.length > 0 && (
              <div className="flex items-center space-x-2">
                {selectedDocs.length === 0 ? (
                  <button
                    onClick={selectAll}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    Select All
                  </button>
                ) : (
                  <>
                    <button
                      onClick={deselectAll}
                      className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                    >
                      Deselect All
                    </button>
                    <button
                      onClick={() => setShowEmailModal(true)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Email {selectedDocs.length} Doc{selectedDocs.length !== 1 ? 's' : ''}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {!loading && selectedEntity && documents.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Documents Yet</h3>
          <p className="text-gray-600">
            Upload your first document for {selectedEntity} to get started
          </p>
        </div>
      )}

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
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedDocs.includes(doc.id)}
                          onChange={() => toggleDocSelection(doc.id)}
                          className="mt-1 h-5 w-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span 
                          className="text-3xl cursor-pointer"
                          onClick={() => openFile(doc.googleDriveLink, doc.googleDriveId)}
                        >
                          {getFileIcon(doc.mimeType)}
                        </span>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => openFile(doc.googleDriveLink, doc.googleDriveId)}
                        >
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openManageAccess(doc);
                          }}
                          className="text-gray-400 hover:text-blue-500"
                          title="Manage Access"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email Share Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Email Documents</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Sharing {selectedDocs.length} document(s)
            </p>

            <form onSubmit={handleEmailShare} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Email</label>
                <input
                  type="email"
                  value={emailForm.recipientEmail}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  placeholder="colleague@example.com"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Permission Level</label>
                <select
                  value={emailForm.permission}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, permission: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="reader">Viewer (Can view only)</option>
                  <option value="commenter">Commenter (Can view and comment)</option>
                  <option value="writer">Editor (Can edit)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message (Optional)</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Add a personal message..."
                  rows="3"
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-green-300"
                >
                  {sending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Access Modal */}
      {showManageAccess && selectedDocForAccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Manage Access</h3>
              <button
                onClick={() => setShowManageAccess(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">{selectedDocForAccess.fileName}</p>

            {loadingPermissions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : permissions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Not shared with anyone yet</p>
            ) : (
              <div className="space-y-3">
                {permissions.map((perm) => (
                  <div key={perm.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{perm.displayName || perm.emailAddress}</p>
                      <p className="text-sm text-gray-500">{perm.emailAddress}</p>
                      <span className="text-xs text-gray-400 capitalize">{perm.role}</span>
                    </div>
                    <button
                      onClick={() => handleRevokeAccess(perm.emailAddress)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
