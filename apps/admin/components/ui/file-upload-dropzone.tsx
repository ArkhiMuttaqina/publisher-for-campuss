"use client";

import { useState, useRef } from "react";
import { UploadCloud, File as FileIcon, X } from "lucide-react";

interface FileUploadDropzoneProps {
  name: string;
  accept?: string;
  label: string;
  helperText?: string;
}

export function FileUploadDropzone({ name, accept, label, helperText }: FileUploadDropzoneProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    } else {
      setFileName(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (inputRef.current) {
        inputRef.current.files = e.dataTransfer.files;
        setFileName(e.dataTransfer.files[0].name);
      }
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering the click on the dropzone
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setFileName(null);
  };

  const triggerSelect = () => {
    inputRef.current?.click();
  };

  return (
    <div 
      onClick={triggerSelect}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
        isDragging ? "border-cyan-500 bg-cyan-50" : "border-slate-300 bg-white hover:bg-slate-50 hover:border-cyan-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {fileName ? (
        <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center">
          <FileIcon className="w-8 h-8 text-cyan-600" />
          <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]" title={fileName}>
            {fileName}
          </span>
          <button 
            onClick={clearFile}
            className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center mt-1 z-10 px-2 py-1 rounded hover:bg-red-50 transition-colors"
          >
            <X className="w-3 h-3 mr-1" /> Remove File
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-2 p-4 text-center">
          <UploadCloud className={`w-8 h-8 transition-colors ${isDragging ? "text-cyan-500" : "text-slate-400"}`} />
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {helperText && <span className="text-xs text-slate-500">{helperText}</span>}
        </div>
      )}
    </div>
  );
}
