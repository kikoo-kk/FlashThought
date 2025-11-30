import React from 'react';
import { Idea, Attachment, Folder } from '../types';
import { UpdateTimeline } from './UpdateTimeline';

interface IdeaModalProps {
  idea: Idea | null;
  folders: Folder[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateIdea: (updatedIdea: Idea) => void;
  onDelete: (id: string) => void;
}

export const IdeaModal: React.FC<IdeaModalProps> = ({ idea, folders, isOpen, onClose, onUpdateIdea, onDelete }) => {
  if (!isOpen || !idea) return null;

  const handleAddUpdate = (content: string, type: 'update' | 'milestone' | 'pivot', attachments: Attachment[]) => {
    const newUpdate = {
      id: crypto.randomUUID(),
      content,
      timestamp: Date.now(),
      type,
      attachments
    };
    onUpdateIdea({
      ...idea,
      updates: [...idea.updates, newUpdate],
      lastModified: Date.now(),
    });
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateIdea({
      ...idea,
      folderId: e.target.value || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-[#0b0c15] sm:rounded-3xl shadow-2xl flex flex-col min-h-screen sm:min-h-[85vh] sm:max-h-[95vh] animate-scale-in overflow-hidden border border-[#27272a]">
        
        {/* Modal Header */}
        <div className="sticky top-0 z-20 bg-[#0b0c15]/90 backdrop-blur border-b border-[#27272a] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-[#18181b] rounded-lg border border-[#27272a]">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
               </div>
               <div className="text-xs text-gray-500 font-mono">
                  Created {new Date(idea.createdAt).toLocaleDateString('en-US')}
               </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
               {/* Folder Selector */}
               <div className="relative">
                 <select 
                   value={idea.folderId || ''} 
                   onChange={handleFolderChange}
                   className="appearance-none bg-[#18181b] border border-[#27272a] text-gray-300 text-xs rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-indigo-500 hover:border-gray-600 transition-colors cursor-pointer font-medium"
                 >
                   <option value="">Uncategorized</option>
                   {folders.map(f => (
                     <option key={f.id} value={f.id}>{f.name}</option>
                   ))}
                 </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                 </div>
               </div>

               <div className="h-4 w-px bg-[#27272a] mx-2"></div>

               <button 
                  onClick={() => {
                     if(confirm('Are you sure you want to delete this idea?')) {
                         onDelete(idea.id);
                         onClose();
                     }
                  }}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
               </button>
               <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-[#27272a] rounded-lg transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0b0c15]">
          <div className="max-w-3xl mx-auto p-8 sm:p-12">
            
            {/* Main Idea Content */}
            <div className="mb-12">
               <h1 className="text-3xl font-bold text-white mb-6 leading-tight">{idea.title}</h1>
               <div className="prose prose-invert max-w-none text-gray-300 whitespace-pre-wrap leading-8 text-[17px] font-light">
                 {idea.content}
               </div>

               {/* Attachments Grid */}
               {idea.attachments && idea.attachments.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
                    {idea.attachments.map(att => (
                       <div key={att.id} className="group relative rounded-xl overflow-hidden border border-[#27272a] bg-[#18181b] aspect-square">
                          {att.type === 'image' ? (
                            <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 p-4">
                               <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                               <span className="text-xs truncate w-full text-center">{att.name}</span>
                            </div>
                          )}
                       </div>
                    ))}
                  </div>
               )}
               
               {/* Tags */}
               {idea.tags.length > 0 && (
                 <div className="flex flex-wrap gap-2 mt-8">
                   {idea.tags.map(tag => (
                     <span key={tag} className="px-3 py-1 bg-[#18181b] border border-[#27272a] rounded-full text-sm text-gray-400 font-medium hover:text-indigo-400 transition-colors cursor-default">
                       #{tag}
                     </span>
                   ))}
                 </div>
               )}
            </div>

            {/* Timeline Section */}
            <div className="border-t border-[#27272a] pt-10">
              <UpdateTimeline updates={idea.updates} onAddUpdate={handleAddUpdate} />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};