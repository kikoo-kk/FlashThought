import React, { useState, useMemo, useRef } from 'react';
import { IdeaUpdate, Attachment } from '../types';

interface UpdateTimelineProps {
  updates: IdeaUpdate[];
  onAddUpdate: (content: string, type: 'update' | 'milestone', attachments: Attachment[]) => void;
  onEditUpdate: (update: IdeaUpdate) => void;
  onDeleteUpdate: (id: string) => void;
}

export const UpdateTimeline: React.FC<UpdateTimelineProps> = ({ updates, onAddUpdate, onEditUpdate, onDeleteUpdate }) => {
  // New update state
  const [newUpdate, setNewUpdate] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit update state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (!newUpdate.trim() && attachments.length === 0) return;
    onAddUpdate(newUpdate, 'update', attachments);
    setNewUpdate('');
    setAttachments([]);
    setIsFocused(false);
  };

  const startEditing = (update: IdeaUpdate) => {
    setEditingId(update.id);
    setEditContent(update.content);
    setEditAttachments(update.attachments || []);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
    setEditAttachments([]);
  };

  const saveEditing = (originalUpdate: IdeaUpdate) => {
    onEditUpdate({
      ...originalUpdate,
      content: editContent,
      attachments: editAttachments
    });
    cancelEditing();
  };

  // Helper for file processing
  const processFiles = async (files: File[]): Promise<Attachment[]> => {
    const newAttachments: Attachment[] = [];
    for (const file of files) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      let type: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';

      newAttachments.push({
        id: crypto.randomUUID(),
        type,
        url: base64,
        name: file.name
      });
    }
    return newAttachments;
  };

  // Handlers for New Update
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const processed = await processFiles(Array.from(e.target.files));
      setAttachments(prev => [...prev, ...processed]);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const processed = await processFiles(files);
      setAttachments(prev => [...prev, ...processed]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // Handlers for Editing
  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const processed = await processFiles(Array.from(e.target.files));
      setEditAttachments(prev => [...prev, ...processed]);
    }
  };

  const handleEditPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      const processed = await processFiles(files);
      setEditAttachments(prev => [...prev, ...processed]);
    }
  };

  const removeEditAttachment = (id: string) => {
    setEditAttachments(prev => prev.filter(a => a.id !== id));
  };


  const groupedUpdates = useMemo(() => {
    const groups: { [key: string]: IdeaUpdate[] } = {};
    const sorted = [...updates].sort((a, b) => b.timestamp - a.timestamp);

    sorted.forEach(u => {
      const date = new Date(u.timestamp);
      const dateKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(u);
    });

    return Object.entries(groups);
  }, [updates]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-xl font-bold text-white">Progress</h3>
        <span className="px-2 py-0.5 bg-[#18181b] border border-[#27272a] rounded-full text-xs text-gray-500">{updates.length}</span>
      </div>

      {/* Input Area */}
      <div className={`mb-12 transition-all duration-300 ${isFocused ? 'ring-1 ring-indigo-500/50 rounded-xl' : ''}`}>
        <div className={`bg-[#18181b] border rounded-xl overflow-hidden transition-all duration-200 ${
          isFocused ? 'border-indigo-500/50 bg-[#1c1c20]' : 'border-[#27272a] hover:border-[#3f3f46]'
        }`}>
          <textarea
            value={newUpdate}
            onChange={(e) => setNewUpdate(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onPaste={handlePaste}
            placeholder="Log an update or milestone..."
            className="w-full p-5 min-h-[100px] outline-none text-gray-200 placeholder-gray-600 resize-none text-base bg-transparent leading-7"
          />
          
          {attachments.length > 0 && (
            <div className="px-5 pb-3 flex flex-wrap gap-3">
              {attachments.map(att => (
                <div key={att.id} className="relative group">
                  {att.type === 'image' ? (
                    <img src={att.url} alt="preview" className="w-16 h-16 object-cover rounded-md border border-[#3f3f46]" />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-[#27272a] rounded-md border border-[#3f3f46]">
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                  )}
                  <button 
                    onClick={() => removeAttachment(att.id)}
                    className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-0.5 border border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={`flex justify-between items-center px-4 py-3 bg-[#121214] border-t border-[#27272a] ${
            isFocused || newUpdate || attachments.length > 0 ? 'block' : 'hidden'
          }`}>
             <div className="flex gap-2">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-[#27272a] rounded-lg transition-colors"
               >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
               </button>
               <input 
                 type="file" 
                 multiple 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleFileChange}
               />
             </div>
             
             <div className="flex gap-3">
                <button 
                  onClick={() => setIsFocused(false)}
                  className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={!newUpdate.trim() && attachments.length === 0}
                  className="px-5 py-1.5 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Post
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-4 space-y-12">
        <div className="absolute left-[23px] top-4 bottom-0 w-px bg-[#27272a] -z-10" />

        {groupedUpdates.map(([date, groupUpdates]) => (
          <div key={date} className="relative animate-scale-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 flex flex-col items-center justify-center rounded-xl bg-[#18181b] border border-[#27272a] z-10 shadow-sm">
                <span className="text-lg font-bold text-gray-200 leading-none">{new Date(groupUpdates[0].timestamp).getDate()}</span>
                <span className="text-[10px] text-gray-500 uppercase">{new Date(groupUpdates[0].timestamp).toLocaleDateString('en-US', {month:'short'})}</span>
              </div>
            </div>

            <div className="space-y-6 pl-12">
              {groupUpdates.map((update) => (
                <div key={update.id} className="relative group">
                  <div className={`absolute -left-[3.4rem] top-4 w-2 h-2 rounded-full border border-[#18181b] ${
                    update.type === 'milestone' ? 'bg-indigo-500' : 'bg-gray-600 group-hover:bg-indigo-400'
                  } transition-colors ring-4 ring-[#0b0c15]`} />
                  
                  {editingId === update.id ? (
                    /* Edit Mode Card */
                    <div className="bg-[#18181b] border border-indigo-500/50 rounded-xl overflow-hidden shadow-lg shadow-black/30 ring-1 ring-indigo-500/20">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onPaste={handleEditPaste}
                        placeholder="Log an update or milestone..."
                        className="w-full p-5 min-h-[100px] outline-none text-gray-200 placeholder-gray-600 resize-none text-base bg-transparent leading-7"
                        autoFocus
                      />
                      
                      {editAttachments.length > 0 && (
                        <div className="px-5 pb-3 flex flex-wrap gap-3">
                          {editAttachments.map(att => (
                            <div key={att.id} className="relative group/att">
                              {att.type === 'image' ? (
                                <img src={att.url} alt="preview" className="w-16 h-16 object-cover rounded-md border border-[#3f3f46]" />
                              ) : (
                                <div className="w-16 h-16 flex items-center justify-center bg-[#27272a] rounded-md border border-[#3f3f46]">
                                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                              )}
                              <button 
                                onClick={() => removeEditAttachment(att.id)}
                                className="absolute -top-1.5 -right-1.5 bg-black text-white rounded-full p-0.5 border border-gray-600 opacity-0 group-hover/att:opacity-100 transition-opacity"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center px-4 py-3 bg-[#121214] border-t border-[#27272a]">
                         <div className="flex gap-2">
                           <button 
                             onClick={() => editFileInputRef.current?.click()}
                             className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-[#27272a] rounded-lg transition-colors"
                           >
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                           </button>
                           <input 
                             type="file" 
                             multiple 
                             ref={editFileInputRef} 
                             className="hidden" 
                             onChange={handleEditFileChange}
                           />
                         </div>
                         
                         <div className="flex gap-3">
                            <button 
                              onClick={cancelEditing}
                              className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => saveEditing(update)}
                              disabled={!editContent.trim() && editAttachments.length === 0}
                              className="px-5 py-1.5 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Save
                            </button>
                         </div>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode Card */
                    <div className="bg-[#18181b] p-6 rounded-xl border border-[#27272a] hover:border-[#3f3f46] transition-all relative">
                      <div className="flex justify-between items-center mb-3">
                         <span className="text-xs font-mono text-gray-600">
                           {new Date(update.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}
                         </span>
                         
                         {/* Action Buttons */}
                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => startEditing(update)}
                              className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-[#27272a] rounded-md transition-colors"
                              title="Edit update"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button 
                              onClick={() => onDeleteUpdate(update.id)}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#27272a] rounded-md transition-colors"
                              title="Delete update"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                         </div>
                      </div>
                      
                      {update.content && (
                        <div className="text-gray-300 text-[15px] leading-7 whitespace-pre-wrap">
                          {update.content}
                        </div>
                      )}

                      {update.attachments && update.attachments.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                          {update.attachments.map((att) => (
                            <div key={att.id} className="rounded-lg overflow-hidden border border-[#27272a] bg-[#121214]">
                               {att.type === 'image' ? (
                                 <img src={att.url} alt={att.name} className="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
                               ) : (
                                 <div className="w-full h-32 flex flex-col items-center justify-center text-gray-500 p-2">
                                    <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    <span className="text-xs truncate w-full text-center">{att.name}</span>
                                 </div>
                               )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};