import { Upload, Image, Undo2, Redo2, Trash2, Palette, Pencil, Save, MessageSquare, Link2, Globe, ToggleLeft, ToggleRight, MessageCircle, Menu, X, FilePlus, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { MindMapData, MindMapNode } from "@/types/mindmap";
import { MindMapCanvasHandle } from "@/components/MindMapCanvas";
import { Language, getLanguageLabel } from "@/i18n/translations";
import { useTranslation } from "@/i18n/useTranslation";

interface ToolbarProps {
  data: MindMapData;
  onLoad: (data: MindMapData) => void;
  onReset: () => void;
  canvasHandle: React.RefObject<MindMapCanvasHandle | null>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedNode: MindMapNode | null;
  isRoot: boolean;
  onDeleteNode: (id: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onStartEdit: (id: string) => void;
  onUpdateComment: (id: string, comment: string) => void;
  onUpdateHyperlink: (id: string, hyperlink: string) => void;
  autoSaveEnabled: boolean;
  onToggleAutoSave: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onLanguageChange: (lang: Language) => void;
}

const COLORS = [
  "#2563EB", "#7C3AED", "#059669", "#DC2626",
  "#D97706", "#DB2777", "#0891B2", "#4F46E5",
];

const LANGUAGES: Language[] = ["fa", "ar", "en", "es"];

export function Toolbar({
  data, onLoad, onReset, canvasHandle,
  onUndo, onRedo, canUndo, canRedo,
  selectedNode, isRoot, onDeleteNode, onUpdateColor, onStartEdit,
  onUpdateComment, onUpdateHyperlink,
  autoSaveEnabled, onToggleAutoSave,
  onSave, onSaveAs,
  onLanguageChange,
}: ToolbarProps) {
  const { t, language, isRTL } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const handleExportImage = async () => {
    if (!canvasHandle.current) return;
    try {
      const dataUrl = await canvasHandle.current.exportToImage();
      if (dataUrl) {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "mindmap.png";
        a.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
    setSideMenuOpen(false);
  };

  const handleLoadJSON = () => {
    fileInputRef.current?.click();
    setSideMenuOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.root && parsed.root.id && parsed.root.text) {
          onLoad(parsed);
        } else {
          alert(t.invalidJSON);
        }
      } catch {
        alert(t.jsonReadError);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleOpenComment = () => {
    if (selectedNode) {
      setCommentText(selectedNode.comment || "");
      setShowCommentInput(true);
      setShowLinkInput(false);
    }
  };

  const handleSaveComment = () => {
    if (selectedNode) {
      onUpdateComment(selectedNode.id, commentText);
      setShowCommentInput(false);
    }
  };

  const handleOpenLink = () => {
    if (selectedNode) {
      setLinkText(selectedNode.hyperlink || "");
      setShowLinkInput(true);
      setShowCommentInput(false);
    }
  };

  const handleSaveLink = () => {
    if (selectedNode) {
      onUpdateHyperlink(selectedNode.id, linkText);
      setShowLinkInput(false);
    }
  };

  const handleSendFeedback = () => {
    if (feedbackText.trim()) {
      console.log("Feedback sent:", feedbackText);
      alert(t.sendButton + " ✓");
      setFeedbackText("");
      setShowFeedback(false);
    }
  };

  // Side menu content (shared between mobile overlay and desktop sidebar)
  const menuContent = (
    <div className="flex flex-col gap-1 p-3">
      <h3 className="text-sm font-semibold text-slate-700 mb-2 px-2">{t.menu}</h3>

      {/* New */}
      <button
        onClick={() => { onReset(); setSideMenuOpen(false); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <FilePlus className="w-4 h-4 text-slate-500" />
        <span>{t.newFile}</span>
      </button>

      {/* Open/Load */}
      <button
        onClick={handleLoadJSON}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Upload className="w-4 h-4 text-slate-500" />
        <span>{t.load}</span>
      </button>

      {/* Save */}
      <button
        onClick={() => { onSave(); setSideMenuOpen(false); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Save className="w-4 h-4 text-slate-500" />
        <span>{t.save}</span>
      </button>

      {/* Save As */}
      <button
        onClick={() => { onSaveAs(); setSideMenuOpen(false); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Download className="w-4 h-4 text-slate-500" />
        <span>{t.saveAs}</span>
      </button>

      {/* Save Image */}
      <button
        onClick={handleExportImage}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Image className="w-4 h-4 text-slate-500" />
        <span>{t.saveImage}</span>
      </button>

      <div className="h-px bg-slate-200 my-2" />

      {/* Auto-save */}
      <button
        onClick={() => { onToggleAutoSave(); setSideMenuOpen(false); }}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors w-full text-start ${autoSaveEnabled ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "hover:bg-slate-100 text-slate-700"}`}
      >
        {autoSaveEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
        <span>{autoSaveEnabled ? t.autoSaveOn : t.autoSaveOff}</span>
      </button>

      <div className="h-px bg-slate-200 my-2" />

      {/* Language */}
      <div className="px-2 mb-1">
        <p className="text-xs text-slate-500 mb-1.5">{t.language}</p>
        <div className="grid grid-cols-2 gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              className={`px-2 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${language === lang ? "bg-blue-100 text-blue-700 font-semibold" : "bg-slate-50 hover:bg-slate-100 text-slate-600"}`}
              onClick={() => {
                onLanguageChange(lang);
                setSideMenuOpen(false);
              }}
            >
              {getLanguageLabel(lang)}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-200 my-2" />

      {/* Feedback */}
      <button
        onClick={() => { setShowFeedback(true); setSideMenuOpen(false); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <MessageCircle className="w-4 h-4 text-slate-500" />
        <span>{t.feedback}</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar - always visible on lg+ */}
      <div className={`hidden lg:flex flex-col fixed top-0 ${isRTL ? "right-0" : "left-0"} h-full w-56 bg-white border-slate-200 shadow-sm z-50 overflow-y-auto ${isRTL ? "border-l" : "border-r"}`}>
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-800">{t.appTitle}</h2>
        </div>
        {menuContent}
      </div>

      {/* Mobile hamburger overlay */}
      {sideMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={() => setSideMenuOpen(false)} />
          {/* Menu panel */}
          <div className={`relative w-64 max-w-[80vw] bg-white h-full shadow-xl overflow-y-auto ${isRTL ? "mr-auto" : "ml-0"}`}>
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-800">{t.appTitle}</h2>
              <button onClick={() => setSideMenuOpen(false)} className="p-1 rounded hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            {menuContent}
          </div>
        </div>
      )}

      {/* Top toolbar */}
      <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-white border-b border-slate-200 shadow-sm flex-wrap relative">
        {/* Hamburger button - mobile only */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSideMenuOpen(true)}
          className="lg:hidden h-9 w-9 p-0 cursor-pointer hover:bg-slate-50"
          title={t.menu}
        >
          <Menu className="w-4 h-4" />
        </Button>

        <div className="lg:hidden w-px h-6 bg-slate-200 mx-0.5" />

        {/* Undo/Redo */}
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-9 w-9 sm:h-8 sm:w-8 p-0 cursor-pointer hover:bg-blue-50 active:bg-blue-100"
          title={t.undoTooltip}
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-9 w-9 sm:h-8 sm:w-8 p-0 cursor-pointer hover:bg-blue-50 active:bg-blue-100"
          title={t.redoTooltip}
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        {/* Reset button - visible in toolbar for quick access */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-9 w-9 sm:h-8 sm:w-8 p-0 cursor-pointer hover:bg-orange-50 active:bg-orange-100"
          title={t.resetTooltip}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Node actions - shown when a node is selected */}
        {selectedNode && (
          <>
            <div className="w-px h-6 bg-slate-300 mx-0.5" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => onStartEdit(selectedNode.id)}
              className="h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-indigo-50 active:bg-indigo-100 border-indigo-300 text-indigo-600"
              title={t.editTooltip}
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline ml-1.5">{t.edit}</span>
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColors(!showColors)}
                className="h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-purple-50 active:bg-purple-100 border-purple-300 text-purple-600"
                title={t.colorTooltip}
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{t.color}</span>
              </Button>
              {showColors && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-2 grid grid-cols-4 gap-2 z-50 animate-in fade-in duration-150">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className="w-7 h-7 rounded-full cursor-pointer hover:scale-125 active:scale-110 transition-transform duration-150 border-2 border-white shadow-sm"
                      style={{ backgroundColor: color }}
                      onClick={() => {
                        onUpdateColor(selectedNode.id, color);
                        setShowColors(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Comment button */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenComment}
                className={`h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-yellow-50 active:bg-yellow-100 ${selectedNode.comment ? "border-yellow-400 text-yellow-700 bg-yellow-50" : "border-slate-200"}`}
                title={selectedNode.comment ? t.editComment : t.addComment}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{t.comment}</span>
              </Button>
              {showCommentInput && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-50 w-64 animate-in fade-in duration-150">
                  <p className="text-xs font-medium mb-1.5">{selectedNode.comment ? t.editComment : t.addComment}</p>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={t.commentPlaceholder}
                    className="w-full border border-slate-200 rounded p-2 text-sm h-16 resize-none focus:outline-none focus:ring-1 focus:ring-yellow-300"
                    dir="auto"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCommentInput(false)} className="cursor-pointer text-xs">
                      {t.cancelButton}
                    </Button>
                    <Button size="sm" onClick={handleSaveComment} className="cursor-pointer text-xs">
                      {t.okButton}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Hyperlink button */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenLink}
                className={`h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-blue-50 active:bg-blue-100 ${selectedNode.hyperlink ? "border-blue-400 text-blue-700 bg-blue-50" : "border-slate-200"}`}
                title={selectedNode.hyperlink ? t.editHyperlink : t.addHyperlink}
              >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{t.hyperlink}</span>
              </Button>
              {showLinkInput && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-50 w-72 animate-in fade-in duration-150">
                  <p className="text-xs font-medium mb-1.5">{selectedNode.hyperlink ? t.editHyperlink : t.addHyperlink}</p>
                  <input
                    type="url"
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder={t.hyperlinkPlaceholder}
                    className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
                    dir="ltr"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setShowLinkInput(false)} className="cursor-pointer text-xs">
                      {t.cancelButton}
                    </Button>
                    <Button size="sm" onClick={handleSaveLink} className="cursor-pointer text-xs">
                      {t.okButton}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {!isRoot && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDeleteNode(selectedNode.id)}
                className="h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-red-50 active:bg-red-100 border-red-300 text-red-600"
                title={t.deleteTooltip}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{t.delete}</span>
              </Button>
            )}
          </>
        )}

        <div className="flex-1" />

        <div className="text-xs text-slate-500 hidden lg:block">
          {t.helpText}
        </div>
      </div>

      {/* Feedback dialog */}
      {showFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowFeedback(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-80 max-w-[90vw]">
            <p className="text-sm font-medium mb-2">{t.feedbackTitle}</p>
            <p className="text-xs text-slate-500 mb-3">{t.feedbackMessage}</p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={t.feedbackPlaceholder}
              className="w-full border border-slate-200 rounded p-2 text-sm h-24 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
              dir="auto"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setShowFeedback(false)} className="cursor-pointer">
                {t.cancelButton}
              </Button>
              <Button size="sm" onClick={handleSendFeedback} className="cursor-pointer">
                {t.sendButton}
              </Button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}