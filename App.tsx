import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Idea, Attachment, Folder } from './types';
import { IdeaModal } from './components/IdeaModal';

const App: React.FC = () => {
  // --- State ---
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // New Idea Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);
  const [isInputExpanded, setIsInputExpanded] = useState(false);
  
  // New Folder State
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  useEffect(() => {
    const savedIdeas = localStorage.getItem('flashthought_ideas');
    if (savedIdeas) {
      try { setIdeas(JSON.parse(savedIdeas)); } catch (e) { console.error(e); }
    }
    const savedFolders = localStorage.getItem('flashthought_folders');
    if (savedFolders) {
      try { setFolders(JSON.parse(savedFolders)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('flashthought_ideas', JSON.stringify(ideas));
  }, [ideas]);

  useEffect(() => {
    localStorage.setItem('flashthought_folders', JSON.stringify(folders));
  }, [folders]);

  // --- Handlers ---
  const processFiles = async (files: File[]) => {
    const atts: Attachment[] = [];
    for (const file of files) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      atts.push({
        id: crypto.randomUUID(),
        type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
        url: base64,
        name: file.name
      });
    }
    setNewAttachments(prev => [...prev, ...atts]);
  };

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    const idea: Idea = {
      id: crypto.randomUUID(),
      title: newTitle || 'Untitled',
      content: newContent,
      tags: [],
      updates: [],
      status: 'active',
      createdAt: Date.now(),
      lastModified: Date.now(),
      attachments: newAttachments,
      folderId: activeFolderId === 'all' ? undefined : activeFolderId === 'uncategorized' ? undefined : activeFolderId
    };

    setIdeas([idea, ...ideas]);
    setNewTitle('');
    setNewContent('');
    setNewAttachments([]);
    setIsInputExpanded(false);
  };

  const handleUpdateIdea = (updatedIdea: Idea) => {
    setIdeas(ideas.map(i => i.id === updatedIdea.id ? updatedIdea : i));
    setSelectedIdea(updatedIdea);
  };

  const handleDeleteIdea = (id: string) => {
    setIdeas(ideas.filter(i => i.id !== id));
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: newFolderName.trim(),
      createdAt: Date.now()
    };
    
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);
    setActiveFolderId(newFolder.id);
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deleting a folder will not delete the ideas within it. They will become "Uncategorized". Continue?')) return;
    
    setFolders(folders.filter(f => f.id !== folderId));
    setIdeas(ideas.map(i => i.folderId === folderId ? { ...i, folderId: undefined } : i));
    if (activeFolderId === folderId) setActiveFolderId('all');
  };

  // --- Data Computation ---
  const filteredIdeas = useMemo(() => {
    return ideas.filter(idea => {
      if (activeFolderId !== 'all') {
        if (activeFolderId === 'uncategorized') {
           if (idea.folderId) return false;
        } else {
           if (idea.folderId !== activeFolderId) return false;
        }
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = idea.title.toLowerCase().includes(query);
        const matchContent = idea.content.toLowerCase().includes(query);
        const matchTag = idea.tags.some(t => t.toLowerCase().includes(query));
        if (!matchTitle && !matchContent && !matchTag) return false;
      }
      return true;
    });
  }, [ideas, activeFolderId, searchQuery]);

  const groupedIdeas = useMemo(() => {
    const groups: { [key: string]: { dateObj: Date, items: Idea[] } } = {};
    filteredIdeas.forEach(idea => {
      const date = new Date(idea.createdAt);
      // Group by Month/Year, using a sortable key
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = { dateObj: date, items: [] };
      }
      groups[key].items.push(idea);
    });

    // Sort keys descending
    const sortedKeys = Object.keys(groups).sort().reverse();
    return sortedKeys.map(key => ({
      key,
      displayDate: groups[key].dateObj,
      items: groups[key].items.sort((a, b) => b.createdAt - a.createdAt)
    }));
  }, [filteredIdeas]);

  // --- Render ---
  return (
    <div className="min-h-screen bg-[#0b0c15] text-gray-200 font-sans flex overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 sm:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed sm:static inset-y-0 left-0 z-50 w-60 bg-[#121214] border-r border-[#27272a] flex flex-col transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="h-16 flex items-center px-5 shrink-0 border-b border-[#27272a]/50">
          <h1 className="text-base font-bold text-white tracking-tight">FlashThought</h1>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1 custom-scrollbar">
           <div className="mb-6 space-y-1">
             <button 
               onClick={() => { setActiveFolderId('all'); setIsSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                 activeFolderId === 'all' 
                   ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
                   : 'text-gray-400 hover:bg-[#27272a] hover:text-gray-100'
               }`}
             >
               All Ideas
               <span className={`ml-auto text-[10px] ${activeFolderId==='all'?'text-indigo-200':'text-gray-600'}`}>{ideas.length}</span>
             </button>
             
             <button 
               onClick={() => { setActiveFolderId('uncategorized'); setIsSidebarOpen(false); }}
               className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                 activeFolderId === 'uncategorized' 
                   ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30' 
                   : 'text-gray-400 hover:bg-[#27272a] hover:text-gray-100'
               }`}
             >
               Uncategorized
               <span className={`ml-auto text-[10px] ${activeFolderId==='uncategorized'?'text-indigo-200':'text-gray-600'}`}>{ideas.filter(i => !i.folderId).length}</span>
             </button>
           </div>

           <div className="pt-2">
             <div className="flex justify-between items-center px-2 mb-2">
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Folders</span>
               <button onClick={() => setIsCreatingFolder(true)} className="p-1 text-gray-500 hover:text-indigo-400 hover:bg-[#27272a] rounded transition-colors" title="New Folder">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
               </button>
             </div>

             {/* Create Folder Input */}
             {isCreatingFolder && (
               <div className="mb-2 px-1">
                 <form onSubmit={handleCreateFolder}>
                   <input
                     autoFocus
                     type="text"
                     placeholder="Name..."
                     className="w-full bg-[#18181b] text-white text-xs rounded border border-indigo-500/50 px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                     value={newFolderName}
                     onChange={e => setNewFolderName(e.target.value)}
                     onBlur={() => !newFolderName && setIsCreatingFolder(false)}
                   />
                 </form>
               </div>
             )}

             <div className="space-y-0.5">
               {folders.map(folder => (
                 <div key={folder.id} className="group relative">
                    <button 
                      onClick={() => { setActiveFolderId(folder.id); setIsSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 group-hover:bg-[#27272a] ${
                        activeFolderId === folder.id 
                          ? 'bg-[#27272a] text-white border-l-2 border-indigo-500 rounded-l-none' 
                          : 'text-gray-400 border-l-2 border-transparent rounded-l-none'
                      }`}
                    >
                      <span className="truncate">{folder.name}</span>
                      <span className="ml-auto text-[10px] opacity-40 group-hover:opacity-100 transition-opacity">{ideas.filter(i => i.folderId === folder.id).length}</span>
                    </button>
                    <button 
                       onClick={(e) => handleDeleteFolder(folder.id, e)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-red-400 hover:bg-[#3f3f46] rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#0b0c15]">
        
        {/* Top Bar */}
        <header className="h-20 flex items-center justify-between px-8 shrink-0 z-20">
             <div className="flex items-center gap-4 sm:hidden">
                <button 
                  className="p-2 -ml-2 text-gray-400 hover:text-white"
                  onClick={() => setIsSidebarOpen(true)}
                >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
             </div>

             {/* Centered Search */}
             <div className="flex-1 max-w-2xl mx-auto">
               <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-11 pr-4 py-3 bg-[#18181b] border border-transparent rounded-2xl leading-5 text-gray-200 placeholder-gray-500 focus:outline-none focus:bg-[#18181b] focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 sm:text-sm transition-all shadow-sm"
                    placeholder="Search ideas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
               </div>
             </div>
             
             <div className="w-10 sm:hidden"></div> {/* Spacer for alignment */}
        </header>

        {/* Main Workspace */}
        <main className="flex-1 overflow-hidden flex flex-col relative px-8 pb-6">
          
          {/* Quick Input Area */}
          <div className="w-full max-w-2xl mx-auto mb-10 shrink-0 z-10">
            <div className={`bg-[#18181b] rounded-2xl transition-all duration-300 overflow-hidden border ${isInputExpanded ? 'border-indigo-500/50 shadow-2xl shadow-indigo-900/20 ring-1 ring-indigo-500/50' : 'border-[#27272a] hover:border-[#3f3f46]'}`}>
               <form onSubmit={handleCreateIdea} className="relative">
                 {isInputExpanded && (
                    <input
                      type="text"
                      placeholder="Title"
                      className="w-full px-6 pt-5 pb-2 text-lg font-bold text-white placeholder-gray-600 border-none outline-none bg-transparent"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      autoFocus
                    />
                 )}
                 <div className="relative">
                   <textarea
                     placeholder={isInputExpanded ? "Capture your thought (supports image paste)..." : `Add a new idea to "${activeFolderId === 'all' ? 'All Ideas' : folders.find(f => f.id === activeFolderId)?.name || 'Uncategorized'}"...`}
                     className={`w-full px-6 py-4 text-gray-300 text-[15px] placeholder-gray-500 border-none outline-none bg-transparent resize-none transition-all leading-relaxed no-scrollbar ${isInputExpanded ? 'h-32' : 'h-14'}`}
                     value={newContent}
                     onChange={(e) => setNewContent(e.target.value)}
                     onClick={() => setIsInputExpanded(true)}
                     onPaste={async (e) => {
                       const items = e.clipboardData.items;
                       const files = [];
                       for(let i=0; i<items.length; i++) if(items[i].kind==='file') files.push(items[i].getAsFile());
                       if(files.length) { e.preventDefault(); await processFiles(files as File[]); setIsInputExpanded(true); }
                     }}
                   />
                   {!isInputExpanded && !newContent && (
                      <div className="absolute right-5 top-4 text-indigo-500 pointer-events-none p-1 bg-indigo-500/10 rounded-lg">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      </div>
                   )}
                 </div>

                 {/* Attachments Preview */}
                 {newAttachments.length > 0 && (
                   <div className="px-6 pb-4 flex gap-3 overflow-x-auto no-scrollbar">
                      {newAttachments.map(att => (
                        <div key={att.id} className="relative flex-shrink-0 group">
                           {att.type === 'image' ? (
                             <img src={att.url} className="h-20 w-20 object-cover rounded-lg border border-[#3f3f46] shadow-sm" alt="preview" />
                           ) : (
                             <div className="h-20 w-20 flex flex-col items-center justify-center bg-[#27272a] rounded-lg text-xs text-gray-400 border border-[#3f3f46]">
                               <svg className="w-6 h-6 mb-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                               <span className="w-16 truncate text-center">{att.name}</span>
                             </div>
                           )}
                           <button type="button" onClick={() => setNewAttachments(prev => prev.filter(p => p.id !== att.id))} className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-0.5 border border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                             <svg className="w-3 h-3" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                           </button>
                        </div>
                      ))}
                   </div>
                 )}
                 
                 {isInputExpanded && (
                   <div className="flex justify-between items-center px-6 py-3 bg-[#121214] border-t border-[#27272a]">
                      <div className="flex gap-2">
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-gray-400 hover:text-indigo-400 p-2 rounded-lg hover:bg-[#27272a] transition-colors"
                          title="Attach files"
                        >
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <input type="file" multiple ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && processFiles(Array.from(e.target.files))} />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setIsInputExpanded(false)}
                          className="text-sm text-gray-500 hover:text-gray-300 px-4 py-1.5 rounded-lg hover:bg-[#27272a] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-indigo-600 text-white px-6 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/25"
                        >
                          Record
                        </button>
                      </div>
                   </div>
                 )}
               </form>
            </div>
          </div>

          {/* Kanban Board Layout */}
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
            <div className="flex h-full gap-8 px-1">
              
              {groupedIdeas.length === 0 && (
                 <div className="w-full flex flex-col items-center justify-center text-gray-600 mt-10">
                   {searchQuery ? (
                     <div className="text-center">
                       <p className="text-lg">No results for "{searchQuery}"</p>
                     </div>
                   ) : (
                     <div className="text-center">
                       <div className="w-24 h-24 bg-[#18181b] rounded-full flex items-center justify-center mb-6 mx-auto border border-[#27272a]">
                          <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                       </div>
                       <p className="text-gray-500">Empty here, start recording your first idea.</p>
                     </div>
                   )}
                 </div>
              )}

              {groupedIdeas.map(group => (
                <div key={group.key} className="min-w-[340px] max-w-[340px] flex flex-col h-full animate-scale-in">
                  {/* Column Header */}
                  <div className="flex items-center gap-3 mb-6 sticky top-0 z-10 py-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {group.displayDate.toLocaleString('en-US', { month: 'long' })}
                    </h2>
                    <span className="text-xs font-mono text-gray-600 pt-1">/ {group.displayDate.getFullYear()}</span>
                    <span className="ml-auto text-[10px] font-bold bg-[#18181b] text-gray-500 px-2 py-1 rounded-md border border-[#27272a]">
                      {group.items.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar pb-10">
                    {group.items.map(idea => (
                      <div
                        key={idea.id}
                        onClick={() => {
                          setSelectedIdea(idea);
                          setIsModalOpen(true);
                        }}
                        className="group bg-[#18181b] rounded-xl border border-[#27272a] p-5 hover:border-indigo-500/40 hover:bg-[#1c1c20] cursor-pointer transition-all duration-200 flex flex-col gap-3 shadow-sm hover:shadow-xl hover:shadow-black/20"
                      >
                         <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-gray-200 text-[15px] leading-snug line-clamp-2 group-hover:text-indigo-200 transition-colors">
                              {idea.title}
                            </h3>
                            {idea.updates.length > 0 && (
                              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                            )}
                         </div>

                         {/* Preview Image */}
                         {idea.attachments && idea.attachments.some(a => a.type === 'image') && (
                            <div className="h-32 w-full rounded-lg overflow-hidden bg-black border border-[#27272a]">
                               <img src={idea.attachments.find(a => a.type === 'image')?.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="thumbnail" />
                            </div>
                         )}

                         <p className="text-gray-400 text-sm leading-6 line-clamp-3 whitespace-pre-wrap font-light">
                           {idea.content}
                         </p>
                         
                         <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#27272a] group-hover:border-[#333338] transition-colors">
                            <div className="flex items-center gap-2 text-[11px] text-gray-600 font-medium">
                               <span>
                                 {new Date(idea.createdAt).getDate()} {new Date(idea.createdAt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                               </span>
                               {idea.folderId && (
                                 <span className="bg-[#27272a] text-gray-400 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                   {folders.find(f => f.id === idea.folderId)?.name}
                                 </span>
                               )}
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <div className="min-w-[40px]"></div>
            </div>
          </div>
        </main>
      </div>

      <IdeaModal
        idea={selectedIdea}
        folders={folders}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdateIdea={handleUpdateIdea}
        onDelete={handleDeleteIdea}
      />
    </div>
  );
};

export default App;