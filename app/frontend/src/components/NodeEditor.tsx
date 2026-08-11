import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, Palette, X } from "lucide-react";
import { MindMapNode } from "@/types/mindmap";

interface NodeEditorProps {
  node: MindMapNode;
  isRoot: boolean;
  onUpdateText: (id: string, text: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onAddChild: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const COLORS = [
  "#2563EB", "#7C3AED", "#059669", "#DC2626",
  "#D97706", "#DB2777", "#0891B2", "#4F46E5",
];

export function NodeEditor({
  node,
  isRoot,
  onUpdateText,
  onUpdateColor,
  onAddChild,
  onDelete,
  onClose,
}: NodeEditorProps) {
  const [text, setText] = useState(node.text);
  const [showColors, setShowColors] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setText(node.text);
  }, [node.text, node.id]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [node.id]);

  const handleSubmit = () => {
    if (text.trim()) {
      onUpdateText(node.id, text.trim());
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto bg-white sm:rounded-xl rounded-t-xl shadow-lg border border-slate-200 p-3 sm:p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 safe-bottom">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Close button - visible on mobile */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-9 w-9 sm:hidden p-0 cursor-pointer hover:bg-slate-100 text-slate-500"
          title="بستن"
        >
          <X className="w-4 h-4" />
        </Button>

        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          className="flex-1 min-w-0 sm:w-56 h-9 sm:h-8 text-sm"
          placeholder="متن نود..."
          dir="auto"
        />

        <Button
          size="sm"
          variant="ghost"
          onClick={handleSubmit}
          className="h-9 w-9 sm:h-8 sm:w-8 p-0 cursor-pointer hover:bg-green-50 active:bg-green-100 text-green-600"
          title="تأیید"
        >
          <Check className="w-4 h-4" />
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onAddChild(node.id)}
          className="h-9 w-9 sm:h-8 sm:w-8 p-0 cursor-pointer hover:bg-blue-50 active:bg-blue-100 text-blue-600"
          title="افزودن زیرشاخه"
        >
          <Plus className="w-4 h-4" />
        </Button>

        <div className="relative">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowColors(!showColors)}
            className="h-9 w-9 sm:h-8 sm:w-8 p-0 cursor-pointer hover:bg-purple-50 active:bg-purple-100 text-purple-600"
            title="تغییر رنگ"
          >
            <Palette className="w-4 h-4" />
          </Button>
          {showColors && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg border border-slate-200 p-2 grid grid-cols-4 gap-2 animate-in fade-in duration-150">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 sm:w-6 sm:h-6 rounded-full cursor-pointer hover:scale-125 active:scale-110 transition-transform duration-150 border-2 border-white shadow-sm"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    onUpdateColor(node.id, color);
                    setShowColors(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {!isRoot && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(node.id)}
            className="h-9 w-9 sm:h-8 sm:w-8 p-0 cursor-pointer hover:bg-red-50 active:bg-red-100 text-red-600"
            title="حذف نود"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}