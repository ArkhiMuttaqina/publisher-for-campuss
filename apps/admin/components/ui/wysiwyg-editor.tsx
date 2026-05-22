"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import "react-quill-new/dist/quill.snow.css";

// Dynamically import react-quill-new to prevent SSR hydration errors
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => <div className="h-40 w-full animate-pulse bg-slate-100 rounded-md border border-slate-200" />
});

interface WysiwygEditorProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  onContentChange?: () => void;
}

export function WysiwygEditor({
  name,
  defaultValue = "",
  placeholder = "Write content here...",
  className = "",
  onContentChange,
}: WysiwygEditorProps) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = (val: string) => {
    setValue(val);
    if (onContentChange) {
      onContentChange();
    }
  };

  return (
    <div className={`wysiwyg-wrapper ${className}`}>
      {/* Hidden input to pass the value natively to FormData in Server Actions */}
      <input type="hidden" name={name} value={value} />
      <ReactQuill
        theme="snow"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="bg-white rounded-md overflow-hidden border-slate-300 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500"
      />
    </div>
  );
}
