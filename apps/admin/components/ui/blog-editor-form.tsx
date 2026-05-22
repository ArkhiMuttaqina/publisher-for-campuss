"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WysiwygEditor } from "@/components/ui/wysiwyg-editor";
import { createBlogPostAction, updateBlogPostAction, publishBlogPostAction } from "@/app/actions";
import { Loader2, CheckCircle2, CloudFog, PenTool } from "lucide-react";
import Link from "next/link";

export function BlogEditorForm({ initialPost, currentUser }: { initialPost?: any, currentUser?: any }) {
  const router = useRouter();
  const [postId, setPostId] = useState<string | null>(initialPost?.id || null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const formRef = useRef<HTMLFormElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const slugEditedRef = useRef<boolean>(!!initialPost?.slug);

  const saveDraft = async () => {
    if (!formRef.current) return;
    
    const formData = new FormData(formRef.current);
    const title = String(formData.get("title") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const authorName = String(formData.get("authorName") ?? "").trim();
    
    // Client-side guard: Prevent API errors if required fields are too short or invalid
    if (title.length < 1 || !slug.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) || authorName.length < 1) {
      return; 
    }

    setStatus("saving");
    
    try {
      if (postId) {
        formData.append("id", postId);
        const res = await updateBlogPostAction(formData);
        if (res?.success) {
          setStatus("saved");
          setLastSaved(new Date());
        } else {
          setStatus("error");
        }
      } else {
        const result = await createBlogPostAction(formData);
        if (result?.id) {
          setPostId(result.id);
          setStatus("saved");
          setLastSaved(new Date());
          
          // Update URL without refreshing the page
          window.history.replaceState(null, "", `?editId=${result.id}`);
        } else {
          setStatus("error");
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const handleFormChange = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set auto save timeout
    typingTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 1500);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!slugEditedRef.current && formRef.current) {
      const slugInput = formRef.current.elements.namedItem("slug") as HTMLInputElement;
      if (slugInput) {
        slugInput.value = e.target.value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      }
    }
    handleFormChange();
  };

  const handleSlugChange = () => {
    slugEditedRef.current = true;
    handleFormChange();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <form 
        ref={formRef} 
        onChange={handleFormChange}
        onSubmit={(e) => { e.preventDefault(); saveDraft(); router.push("/editorial/blog"); }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              {postId ? "Edit Post" : "Draft New Post"}
            </h1>
            <div className="mt-2 text-sm flex items-center gap-2 h-5">
              {status === "saving" && <><Loader2 className="w-4 h-4 animate-spin text-cyan-600" /> <span className="text-cyan-600 font-medium">Auto-saving...</span></>}
              {status === "saved" && <><CheckCircle2 className="w-4 h-4 text-green-600" /> <span className="text-slate-500">Saved to draft at {lastSaved?.toLocaleTimeString()}</span></>}
              {status === "error" && <span className="text-red-500 font-medium">Failed to save draft</span>}
              {status === "idle" && <><CloudFog className="w-4 h-4 text-slate-400" /> <span className="text-slate-500">Draft ready. Changes will be saved automatically.</span></>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/editorial/blog">
              <Button variant="outline" type="button" className="shadow-sm">
                ← Close
              </Button>
            </Link>
            <Button type="submit" className="bg-cyan-700 hover:bg-cyan-800 text-white shadow-sm">
              Done
            </Button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-8 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-slate-700">Title</label>
              <Input 
                name="title" 
                placeholder="Post Title" 
                defaultValue={initialPost?.title || ""} 
                required 
                className="focus:border-cyan-500 h-10 text-lg font-medium"
                onChange={handleTitleChange}
                onKeyUp={handleFormChange}
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-slate-700">Slug</label>
              <Input 
                name="slug" 
                placeholder="post-slug" 
                defaultValue={initialPost?.slug || ""} 
                required 
                className="focus:border-cyan-500 h-10 font-mono text-sm"
                onChange={handleSlugChange}
                onKeyUp={handleFormChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-slate-400" /> 
                Created by (Author Name)
              </label>
              <Input 
                name="authorName" 
                placeholder="Author Name" 
                defaultValue={initialPost?.authorName || currentUser?.fullName || ""} 
                required 
                className="focus:border-cyan-500 h-10 bg-slate-50"
                onKeyUp={handleFormChange}
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-medium text-slate-700">
                Excerpt <span className="text-slate-400 font-normal">(Short summary for previews)</span>
              </label>
              <Input 
                name="excerpt" 
                placeholder="Brief summary of the post..." 
                defaultValue={initialPost?.excerpt || ""} 
                className="focus:border-cyan-500 h-10"
                onKeyUp={handleFormChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 block mb-2">Content</label>
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
              <WysiwygEditor 
                name="content" 
                defaultValue={initialPost?.content || ""}
                placeholder="Write the post content here..."
                className="min-h-[500px]"
                onContentChange={handleFormChange}
              />
            </div>
          </div>
        </div>
      </form>
      
      {/* Publishing Status control is kept separate from auto-saving draft form */}
      {postId && (
        <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Publishing Status</h3>
            <p className="text-sm text-slate-500">Change visibility of this post on the public site.</p>
          </div>
          <form action={publishBlogPostAction} className="flex gap-3">
            <input type="hidden" name="postId" value={postId} />
            <select 
              name="status" 
              className="flex h-10 w-40 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" 
              defaultValue={initialPost?.status || "draft"}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <Button type="submit" variant="outline" className="bg-white">Update Status</Button>
          </form>
        </div>
      )}
    </div>
  );
}
