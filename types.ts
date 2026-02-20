export type ScriptStyle = '情绪流' | '非情绪流';
export interface KBFile {
  id: string;
  name: string;
  type: string;
  content: string;
  uploadDate: number;
}

export interface Shot {
  shotNumber: number;
  duration: string;          
  shotType: string;         
  movement: string;          
  visualDescription: string; 
  dialogue: string;          
  emotion: string;           
  seedDancePrompt: string;   
  negativePrompt?: string;  
}

export interface Episode {
  id: string;
  title: string;
  script: string;
  status: 'draft' | 'generating' | 'completed';
  shots: Shot[];
  createdAt: number;
  style?: ScriptStyle;
}

export interface AppState {
  knowledgeBase: KBFile[];
  episodes: Episode[];
  currentEpisodeId: string | null;
}
export interface Project {
  id: string;
  name: string;               
  knowledgeBase: KBFile[];   
  episodes: Episode[];        
  lastModified: number; 
}
