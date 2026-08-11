import {
  Upload, Image, Undo2, Redo2, Trash2, Palette, MessageSquare, Link2,
  MessageCircle, Menu, X, FilePlus, Download, PanelLeftClose, Check,
  ChevronDown, Globe, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import { MindMapData, MindMapNode } from "@/types/mindmap";
import { MindMapCanvasHandle } from "@/components/MindMapCanvas";
import { Language, getLanguageLabel } from "@/i18n/translations";
import { useTranslation } from "@/i18n/useTranslation";
import { client } from "@/lib/api";

interface ToolbarProps {
  onLoad: (data: MindMapData) => void;
  onReset: () => void;
  canvasHandle: React.RefObject<MindMapCanvasHandle | null>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedNode: MindMapNode | null;
  isRoot: boolean;
  hasUnsavedChanges: boolean;
  onDeleteNode: (id: string) => void;
  onUpdateColor: (id: string, color: string) => void;
  onUpdateComment: (id: string, comment: string) => void;
  onUpdateHyperlink: (id: string, hyperlink: string) => void;
  onSaveAs: () => void;
  onLanguageChange: (lang: Language) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const COLORS = [
  "#2563EB", "#7C3AED", "#059669", "#DC2626",
  "#D97706", "#DB2777", "#0891B2", "#4F46E5",
  "#15803D", "#B45309", "#9333EA", "#0F172A",
];

const LANGUAGES: Language[] = ["en", "es", "fa", "ar", "zh", "ru"];

function detectDeviceInfo(): string {
  const ua = navigator.userAgent;
  const size = `${window.screen.width}x${window.screen.height}`;
  return `${ua} | screen=${size} | lang=${navigator.language}`;
}

export function Toolbar({
  onLoad, onReset, canvasHandle,
  onUndo, onRedo, canUndo, canRedo,
  selectedNode, isRoot, hasUnsavedChanges,
  onDeleteNode, onUpdateColor,
  onUpdateComment, onUpdateHyperlink,
  onSaveAs, onLanguageChange,
  sidebarOpen, onToggleSidebar,
}: ToolbarProps) {
  const { t, language, isRTL } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [linkText, setLinkText] = useState("");
  const [customColor, setCustomColor] = useState("#2563EB");
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [contactText, setContactText] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  const closeMenus = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (selectedNode?.color) setCustomColor(selectedNode.color);
  }, [selectedNode?.color]);

  // Close the language dropdown when clicking anywhere else.
  useEffect(() => {
    if (!langOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [langOpen]);

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
    closeMenus();
  };

  const handleLoadJSON = () => {
    fileInputRef.current?.click();
    closeMenus();
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
    if (!selectedNode) return;
    setCommentText(selectedNode.comment || "");
    setShowCommentInput(true);
    setShowLinkInput(false);
    setShowColors(false);
  };

  const handleSaveComment = () => {
    if (selectedNode) {
      onUpdateComment(selectedNode.id, commentText.trim());
      setShowCommentInput(false);
    }
  };

  const handleOpenLink = () => {
    if (!selectedNode) return;
    setLinkText(selectedNode.hyperlink || "");
    setShowLinkInput(true);
    setShowCommentInput(false);
    setShowColors(false);
  };

  const handleSaveLink = () => {
    if (selectedNode) {
      onUpdateHyperlink(selectedNode.id, linkText.trim());
      setShowLinkInput(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim() || sending) return;
    setSending(true);
    try {
      await client.apiCall.invoke({
        url: "/api/v1/reports/feedback",
        method: "POST",
        data: {
          message: feedbackText.trim(),
          contact_info: contactText.trim(),
          device_info: detectDeviceInfo(),
        },
      });
    } catch (err) {
      console.error("Feedback submit failed:", err);
    }
    setSending(false);
    setFeedbackText("");
    setContactText("");
    setShowFeedback(false);
  };

  /** Language selector rendered as a dropdown menu. */
  const languageDropdown = (
    <div className="relative" ref={langRef}>
      <button
        onClick={() => setLangOpen((open) => !open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-sm text-slate-700 cursor-pointer transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <Globe className="w-4 h-4 text-slate-500 shrink-0" />
          <span className="truncate">{getLanguageLabel(language)}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${langOpen ? "rotate-180" : ""}`} />
      </button>
      {langOpen && (
        <div className="absolute z-[70] mt-1 w-full bg-white rounded-lg shadow-xl border border-slate-200 py-1 max-h-64 overflow-y-auto">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                onLanguageChange(lang);
                setLangOpen(false);
                closeMenus();
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer transition-colors text-start ${
                language === lang ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="truncate">{getLanguageLabel(lang)}</span>
              {language === lang && <Check className="w-4 h-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const menuContent = (
    <div className="flex flex-col gap-1 p-3">
      <button
        onClick={() => { onReset(); closeMenus(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <FilePlus className="w-4 h-4 text-slate-500" />
        <span>{t.newFile}</span>
      </button>

      <button
        onClick={handleLoadJSON}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Upload className="w-4 h-4 text-slate-500" />
        <span>{t.load}</span>
      </button>

      <button
        onClick={() => { onSaveAs(); closeMenus(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Download className="w-4 h-4 text-slate-500" />
        <span>{t.saveAs}</span>
      </button>

      <button
        onClick={handleExportImage}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Image className="w-4 h-4 text-slate-500" />
        <span>{t.saveImage}</span>
      </button>

      <div className="h-px bg-slate-200 my-2" />

      <div className="px-1 mb-1">
        <p className="text-xs text-slate-500 mb-1.5">{t.language}</p>
        {languageDropdown}
      </div>

      <div className="h-px bg-slate-200 my-2" />

      <button
        onClick={() => { setShowFeedback(true); closeMenus(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <MessageCircle className="w-4 h-4 text-slate-500" />
        <span>{t.feedback}</span>
      </button>
    </div>
  );

  return (
    <>
      {/* Collapsible desktop sidebar */}
      {sidebarOpen && (
        <div className={`hidden lg:flex flex-col fixed top-0 ${isRTL ? "right-0 border-l" : "left-0 border-r"} h-full w-56 bg-white border-slate-200 shadow-sm z-50 overflow-y-auto`}>
          <div className="flex items-center justify-between p-3 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 truncate">{t.appTitle}</h2>
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded hover:bg-slate-100 cursor-pointer shrink-0"
              title={t.collapseSidebar}
              aria-label={t.collapseSidebar}
            >
              <PanelLeftClose className={`w-4 h-4 text-slate-500 ${isRTL ? "rotate-180" : ""}`} />
            </button>
          </div>
          {menuContent}
        </div>
      )}

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[55] flex">
          <div className="absolute inset-0 bg-black/30" onClick={closeMenus} />
          <div className={`relative w-64 max-w-[80vw] bg-white h-full shadow-xl overflow-y-auto ${isRTL ? "mr-auto" : "ml-0"}`}>
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <h2 className="text-sm font-bold text-slate-800 truncate">{t.appTitle}</h2>
              <button onClick={closeMenus} className="p-1 rounded hover:bg-slate-100 cursor-pointer shrink-0">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            {menuContent}
          </div>
        </div>
      )}

      {/* Top toolbar — stays fixed above the workspace */}
      <div className="flex items-center gap-1 sm:gap-2 p-2 sm:p-3 bg-white border-b border-slate-200 shadow-sm flex-wrap relative shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden h-9 w-9 p-0 cursor-pointer hover:bg-slate-50"
          title={t.menu}
        >
          <Menu className="w-4 h-4" />
        </Button>

        {!sidebarOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleSidebar}
            className="hidden lg:inline-flex h-8 w-8 p-0 cursor-pointer hover:bg-slate-50"
            title={t.expandSidebar}
          >
            <Menu className="w-4 h-4" />
          </Button>
        )}

        <div className="w-px h-6 bg-slate-200 mx-0.5" />

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

        {selectedNode && (
          <>
            <div className="w-px h-6 bg-slate-300 mx-0.5" />

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowColors(!showColors); setShowCommentInput(false); setShowLinkInput(false); }}
                className="h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-purple-50 active:bg-purple-100 border-purple-300 text-purple-600"
                title={t.colorTooltip}
              >
                <Palette className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{t.color}</span>
              </Button>
              {showColors && (
                <div className="absolute top-full start-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 w-72 max-w-[88vw]">
                  <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">{t.presetColors}</p>
                  <div className="grid grid-cols-4 gap-x-5 gap-y-4 place-items-center">
                    {COLORS.map((color) => {
                      const active = selectedNode.color === color;
                      return (
                        <button
                          key={color}
                          className={`relative w-9 h-9 rounded-full cursor-pointer hover:scale-110 active:scale-105 transition-transform duration-150 shadow-sm ring-offset-2 ${
                            active ? "ring-2 ring-slate-800" : "ring-1 ring-slate-200"
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                          aria-label={color}
                          onClick={() => {
                            onUpdateColor(selectedNode.id, color);
                            setShowColors(false);
                          }}
                        >
                          {active && <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-slate-200 my-4" />

                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{t.customColor}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-11 h-10 p-0.5 rounded-lg border border-slate-200 cursor-pointer bg-white shrink-0"
                      aria-label={t.customColor}
                    />
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#2563EB"
                      className="flex-1 min-w-0 border border-slate-200 rounded-lg px-2 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-300"
                      dir="ltr"
                    />
                    <Button
                      size="sm"
                      className="cursor-pointer shrink-0"
                      disabled={!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(customColor.trim())}
                      onClick={() => {
                        onUpdateColor(selectedNode.id, customColor.trim());
                        setShowColors(false);
                      }}
                    >
                      {t.applyButton}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenComment}
                className={`h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-yellow-50 active:bg-yellow-100 ${selectedNode.comment ? "border-yellow-400 text-yellow-700 bg-yellow-50" : "border-slate-200 text-slate-600"}`}
                title={selectedNode.comment ? t.editComment : t.addComment}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{t.comment}</span>
              </Button>
              {showCommentInput && (
                <div className="absolute top-full start-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-50 w-64 max-w-[85vw]">
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

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenLink}
                className={`h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-blue-50 active:bg-blue-100 ${selectedNode.hyperlink ? "border-blue-400 text-blue-700 bg-blue-50" : "border-slate-200 text-slate-600"}`}
                title={selectedNode.hyperlink ? t.editHyperlink : t.addHyperlink}
              >
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{t.hyperlink}</span>
              </Button>
              {showLinkInput && (
                <div className="absolute top-full start-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 p-3 z-50 w-72 max-w-[85vw]">
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

        {hasUnsavedChanges && (
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.unsavedWarning}</span>
          </span>
        )}

        <div className="text-xs text-slate-500 hidden xl:block">
          {t.helpText}
        </div>
      </div>

      {/* Feedback dialog */}
      {showFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowFeedback(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-80 max-w-full">
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
            <label className="block text-xs text-slate-500 mt-3 mb-1">{t.contactLabel}</label>
            <input
              type="text"
              value={contactText}
              onChange={(e) => setContactText(e.target.value)}
              placeholder={t.contactPlaceholder}
              className="w-full border border-slate-200 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-300"
              dir="auto"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowFeedback(false)} className="cursor-pointer">
                {t.cancelButton}
              </Button>
              <Button size="sm" onClick={handleSendFeedback} disabled={sending || !feedbackText.trim()} className="cursor-pointer">
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