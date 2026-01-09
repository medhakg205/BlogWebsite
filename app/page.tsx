'use client'
export const dynamic = "force-dynamic";

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  // ❌ WRONG: Mixed order causing error
  // ✅ ALL useState FIRST, useEffect LAST
  const [session, setSession] = useState<any>(null)
  const [blogs, setBlogs] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDark, setIsDark] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editingBlog, setEditingBlog] = useState<any>(null)  // ✅ NEW - ALL TOGETHER
// Add these NEW states (after line 15)
const [contentFilters, setContentFilters] = useState<string[]>([]);

const [availableContentTypes, setAvailableContentTypes] = useState<string[]>([]);
const [availableTopics, setAvailableTopics] = useState<string[]>([]);

const [selectedContentType, setSelectedContentType] = useState('');
const [selectedTopicTag, setSelectedTopicTag] = useState('');
const [topicFilters, setTopicFilters] = useState<string[]>([]);
const [sidebarOpen, setSidebarOpen] = useState(false);
const [selectedBlog, setSelectedBlog] = useState<any>(null);


  // Theme colors (AFTER all hooks)
  const theme = isDark 
    ? 'bg-gray-900 text-white border-gray-700' 
    : 'bg-red-50/80 text-gray-900 border-red-200'

  // ✅ useEffect LAST - always same position
  // ✅ 1. INITIAL LOAD (runs once)
useEffect(() => {
  if (typeof window !== 'undefined') {
    setIsDark(localStorage.getItem('darkMode') === 'true')
  }
  getSession()
  fetchAvailableTags()
  fetchBlogs()
}, [])

// ✅ 2. FILTER TRIGGER (runs when filters change) 
useEffect(() => {
  fetchBlogs()
  fetchAvailableTags()
}, [contentFilters, topicFilters]); // 👈 THIS IS THE ONE YOU ASKED ABOUT

// ✅ 3. SIDEBAR ESC (moved from line 25)
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSidebarOpen(false);
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, []);

useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSidebarOpen(false);
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, []);

  const toggleDarkMode = () => {
    const newDark = !isDark
    setIsDark(newDark)
    localStorage.setItem('darkMode', newDark.toString())
  }
const openBlogModal = (blog: any) => setSelectedBlog(blog);
const closeBlogModal = () => setSelectedBlog(null);

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setSession(session)
    setLoading(false)
  }

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    else getSession()
  }

const signUp = async () => {
  console.log("⚡ SignUp started");  // TEST
  const { error } = await supabase.auth.signUp({ email, password });
  console.log("⚡ Supabase returned"); // TEST

  if (error) {
    console.log("❌ Error:", error.message);
    alert(error.message);
    return;
  }

  console.log("🎉 No error — showing alert now");
  alert("🎉 Account created! Please check your email to confirm your account.");
};


  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  const fetchBlogs = async () => {
  let query = supabase
    .from('blogs')
    .select('*')
    .order('created_at', { ascending: false });

  // ✅ FIXED: Remove 'All' check - use empty array logic
  if (contentFilters.length > 0) {
    query = query.eq('content_type', contentFilters[0]);
  }

  if (topicFilters.length > 0) {
    query = query.eq('topic_tag', topicFilters[0]);
  }

  const { data, error } = await query;
  if (error) console.error('Fetch error:', error);
  else {
    setBlogs(data || []);
  }
};

const fetchAvailableTags = async () => {
  // 👇 GET ALL TOPICS FROM blog_tags table (NOT blogs)
  const { data: topicData } = await supabase
    .from('blog_tags')
    .select('tag_name')
    .eq('tag_type', 'topic_tag')
  
  const { data: contentData } = await supabase
    .from('blog_tags')
    .select('tag_name')
    .eq('tag_type', 'content_type')
  
  const topics = topicData?.map((t: any) => t.tag_name) || []
  const contentTypes = contentData?.map((t: any) => t.tag_name) || []
  
  console.log('ALL TOPICS FROM blog_tags:', topics) // 👈 This will show ALL!
  
  setAvailableContentTypes(contentTypes)
  setAvailableTopics(topics)
}



  const createBlog = async () => {
    if (!title || !content) return alert('Title and content required')
    
    setUploading(true)
    
    let imageUrl = ''
    if (image) {
      const fileName = `${Date.now()}-${image.name}`
      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(fileName, image)
      
      if (!error && data) {
        imageUrl = fileName
      }
    }

    const { error } = await supabase
      .from('blogs')
      .insert({
        title,
        content,
        image_url: imageUrl,
        // In createBlog/updateBlog, add to insert/update:
content_type: selectedContentType,  // Add these states
topic_tag: selectedTopicTag,

        user_id: session?.user?.id
        
      })

    if (error) alert(error.message)
    else {
      setTitle('')
      setContent('')
      setImage(null)
      setShowForm(false)
      setSelectedContentType('')        
setSelectedTopicTag('')  
      fetchBlogs()

    }
    
    setUploading(false)
  }
const updateBlog = async () => {
  if (!title || !content || !editingBlog) return
  
  setUploading(true)
  
  let imageUrl = editingBlog.image_url
  if (image) {
    const fileName = `${Date.now()}-${image.name}`
    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(fileName, image)
    
    if (!error && data) {
      imageUrl = fileName
    }
  }

  const { error } = await supabase
    .from('blogs')
    .update({
      title,
      content,
      image_url: imageUrl,
      content_type: selectedContentType,  // Add these states
topic_tag: selectedTopicTag,
    })
    .eq('id', editingBlog.id)

  if (error) alert(error.message)
  else {
    setTitle('')
    setContent('')
    setImage(null)
    setEditingBlog(null)
    setShowForm(false)
    fetchBlogs()
  }
  
  setUploading(false)
}

const handleEdit = (blog: any) => {
  setEditingBlog(blog)
  setTitle(blog.title)
  setContent(blog.content)
  setShowForm(true)
  setSelectedContentType(blog.content_type || '')
  setSelectedTopicTag(blog.topic_tag || '')  
}

const handleDelete = async (blogId: string) => {
  if (!confirm('Delete this blog?')) return
  
  const { error } = await supabase
    .from('blogs')
    .delete()
    .eq('id', blogId)
  
  if (error) alert(error.message)
  else fetchBlogs()
}
if (loading) return <div className="p-8 flex items-center justify-center min-h-screen bg-gradient-to-br from-red-400 to-white">Loading...</div>



  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-red-400 via-red-300 to-white'} p-8 transition-all duration-300`}>
      <div className="max-w-4xl mx-auto">
        
        {/* Header with Dark Mode Toggle */}
        <div className={`flex justify-between items-center mb-8 ${theme} backdrop-blur-md rounded-xl p-6 border shadow-xl`}>
          <h1 className={`text-4xl font-black ${isDark ? 'text-red-400' : 'text-red-600'} drop-shadow-lg`}>
            Wordlane
          </h1>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleDarkMode}
              className={`px-4 py-2 rounded-full font-semibold transition-all ${
                isDark 
                  ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' 
                  : 'bg-white shadow-lg text-red-600 hover:shadow-xl hover:bg-red-50'
              }`}
            >
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        {/* Auth */}
        {!session ? (
          <div className={`${theme} max-w-md mx-auto backdrop-blur-md rounded-2xl p-8 shadow-2xl border`}>
            <h2 className={`text-2xl font-bold mb-6 text-center ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              Welcome Back
            </h2>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${theme} w-full p-4 mb-4 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all shadow-lg`}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${theme} w-full p-4 mb-6 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-red-500/50 transition-all shadow-lg`}
            />
            <div className="grid grid-cols-2 gap-4">
              <button onClick={signIn} className={`${theme} hover:shadow-xl p-4 rounded-xl font-bold transition-all shadow-lg border-red-300`}>
                Login
              </button>
              <button onClick={signUp} className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 p-4 rounded-xl text-white font-bold shadow-xl hover:shadow-2xl transition-all">
                Sign Up
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Dashboard Header */}
          {/* Sidebar Toggle + Header */}
<div className={`${theme} flex justify-between items-center mb-8 backdrop-blur-md rounded-xl p-6 shadow-xl border`}>
  <h1 className={`text-3xl font-black ${isDark ? 'text-red-400' : 'text-red-600'}`}>
    Blog Feed
  </h1>
  <div className="flex items-center space-x-3">
    {/* Sidebar Toggle Button */}
    <button 
      onClick={() => setSidebarOpen(true)}
      className={`p-2 rounded-lg ${isDark ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-red-100 hover:bg-red-200'} transition-all`}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    
    
  </div>
</div>

  


              
            <div />
{/* LEFT SIDEBAR */}
{sidebarOpen && (
  <>
    <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
    <div className={`fixed left-0 top-0 z-50 h-screen w-80 ${isDark ? 'bg-gray-900' : 'bg-white'} shadow-2xl transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col h-full`}>

      
      {/* Header */}
      <div className={`${theme} p-6 border-b flex justify-between items-center sticky top-0 z-10 backdrop-blur-md`}>
        <h2 className={`text-xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>Filters & Profile</h2>
        <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-red-500/20 transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
{/* SCROLLING CONTENT */}
<div className="flex-1 overflow-y-auto p-6 space-y-6 pr-2">
  {/* Content Types */}
  <div>
    <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300 uppercase tracking-wider">
      Content Type ({availableContentTypes.length})
    </h3>
    <div className="space-y-2">
      {['All', ...availableContentTypes].map((type) => (
        <button
          key={type}
          onClick={() => setContentFilters(type === 'All' ? [] : [type])}
          className={`w-full text-left p-3 rounded-xl transition-all flex items-center space-x-3 ${
            contentFilters.includes(type) || (type === 'All' && contentFilters.length === 0)
              ? 'bg-red-500 text-white shadow-md'
              : `${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-red-50'} border border-gray-200/50`
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${contentFilters.includes(type) || (type === 'All' && contentFilters.length === 0) ? 'bg-white' : 'bg-gray-400'}`} />
          <span>{type}</span>
        </button>
      ))}
    </div>
  </div>

  {/* Topics */}
  <div>
    <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300 uppercase tracking-wider">
      Topics ({availableTopics.length})
    </h3>
    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
      {['All', ...availableTopics].map((topic) => (
        <button
          key={topic}
          onClick={() => setTopicFilters(topic === 'All' ? [] : [topic])}
          className={`w-full text-left p-3 rounded-xl transition-all flex items-center space-x-3 mb-2 ${
            topicFilters.includes(topic) || (topic === 'All' && topicFilters.length === 0)
              ? 'bg-blue-500 text-white shadow-md'
              : `${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-blue-50'} border border-gray-200/50`
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${topicFilters.includes(topic) || (topic === 'All' && topicFilters.length === 0) ? 'bg-white' : 'bg-gray-400'}`} />
          <span>{topic}</span>
        </button>
      ))}
    </div>
  </div>
</div>

{/* Profile - BOTTOM */}
<div className="p-6 border-t border-gray-200/50 shrink-0">
  <h3 className="text-sm font-semibold mb-4 text-gray-700 dark:text-gray-300 uppercase tracking-wider">Profile</h3>
  {session?.user && (
    <div className="space-y-3">
      <div className={`${isDark ? 'bg-gray-800/50' : 'bg-gray-50'} p-3 rounded-xl`}>
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</div>
        <div className="font-mono text-sm break-all">{session.user.email}</div>
      </div>
      <button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-sm">
        🔐 Change Password
      </button>
    </div>
  )}
</div>

      {/* Content Filters */}
      

      {/* Topic Filters */}
      

      
    </div>
  </>
)}

<div className="lg:ml-80 min-h-screen space-y-8">
  {/* NEW BLOG BUTTON - TOP */}
  <div className="flex gap-4">
    <button 
      onClick={() => setShowForm(!showForm)}
      className={`bg-gradient-to-r ${isDark ? 'from-red-500 to-red-600' : 'from-white to-red-50'} px-8 py-4 rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all text-lg`}
    >
      {showForm ? 'Cancel' : '+ New Blog'}
    </button>
    <button onClick={signOut} className={`${isDark ? 'text-red-300 hover:text-red-200' : 'text-red-600 hover:text-red-700'} font-semibold px-6 py-3 rounded-lg transition-all`}>
      Logout
    </button>
  </div>
            {/* Create Form */}
            {showForm && (
              <div className={`${theme} backdrop-blur-md rounded-2xl p-8 mb-8 shadow-2xl border`}>
                <h2 className={`text-2xl font-black mb-6 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
  {editingBlog ? 'Edit Blog' : 'Create New Blog'}
</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <input
                    type="text"
                    placeholder="Blog Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`${theme} p-5 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-red-500/50 shadow-lg font-semibold`}
                  />
          <select
  value={selectedContentType}
  onChange={(e) => setSelectedContentType(e.target.value)}
  className={`${theme} p-5 rounded-xl shadow-lg font-semibold w-full`}
>
  <option value="">Content Type</option>
  {availableContentTypes.map((type) => (
    <option key={type} value={type}>{type}</option>
  ))}
</select>

<select
  value={selectedTopicTag}
  onChange={(e) => setSelectedTopicTag(e.target.value)}
  className={`${theme} p-5 rounded-xl shadow-lg font-semibold w-full`}
>
  <option value="">Topic</option>
  {availableTopics.map((topic) => (
    <option key={topic} value={topic}>{topic}</option>
  ))}
</select>


                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImage(e.target.files?.[0] || null)}
                    className={`${theme} p-5 rounded-xl file:mr-6 file:py-3 file:px-6 file:rounded-xl file:border-0 file:font-semibold file:bg-gradient-to-r file:from-red-500 file:to-red-600 file:text-white hover:file:from-red-600 hover:file:to-red-700 shadow-lg`}
                  />
                </div>
                <textarea
                  rows={4}
                  placeholder="What's on your mind..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`${theme} w-full p-5 rounded-xl placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-red-500/50 resize-none shadow-lg`}
                />
                <button
                  onClick={editingBlog ? updateBlog : createBlog}
                  disabled={uploading}
                  className={`mt-6 ${isDark ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'} text-white px-10 py-5 rounded-xl font-black text-lg shadow-2xl hover:shadow-3xl transition-all disabled:opacity-50`}
                >
                  {uploading ? 'Saving...' : editingBlog ? '💾 Update Blog' : '🚀 Publish Blog'}

                </button>
              </div>
            )}
{/* 👉 NEW: TOPIC FILTER BAR - PASTE RIGHT HERE */}



            {/* Blogs Grid */}
            {/* Blogs Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {blogs.map((blog) => (
    <div 
      key={blog.id} 
      className={`group relative ${theme} backdrop-blur-md rounded-2xl shadow-xl cursor-pointer hover:shadow-2xl transition-all overflow-hidden aspect-square flex flex-col border`}
      onClick={() => openBlogModal(blog)}
    >
      {/* Image */}
      {blog.image_url ? (
  <div className="h-3/5 flex items-center justify-center p-2 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
    <img
      src={`https://ezpaufvwtvkjyaaxzqsx.supabase.co/storage/v1/object/public/blog-images/${blog.image_url}`}
      alt={blog.title}
      className="w-full h-full max-h-full object-contain max-w-full group-hover:scale-105 transition-transform duration-300 rounded-lg"
    />
  </div>
      ) : (
        <div className="h-1/2 bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center">
          <span className="text-2xl">📄</span>
        </div>
      )}
      
      {/* Title + Tags */}
      <div className="p-4 flex flex-col h-1/2 justify-between">
        <div className='shrink-0'>
          <h3 className={`font-bold text-lg line-clamp-2 mb-2 group-hover:text-red-400 transition-colors ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {blog.title}
          </h3>
          <div className="flex gap-1 mb-2 flex-wrap shrink-0">
            {blog.content_type && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-red-500/30 text-red-200' : 'bg-red-100 text-red-700'}`}>
                {blog.content_type}
              </span>
            )}
            {blog.topic_tag && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-blue-500/30 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
                {blog.topic_tag}
              </span>
            )}
          </div>
        </div>
        
        {/* Edit/Delete - Owner only */}
        {session?.user?.id === blog.user_id && (
          <div className="flex gap-1 absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleEdit(blog)
              }}
              className="h-8 w-8 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(blog.id)
              }}
              className="h-8 w-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  ))}
</div>
{/* READ-ONLY MODAL */}
{selectedBlog && (
  <>
    <div 
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setSelectedBlog(null)}
    />
    <div className={`fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl border shadow-2xl p-8`}>
      <div className="flex justify-between items-start mb-6">
        <h2 className={`text-3xl font-black ${isDark ? 'text-red-400' : 'text-red-600'}`}>
          {selectedBlog.title}
        </h2>
        <button 
          onClick={() => setSelectedBlog(null)}
          className="p-2 rounded-lg hover:bg-red-500/20 transition-all ml-4"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {selectedBlog.image_url && (
        <img
          src={`https://ezpaufvwtvkjyaaxzqsx.supabase.co/storage/v1/object/public/blog-images/${selectedBlog.image_url}`}
          alt={selectedBlog.title}
          className="w-full h-96 object-cover rounded-xl shadow-xl mb-6"
        />
      )}
      <div className="flex gap-2 mb-6 flex-wrap">
        {selectedBlog.content_type && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-red-500/30 text-red-200' : 'bg-red-100 text-red-700'}`}>
            {selectedBlog.content_type}
          </span>
        )}
        {selectedBlog.topic_tag && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${isDark ? 'bg-blue-500/30 text-blue-200' : 'bg-blue-100 text-blue-700'}`}>
            {selectedBlog.topic_tag}
          </span>
        )}
      </div>
      <p className={`${isDark ? 'text-gray-200' : 'text-gray-800'} text-lg leading-relaxed whitespace-pre-line`}>{selectedBlog.content}</p>
      <div className={`mt-8 pt-6 border-t ${isDark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
        Posted on {new Date(selectedBlog.created_at).toLocaleDateString()}
      </div>
    </div>
  </>
)}


            {blogs.length === 0 && (
              <div className="text-center py-24">
                <div className={`text-6xl mb-6 ${isDark ? 'text-gray-600' : 'text-red-200'}`}>
                  ✍️
                </div>
                <h2 className={`text-3xl font-black mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  No blogs yet
                </h2>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Click "New Blog" to create the first masterpiece!
                </p>
              </div>
            )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
