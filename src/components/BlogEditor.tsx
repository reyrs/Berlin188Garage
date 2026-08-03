import React, { useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Bold, Italic, Heading2, List, ListOrdered, Link2, ImagePlus } from 'lucide-react';

interface BlogEditorProps {
  content: string;
  onChange: (html: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

export default function BlogEditor({ content, onChange, onUploadImage }: BlogEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Image],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[220px] px-3.5 py-3 focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  const handleImagePick = async (file: File) => {
    try {
      const url = await onUploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      console.error('Gagal upload gambar ke editor:', err);
      alert('Gagal upload gambar. Coba lagi.');
    }
  };

  const setLink = () => {
    const url = window.prompt('URL link:');
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const toolbarBtn = (active: boolean, onClick: () => void, Icon: typeof Bold, title: string) => (
    <button type="button" title={title} onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${active ? 'bg-berlin-navy text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        {toolbarBtn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), Bold, 'Bold')}
        {toolbarBtn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), Italic, 'Italic')}
        {toolbarBtn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, 'Heading')}
        {toolbarBtn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), List, 'Bullet list')}
        {toolbarBtn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, 'Numbered list')}
        {toolbarBtn(editor.isActive('link'), setLink, Link2, 'Link')}
        <button type="button" title="Sisipkan gambar" onClick={() => fileInputRef.current?.click()}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer">
          <ImagePlus className="w-3.5 h-3.5" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImagePick(f); e.target.value = ''; }} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
