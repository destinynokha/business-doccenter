import { useState, useEffect } from 'react';

export default function EnhancedUpload({ onUploadComplete }) {
  const [formData, setFormData] = useState({
    entityName: '',
    category: '',
    financialYear: '',
    month: '',
    files: null,
    customFileName: '',
    description: '',
    tags: ''
  });
  const [uploading, setUploading] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [newEntity, setNewEntity] = useState({ name: '', type: 'business' });
  const [entities, setEntities] = useState([]);
  const [creatingEntity, setCreatingEntity] = useState(false);

  const categories = [
    'GST',
    'Income Tax',
    'ROC', 
    'TDS',
    'Accounts',
    'Bank Statements',
    'Identity Documents',
    'Others'
  ];

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const response = await fetch('/api/entities/list');
      if (response.ok) {
        const data = await response.json();
        setEntities(data || []);
      } else {
        console.log('No entities found or API error');
        setEntities([]);
      }
    } catch (error) {
      console.error('Error loading entities:', error);
      setEntities([]);
    }
  };

  // Generate Indian Financial Years dynamically
  const generateFinancialYears = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
    
    const years = [];
    for (let year = 1950; year <= startYear + 1; year++) {
      years.push({
        value: `${year}-${(year + 1).toString().slice(-2)}`,
        label: `FY ${year}-${(year + 1).toString().slice(-2)}`
      });
    }
    return years.reverse();
  };

  const handleAddEntity = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!newEntity.name.trim()) {
      alert('Please enter entity name');
      return;
    }

    setCreatingEntity(true);
    try {
      const response = await fetch('/api/entities/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityName: newEntity.name.trim(),
          entityType: newEntity.type
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Add to local state immediately to prevent refresh
        const newEntityName = newEntity.name.trim();
        setEntities(prev => [...prev, newEntityName]);
        setFormData(prev => ({ ...prev, entityName: newEntityName }));
        setNewEntity({ name: '', type: 'business' });
        setShowAddEntity(false);
        alert(`✅ Entity "${newEntityName}" created successfully with folder structure!`);
      } else {
        throw new Error(result.error || 'Entity creation failed');
      }
    } catch (error) {
      console.error('Entity creation error:', error);
      alert(`❌ Entity creation failed: ${error.message}`);
    } finally {
      setCreatingEntity(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, files }));

    // Process OCR for images and PDFs
    const processableFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.includes('pdf')
    );
    
    if (processableFiles.length > 0) {
      setOcrProcessing(true);
      try {
        const Tesseract = (await import('tesseract.js')).default;
        
        let combinedOcrText = '';
        for (const file of processableFiles) {
          if (file.type.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(file, 'eng+hin');
            combinedOcrText += text + '\n\n';
          }
        }
        
        setOcrText(combinedOcrText.trim());
      } catch (error) {
        console.error('OCR processing failed:', error);
      } finally {
        setOcrProcessing(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.files || formData.files.length === 0) {
      alert('Please select at least one file to upload.');
      return;
    }

    if (!formData.entityName) {
      alert('Please select an entity.');
      return;
    }

    setUploading(true);

    try {
      const uploadFormData = new FormData();
      
      uploadFormData.append('entityName', formData.entityName);
      uploadFormData.append('category', formData.category);
      uploadFormData.append('financialYear', formData.financialYear);
      uploadFormData.append('month', formData.month);
      uploadFormData.append('customFileName', formData.customFileName);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('tags', formData.tags);
      uploadFormData.append('ocrText', ocrText);

      Array.from(formData.files).forEach(file => {
        uploadFormData.append('documents', file);
      });

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(`✅ ${result.files.length} file(s) uploaded successfully to:\n${result.files[0]?.path || 'Google Drive'}`);
        
        // Reset form without causing page refresh
        setFormData({
          entityName: '',
          category: '',
          financialYear: '',
          month: '',
          files: null,
          customFileName: '',
          description: '',
          tags: ''
        });
        setOcrText('');
        
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';

        if (onUploadComplete) onUploadComplete();
        
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleModalClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAddEntity(false);
    setNewEntity({ name: '', type: 'business' });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Upload Documents</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entity Selection with Add New Option */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Entity/Person *</label>
            <div className="flex space-x-2">
              <select
                value={formData.entityName}
                onChange={(e) => setFormData(prev => ({ ...prev, entityName: e.target.value }))}
                required
                className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose Entity...</option>
                {entities.map(entity => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowAddEntity(true);
                }}
                className="bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 whitespace-nowrap"
              >
                + Add New
              </button>
            </div>
            {entities.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No entities found. Click "+ Add New" to create your first entity.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category (Optional)</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Category...</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Add Entity Modal */}
        {showAddEntity && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleModalClose(e);
              }
            }}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">Add New Entity</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Entity Name *</label>
                  <input
                    type="text"
                    value={newEntity.name}
                    onChange={(e) => setNewEntity(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., New Company Ltd, John Smith"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEntity(e);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Entity Type</label>
                  <select
                    value={newEntity.type}
                    onChange={(e) => setNewEntity(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="business">Business</option>
                    <option value="personal">Personal</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Business: Creates GST, Income Tax, ROC folders<br/>
                    Personal: Creates Identity, Income Tax, Investment folders
                  </p>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleAddEntity}
                    disabled={creatingEntity || !newEntity.name.trim()}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {creatingEntity ? 'Creating...' : 'Create Entity'}
                  </button>
                  <button
                    type="button"
                    onClick={handleModalClose}
                    disabled={creatingEntity}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 disabled:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Year and Month Selection */}
        {formData.category && formData.category !== 'Others' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Financial Year</label>
              <select
                value={formData.financialYear}
                onChange={(e) => setFormData(prev => ({ ...prev, financialYear: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Year...</option>
                {generateFinancialYears().map(year => (
                  <option key={year.value} value={year.value}>{year.label}</option>
                ))}
              </select>
            </div>

            {['GST', 'TDS'].includes(formData.category) && (
              <div>
                <label className="block text-sm font-medium mb-2">Month (for monthly returns)</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Month...</option>
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* File Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          {formData.files ? (
            <div>
              <div className="text-4xl mb-4">✅</div>
              <p className="text-lg font-medium text-green-600 mb-2">
                {formData.files.length} file(s) selected
              </p>
              <div className="text-sm text-gray-600 space-y-1">
                {Array.from(formData.files).map((file, index) => (
                  <p key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('fileInput').click()}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Change Files
              </button>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-4">📤</div>
              <p className="text-lg mb-2">Drop documents here or click to browse</p>
              <button
                type="button"
                onClick={() => document.getElementById('fileInput').click()}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
              >
                Choose Files
              </button>
              <p className="text-xs text-gray-500 mt-2">
                All formats supported • OCR for Images & PDFs • Max 50MB per file
              </p>
            </div>
          )}
        </div>
        
        <input
          id="fileInput"
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        />

        {/* Custom filename - only show for single file */}
        {formData.files && formData.files.length === 1 && (
          <div>
            <label className="block text-sm font-medium mb-2">Custom Filename (Optional)</label>
            <input
              type="text"
              value={formData.customFileName}
              onChange={(e) => setFormData(prev => ({ ...prev, customFileName: e.target.value }))}
              placeholder="Leave empty to keep original name"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* OCR Processing Status */}
        {ocrProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
              <p className="text-blue-800">Processing OCR (English + Hindi)...</p>
            </div>
          </div>
        )}

        {/* OCR Text Display */}
        {ocrText && (
          <div>
            <label className="block text-sm font-medium mb-2">OCR Extracted Text (Editable)</label>
            <textarea
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              rows="4"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">This text will be searchable</p>
          </div>
        )}

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
              placeholder="Brief description of the document(s)"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tags (comma separated)</label>
            <textarea
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              rows="3"
              placeholder="important, verified, original, urgent"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Upload Button */}
        <button
          type="submit"
          disabled={uploading || ocrProcessing || !formData.entityName}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-bold hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all"
        >
          {uploading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Uploading Documents...
            </div>
          ) : ocrProcessing ? (
            'Processing OCR...'
          ) : (
            'Upload Documents'
          )}
        </button>
      </form>
    </div>
  );
}
