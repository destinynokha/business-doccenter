import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Head from 'next/head'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [activeSection, setActiveSection] = useState('dashboard')
  const [uploading, setUploading] = useState(false)

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!session) {
    return (
      <>
        <Head>
          <title>Business DocCenter - Sign In</title>
        </Head>
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
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Main Dashboard
  return (
    <>
      <Head>
        <title>Business DocCenter - Dashboard</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg">
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
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    {session.user.permissions || 'Admin'}
                  </span>
                </div>
                
                <button
                  onClick={() => signOut()}
                  className="bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 flex items-center"
                >
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center mr-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="hidden md:inline">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Navigation Tabs */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: '📊' },
                { id: 'upload', name: 'Upload', icon: '📤' },
                { id: 'search', name: 'Search', icon: '🔍' },
                { id: 'compliance', name: 'Compliance', icon: '✅' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm ${
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
          {activeSection === 'dashboard' && <DashboardContent />}
          {activeSection === 'upload' && <UploadContent setUploading={setUploading} />}
          {activeSection === 'search' && <SearchContent />}
          {activeSection === 'compliance' && <ComplianceContent />}
        </div>
      </div>
    </>
  )
}

// Dashboard Content Component
function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Active Entities', value: '4', color: 'blue', icon: '🏢' },
          { title: 'Total Documents', value: '1,247', color: 'green', icon: '📄' },
          { title: 'Pending Filings', value: '3', color: 'red', icon: '⚠️' },
          { title: 'Staff Access', value: '2', color: 'purple', icon: '👥' }
        ].map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center text-xl`}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { action: 'GSTR1 March 2024 uploaded', entity: 'ABC Manufacturing Ltd', user: 'CA Sharma', time: '2 hours ago', icon: '📤' },
            { action: 'Balance Sheet uploaded', entity: 'XYZ Trading Co', user: 'Staff Member', time: '1 day ago', icon: '📊' },
            { action: 'New Aadhar Card added', entity: 'Family Documents', user: 'You', time: '3 days ago', icon: '🆔' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg">
              <span className="text-2xl">{activity.icon}</span>
              <div className="flex-1">
                <p className="font-medium">{activity.action}</p>
                <p className="text-sm text-gray-600">{activity.entity} • {activity.user}</p>
              </div>
              <span className="text-sm text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Upload Content Component
function UploadContent({ setUploading }) {
  const [formData, setFormData] = useState({
    entity: '',
    category: '',
    financialYear: '',
    month: '',
    files: null,
    description: '',
    tags: ''
  })

  const entities = [
    'ABC Manufacturing Ltd',
    'XYZ Trading Co', 
    'Family Business 3',
    'Personal - Director',
    'Personal - Spouse',
    'Personal - Children'
  ]

  const categories = [
    'GST (GSTR1, GSTR3B, 2A, 2B)',
    'Income Tax (ITR, Tax Audit)',
    'ROC (Annual Filing, Forms)',
    'TDS (Returns, Certificates)',
    'Accounts (Balance Sheet, P&L)',
    'Bank Statements',
    'Identity Documents',
    'Others'
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setUploading(true)
    
    // Simulate upload
    setTimeout(() => {
      alert('✅ Documents uploaded successfully!')
      setUploading(false)
      setFormData({ entity: '', category: '', financialYear: '', month: '', files: null, description: '', tags: '' })
    }, 2000)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Upload Documents</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Entity/Person *</label>
            <select
              value={formData.entity}
              onChange={(e) => setFormData(prev => ({ ...prev, entity: e.target.value }))}
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
            <label className="block text-sm font-medium mb-2">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              required
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Category...</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📤</div>
          <p className="text-lg mb-2">Drop your documents here</p>
          <p className="text-gray-500 mb-4">or click to browse</p>
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => setFormData(prev => ({ ...prev, files: e.target.files }))}
            className="hidden"
            id="fileInput"
          />
          <button
            type="button"
            onClick={() => document.getElementById('fileInput').click()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Choose Files
          </button>
        </div>

        <button
          type="submit"
          disabled={!formData.entity || !formData.category || !formData.files}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-bold hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500"
        >
          Upload Documents
        </button>
      </form>
    </div>
  )
}

// Search Content Component
function SearchContent() {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Search Documents</h2>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by filename, content, or tags..."
          className="w-full p-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="text-center text-gray-500 py-12">
        <div className="text-6xl mb-4">🔍</div>
        <p>Enter a search term to find your documents</p>
        <p className="text-sm mt-2">Search works across filenames, OCR text, and tags</p>
      </div>
    </div>
  )
}

// Compliance Content Component  
function ComplianceContent() {
  const complianceItems = [
    { title: 'GSTR3B - March 2024', entity: 'ABC Manufacturing Ltd', status: 'overdue', dueDate: '20th Mar 2024' },
    { title: 'ITR Filing - FY 2023-24', entity: 'Personal', status: 'due', dueDate: '31st Jul 2024' },
    { title: 'ROC Annual Filing', entity: 'XYZ Trading Co', status: 'filed', dueDate: '15th Feb 2024' }
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Compliance Tracker</h2>
      <div className="space-y-4">
        {complianceItems.map((item, index) => (
          <div
            key={index}
            className={`border-l-4 p-4 rounded ${
              item.status === 'overdue' ? 'border-red-400 bg-red-50' :
              item.status === 'due' ? 'border-yellow-400 bg-yellow-50' :
              'border-green-400 bg-green-50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.entity} • Due: {item.dueDate}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                item.status === 'overdue' ? 'bg-red-100 text-red-800' :
                item.status === 'due' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {item.status === 'overdue' ? '🚨 Overdue' :
                 item.status === 'due' ? '⏰ Due Soon' : '✅ Filed'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
