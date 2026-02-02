"use client";

import { Plus, MoreHorizontal, X, Pencil } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useProjectStore } from "@/stores/useProjectStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DEFAULT_PROJECT_ID } from "@/lib/db";

export function TabNav() {
  const { projects, currentProjectId, setCurrentProject, createProject, renameProject, archiveProject } =
    useProjectStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      await createProject({ name: newProjectName.trim() });
      setNewProjectName("");
      setIsCreating(false);
    }
  };

  const handleRenameProject = async () => {
    if (editingId && editingName.trim()) {
      await renameProject(editingId, editingName.trim());
      setEditingId(null);
      setEditingName("");
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b bg-muted/30 px-2 py-1">
      {/* Project Tabs */}
      {projects.map((project) => (
        <div
          key={project.id}
          className={cn(
            "group flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-colors",
            currentProjectId === project.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {editingId === project.id ? (
            <Input
              ref={editInputRef}
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameProject();
                if (e.key === "Escape") {
                  setEditingId(null);
                  setEditingName("");
                }
              }}
              onBlur={handleRenameProject}
              className="h-6 w-24 px-1 text-sm"
            />
          ) : (
            <button
              onClick={() => setCurrentProject(project.id)}
              className="font-medium"
            >
              {project.name}
            </button>
          )}

          {/* Tab Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 h-5 w-5 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => startEditing(project.id, project.name)}>
                <Pencil className="mr-2 h-4 w-4" />
                重命名
              </DropdownMenuItem>
              {project.id !== DEFAULT_PROJECT_ID && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => archiveProject(project.id)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    删除项目
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}

      {/* Create New Project */}
      {isCreating ? (
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateProject();
              if (e.key === "Escape") {
                setIsCreating(false);
                setNewProjectName("");
              }
            }}
            placeholder="项目名称"
            className="h-7 w-28 text-sm"
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCreateProject}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => {
              setIsCreating(false);
              setNewProjectName("");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-muted-foreground"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="mr-1 h-4 w-4" />
          新建项目
        </Button>
      )}
    </div>
  );
}
