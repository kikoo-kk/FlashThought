
export type IdeaStatus = 'active' | 'completed' | 'archived';

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'file';
  url: string; // Base64 for local storage
  name: string;
}

export interface IdeaUpdate {
  id: string;
  content: string;
  timestamp: number;
  type: 'update' | 'milestone' | 'pivot';
  attachments?: Attachment[];
}

export interface Idea {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updates: IdeaUpdate[];
  status: IdeaStatus;
  createdAt: number;
  lastModified: number;
  attachments?: Attachment[]; // Initial attachments
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export interface AISuggestion {
  tags: string[];
  nextSteps: string[];
}
