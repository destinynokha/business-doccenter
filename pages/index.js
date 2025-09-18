import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { SessionProvider } from 'next-auth/react'
import Head from 'next/head'
import ViewDocuments from '../components/ViewDocuments'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [searchQuery, setSearchQuery] = useState('')
  const [dashboardData, setDashboardData] = useState({
    entities: [],
    latestFiles: {},
    stats: { totalDocuments: 0, activeEntities: 0, totalSize: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      signIn('google')
      return
    }
    loadDashboardData()
  }, [session, status])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/data')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearching(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Kolkata'
    })
  }

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('image')) return '🖼️'
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
    return '📎'
  }

  const openFileInDrive = (webViewLink, fileId) => {
    const url = webViewLink || `https://drive.google.com/file/d/${fileId}/view`
    window.open(url, '_blank')
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Business DocCenter</h1>
            <p className="text-gray-600 mb-8">Secure multi-entity document management</p>
            <button 
              onClick={() => signIn('google')}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Business DocCenter - Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h1 className="text-xl font-bold">Business DocCenter</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{session.user.name}</p>
                    <p className="text-xs opacity-75">{session.user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 flex items-center transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Search Bar */}
        <div className="bg-white shadow-sm border-b sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Smart search: filename, OCR text, tags, year (2024-25), month (March)..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={searching}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: '📊' },
                { id: 'upload', name: 'Upload', icon: '📤' },
                { id: 'view-documents', name: 'View Documents', icon: '📂' },
                { id: 'manage-access', name: 'Manage Access', icon: '👥' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSection(tab.id)
                    setSearchResults([]) // Clear search when changing tabs
                  }}
                  className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeSection === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-6 bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Search Results ({searchResults.length})</h3>
                <button
                  onClick={() => setSearchResults([])}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid gap-4">
                {searchResults.map((file) => (
                  <div key={file.id} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                       onClick={() => openFileInDrive(file.webViewLink, file.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-600 hover:underline">{file.name}</h4>
                          <p className="text-sm text-gray-500">
                            {file.path} • {formatFileSize(file.size)} • {formatDate(file.createdTime)}
                          </p>
                          {file.ocrText && (
                            <p className="text-xs text-gray-400 mt-1">
                              OCR: {file.ocrText.substring(0, 100)}...
                            </p>
                          )}
                          {file.tags && file.tags.length > 0 && (
                            <div className="mt-1">
                              {file.tags.map((tag, index) => (
                                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Content */}
          {activeSection === 'dashboard' && (
            <DashboardContent 
              dashboardData={dashboardData} 
              formatDate={formatDate}
              formatFileSize={formatFileSize}
              getFileIcon={getFileIcon}
              openFileInDrive={openFileInDrive}
            />
          )}
          {activeSection === 'upload' && (
            <UploadContent onUploadComplete={loadDashboardData} />
          )}
          {activeSection === 'view-documents' && (
            <ViewDocuments />
          )}
          {activeSection === 'manage-access' && (
            <ManageAccessContent />
          )}
        </div>
      </div>
    </>
  )
}

// Dashboard Content Component
function DashboardContent({ dashboardData, formatDate, formatFileSize, getFileIcon, openFileInDrive }) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏢</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Entities</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.activeEntities}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Documents</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.totalDocuments.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">💾</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Storage</p>
              <p className="text-2xl font-bold text-gray-900">{formatFileSize(dashboardData.stats.totalSize)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Files by Entity */}
      <div className="space-y-6">
        {Object.entries(dashboardData.latestFiles).map(([entityName, files]) => (
          <div key={entityName} className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">{entityName}</h3>
              <p className="text-sm text-gray-500">Latest {files.length} documents</p>
            </div>
            <div className="p-6">
              {files.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No documents yet</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition-shadow"
                      onClick={() => openFileInDrive(file.webViewLink, file.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-xl">{getFileIcon(file.mimeType)}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-blue-600 hover:underline truncate">
                            {file.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">
                            {file.path}
                          </p>
                          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                            <span>{formatFileSize(file.size)}</span>
                            <span>{formatDate(file.createdTime)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Enhanced Upload Component with All Features
function UploadContent({ onUploadComplete }) {
  const [formData, setFormData] = useState({
    entityName: '',
    category: '',
    financialYear: '',
    month: '',
    files: null,
    customFileName: '',
    description: '',
    tags: ''
  })
  const [uploading, setUploading] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [ocrProcessing, setOcrProcessing] = useState(false)
  
  // Generate Indian Financial Years dynamically
  const generateFinancialYears = () => {
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth()
    const startYear = currentMonth >= 3 ? currentYear : currentYear - 1
    
    const years = []
    for (let year = 1950; year <= startYear + 1; year++) {
      years.push({
        value: `${year}-${(year + 1).toString().slice(-2)}`,
        label: `FY ${year}-${(year + 1).toString().slice(-2)}`
      })
    }
    return years.reverse()
  }

  const entities = [
    'ABC Manufacturing Ltd',
    'XYZ Trading Co', 
    'Family Business 3',
    'Personal - Director',
    'Personal - Spouse',
    'Personal - Children',
    'Personal - Parents'
  ]

  const categories = [
    'GST',
    'Income Tax',
    'ROC', 
    'TDS',
    'Accounts',
    'Bank Statements',
    'Identity Documents',
    'Others'
  ]

  const months = [
    { value: '1', label: 'January' }, { value: '2', label: 'February' },
    { value: '3', label: 'March' }, { value: '4', label: 'April' },
    { value: '5', label: 'May' }, { value: '6', label: 'June' },
    { value: '7', label: 'July' }, { value: '8', label: 'August' },
    { value: '9', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ]

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    setFormData(prev => ({ ...prev, files }))

    // Process OCR for images and PDFs
    const processableFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.includes('pdf')
    )
    
    if (processableFiles.length > 0) {
      setOcrProcessing(true)
      try {
        const Tesseract = (await import('tesseract.js')).default
        
        let combinedOcrText = ''
        for (const file of processableFiles) {
          if (file.type.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(file, 'eng+hin')
            combinedOcrText += text + '\n\n'
          }
        }
        
        setOcrText(combinedOcrText.trim())
      } catch (error) {
        console.error('OCR processing failed:', error)
      } finally {
        setOcrProcessing(false)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.files || formData.files.length === 0) {
      alert('Please select at least one file to upload.')
      return
    }

    if (!formData.entityName) {
      alert('Please select an entity.')
      return
    }

    setUploading(true)

    try {
      const uploadFormData = new FormData()
      
      uploadFormData.append('entityName', formData.entityName)
      uploadFormData.append('category', formData.category)
      uploadFormData.append('financialYear', formData.financialYear)
      uploadFormData.append('month', formData.month)
      uploadFormData.append('customFileName', formData.customFileName)
      uploadFormData.append('description', formData.description)
      uploadFormData.append('tags', formData.tags)
      uploadFormData.append('ocrText', ocrText)

      Array.from(formData.files).forEach(file => {
        uploadFormData.append('documents', file)
      })

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const result = await response.json()

      if (response.ok) {
        alert(`✅ ${result.files.length} file(s) uploaded successfully!`)
        
        // Reset form
        setFormData({
          entityName: '',
          category: '',
          financialYear: '',
          month: '',
          files: null,
          customFileName: '',
          description: '',
          tags: ''
        })
        setOcrText('')
        
        const fileInput = document.getElementById('fileInput')
        if (fileInput) fileInput.value = ''

        if (onUploadComplete) onUploadComplete()
        
      } else {
        throw new Error(result.error || 'Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('❌ Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Upload Documents</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entity Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Entity/Person *</label>
            <select
              value={formData.entityName}
              onChange={(e) => setFormData(prev => ({ ...prev, entityName: e.target.value }))}
              required
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose Entity...</option>
              {entities.map(entity => (
                <option key={entity} value={entity}>{entity}</option>
              ))}
            </select>
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

        {/* Year and Month Selection - Show when category is selected and not Others */}
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
            <>
              <span className="mr-2">📤</span>
              Upload Documents
            </>
          )}
        </button>
      </form>
    </div>
  )
}

// Manage Access Component
function ManageAccessContent() {
  const [staffMembers, setStaffMembers] = useState([])
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'upload_only' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStaffMembers()
  }, [])

  const loadStaffMembers = async () => {
    try {
      // This would load from your staff management system
      // For now, showing example data
      setStaffMembers([
        {
          name: 'CA Rajesh Sharma',
          email: 'ca.rajesh@example.com',
          role: 'full_access',
          status: 'active',
          createdDate: '2024-01-15'
        }
      ])
    } catch (error) {
      console.error('Error loading staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const addStaffMember = async (e) => {
    e.preventDefault()
    if (!newStaff.name || !newStaff.email) return

    // Add to local state for demo
    const newMember = {
      ...newStaff,
      status: 'active',
      createdDate: new Date().toISOString().split('T')[0]
    }
    
    setStaffMembers(prev => [...prev, newMember])
    setNewStaff({ name: '', email: '', role: 'upload_only' })
    
    alert(`✅ ${newStaff.name} added successfully!`)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Manage Staff Access</h2>
      
      {/* Add New Staff */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-blue-800 mb-4">Add New Staff Member</h3>
        <form onSubmit={addStaffMember} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={newStaff.name}
            onChange={(e) => setNewStaff(prev => ({ ...prev, name: e.target.value }))}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={newStaff.email}
            onChange={(e) => setNewStaff(prev => ({ ...prev, email: e.target.value }))}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
            required
          />
          <select
            value={newStaff.role}
            onChange={(e) => setNewStaff(prev => ({ ...prev, role: e.target.value }))}
            className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="upload_only">Upload Only</option>
            <option value="full_access">Full Access</option>
            <option value="view_only">View Only</option>
          </select>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Staff
          </button>
        </form>
      </div>

      {/* Current Staff */}
      <div className="space-y-4">
        <h3 className="font-bold text-lg">Current Staff Members</h3>
        {staffMembers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No staff members added yet</p>
        ) : (
          staffMembers.map((staff, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white">
                    {staff.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold">{staff.name}</h4>
                    <p className="text-sm text-gray-600">{staff.email}</p>
                    <p className="text-xs text-gray-500">Added: {staff.createdDate}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    staff.role === 'full_access' ? 'bg-green-100 text-green-800' :
                    staff.role === 'upload_only' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {staff.role === 'full_access' ? 'Full Access' :
                     staff.role === 'upload_only' ? 'Upload Only' : 'View Only'}
                  </span>
                  <div className="flex space-x-2">
                    <button className="text-blue-500 text-sm hover:underline">
                      {staff.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button className="text-red-500 text-sm hover:underline">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
