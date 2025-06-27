// Type declarations for editor components
declare module '@/components/editor/EditorToolbar' {
  export interface EditorToolbarProps {
    activeTab: 'metadata' | 'content' | 'images' | 'heroImagePrompt' | 'inBlogImagePrompt';
    onTabChange: (tab: 'metadata' | 'content' | 'images' | 'heroImagePrompt' | 'inBlogImagePrompt') => void;
    isPreviewMode: boolean;
    onTogglePreview: () => void;
  }
  
  const EditorToolbar: React.FC<EditorToolbarProps>;
  export default EditorToolbar;
}
