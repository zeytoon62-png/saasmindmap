import { useRef, useEffect, useState, useCallback } from "react";
import { useMindMap } from "@/hooks/useMindMap";
import { MindMapCanvas, MindMapCanvasHandle } from "@/components/MindMapCanvas";
import { Toolbar } from "@/components/Toolbar";
import { I18nContext } from "@/i18n/useTranslation";
import { Language, translations, isRTL as checkRTL } from "@/i18n/translations";
import { MindMapData } from "@/types/mindmap";
import {
  SaveFormat,
  buildJSONString,
  buildMarkdownString,
  downloadTextFile,
  downloadDataUrl,
  exportPdf,
} from "@/lib/mindmapExport";
import { client } from "@/lib/api";

const STORAGE_DATA_KEY = "personal-mind-map:data:v1";
const STORAGE_DIRTY_KEY = "personal-mind-map:dirty:v1";
const STORAGE_LANG_KEY = "personal-mind-map:lang:v1";
const STORAGE_SIDEBAR_KEY = "personal-mind-map:sidebar:v1";

const SUPPORTED_LANGUAGES: Language[] = ["en", "es", "fa", "ar", "zh", "ru"];

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_LANG_KEY);
    if (stored && (SUPPORTED_LANGUAGES as string[]).includes(stored)) return stored as Language;
  } catch {
    // Storage may be unavailable in private mode.
  }
  return "en";
}

function readStoredSidebar(): boolean {
  try {
    return localStorage.getItem(STORAGE_SIDEBAR_KEY) !== "closed";
  } catch {
    return true;
  }
}

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  if (/Firefox\//.test(ua)) return "Firefox";
  return "Other";
}

function detectOS(): string {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "Windows";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iOS/i.test(ua)) return "iOS";
  if (/Mac OS/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

/** True when the keyboard focus is inside an editable field. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export default function Index() {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage());
  const t = translations[language];
  const isRTLDir = checkRTL(language);

  const {
    data,
    selectedNodeId,
    setSelectedNodeId,
    lastCreatedNodeId,
    setLastCreatedNodeId,
    isModified,
    addChild,
    addSiblingBefore,
    deleteNode,
    updateNodeText,
    updateNodeColor,
    updateNodeFormat,
    updateNodeComment,
    updateNodeHyperlink,
    reparentNode,
    loadFromJSON,
    resetMap,
    findNode,
    undo,
    redo,
    canUndo,
    canRedo,
    markSaved,
  } = useMindMap(t.newNode, t.mainIdea, t.branch1, t.branch2, t.branch3);

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [hasUserModified, setHasUserModified] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [restored, setRestored] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => readStoredSidebar());
  const canvasHandle = useRef<MindMapCanvasHandle>(null);
  const visitLogged = useRef(false);

  const selectedNode = selectedNodeId ? findNode(data.root, selectedNodeId) : null;

  // Restore the last working project so a refresh never loses work.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MindMapData;
        if (parsed?.root?.id && typeof parsed.root.text === "string") {
          loadFromJSON(parsed);
          setHasUserModified(true);
          if (localStorage.getItem(STORAGE_DIRTY_KEY) === "true") setHasUnsavedChanges(true);
        }
      }
    } catch {
      // A corrupted snapshot must not block the editor.
    }
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every change so the project survives refresh or accidental close.
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota errors; in-memory state is still intact.
    }
  }, [data, restored]);

  useEffect(() => {
    if (isModified) setHasUnsavedChanges(true);
  }, [isModified]);

  useEffect(() => {
    if (isModified) setHasUserModified(true);
  }, [isModified]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_DIRTY_KEY, hasUnsavedChanges ? "true" : "false");
    } catch {
      // Ignore storage failures.
    }
  }, [hasUnsavedChanges, restored]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_LANG_KEY, language);
    } catch {
      // Ignore storage failures.
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIDEBAR_KEY, sidebarOpen ? "open" : "closed");
    } catch {
      // Ignore storage failures.
    }
  }, [sidebarOpen]);

  // Warn before leaving, closing or refreshing with unsaved work.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = t.unsavedWarning;
      return t.unsavedWarning;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, t.unsavedWarning]);

  // Log the visit once per session for the weekly report.
  useEffect(() => {
    if (visitLogged.current) return;
    visitLogged.current = true;
    client.apiCall
      .invoke({
        url: "/api/v1/reports/visitor-log",
        method: "POST",
        data: {
          page_visited: window.location.pathname,
          device_type: detectDeviceType(),
          browser: detectBrowser(),
          os: detectOS(),
          actions_summary: `opened editor, lang=${language}, screen=${window.screen.width}x${window.screen.height}`,
        },
      })
      .catch(() => {
        // Logging must never block the editor.
      });

    // The backend decides whether a full week has passed before sending the email.
    client.apiCall
      .invoke({ url: "/api/v1/reports/run-weekly-report", method: "POST", data: {} })
      .catch(() => {
        // Scheduling must never block the editor.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastCreatedNodeId) {
      setEditingNodeId(lastCreatedNodeId);
      setLastCreatedNodeId(null);
    }
  }, [lastCreatedNodeId, setLastCreatedNodeId]);

  /** Export the current map in the format chosen from the save submenu. */
  const handleSave = useCallback(async (format: SaveFormat) => {
    try {
      if (format === "json") {
        downloadTextFile(buildJSONString(data), "mindmap.json", "application/json");
      } else if (format === "markdown") {
        downloadTextFile(buildMarkdownString(data), "mindmap.md", "text/markdown");
      } else if (format === "svg") {
        const svg = canvasHandle.current?.exportToSvgString();
        if (!svg) return;
        downloadTextFile(svg, "mindmap.svg", "image/svg+xml");
      } else if (format === "png" || format === "jpg") {
        const result = await canvasHandle.current?.exportToImage(format === "jpg" ? "jpeg" : "png");
        if (!result) return;
        downloadDataUrl(result.dataUrl, format === "jpg" ? "mindmap.jpg" : "mindmap.png");
      } else if (format === "pdf") {
        const result = await canvasHandle.current?.exportToImage("png");
        if (!result) return;
        await exportPdf(result.dataUrl, result.width, result.height, "mindmap.pdf");
      }
      markSaved();
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Save failed:", err);
    }
  }, [data, markSaved]);

  const handleLoad = (loadedData: MindMapData) => {
    loadFromJSON(loadedData);
    setHasUserModified(true);
    setHasUnsavedChanges(false);
  };

  const handleLanguageChange = useCallback((lang: Language) => {
    const newT = translations[lang];
    setLanguageState(lang);
    if (!hasUserModified) {
      resetMap(newT.mainIdea, newT.branch1, newT.branch2, newT.branch3);
    }
  }, [hasUserModified, resetMap]);

  const handleStartEdit = useCallback((id: string) => {
    setSelectedNodeId(id);
    setEditingNodeId(id);
  }, [setSelectedNodeId]);

  const handleFinishEdit = useCallback((id: string, text: string) => {
    updateNodeText(id, text);
    setEditingNodeId(null);
  }, [updateNodeText]);

  const handleSelectNode = useCallback((id: string) => {
    if (id === "") {
      setSelectedNodeId(null);
      setEditingNodeId(null);
    } else {
      setSelectedNodeId(id);
    }
  }, [setSelectedNodeId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave("json");
        return;
      }

      // Node shortcuts only apply while a node is selected and not being edited.
      if (!selectedNodeId || editingNodeId || isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Delete") {
        e.preventDefault();
        if (selectedNodeId !== data.root.id) deleteNode(selectedNodeId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        addChild(selectedNodeId);
      } else if (e.key === "Tab") {
        e.preventDefault();
        addSiblingBefore(selectedNodeId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, handleSave, selectedNodeId, editingNodeId, data.root.id, deleteNode, addChild, addSiblingBefore]);

  useEffect(() => {
    document.documentElement.dir = isRTLDir ? "rtl" : "ltr";
    document.documentElement.lang = language;
    document.title = t.appTitle;
  }, [isRTLDir, language, t.appTitle]);

  const i18nValue = {
    language,
    setLanguage: handleLanguageChange,
    t,
    isRTL: isRTLDir,
    dir: (isRTLDir ? "rtl" : "ltr") as "rtl" | "ltr",
  };

  return (
    <I18nContext.Provider value={i18nValue}>
      <div className="h-[100dvh] flex bg-slate-50 overflow-hidden" dir={isRTLDir ? "rtl" : "ltr"}>
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${sidebarOpen ? "lg:ms-56" : "lg:ms-0"}`}>
          <Toolbar
            onLoad={handleLoad}
            onReset={() => {
              resetMap(t.mainIdea, t.branch1, t.branch2, t.branch3);
              setHasUserModified(false);
              setHasUnsavedChanges(false);
            }}
            canvasHandle={canvasHandle}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            selectedNode={selectedNode}
            isRoot={selectedNode?.id === data.root.id}
            hasUnsavedChanges={hasUnsavedChanges}
            onDeleteNode={deleteNode}
            onUpdateColor={updateNodeColor}
            onUpdateComment={updateNodeComment}
            onUpdateHyperlink={updateNodeHyperlink}
            onUpdateFormat={updateNodeFormat}
            onSave={handleSave}
            onLanguageChange={handleLanguageChange}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
          />

          <div className="flex-1 relative min-h-0 overflow-hidden">
            <MindMapCanvas
              ref={canvasHandle}
              root={data.root}
              selectedNodeId={selectedNodeId}
              editingNodeId={editingNodeId}
              isRTL={isRTLDir}
              labels={{
                zoomIn: t.zoomIn,
                zoomOut: t.zoomOut,
                resetView: t.resetView,
                fitToScreen: t.fitToScreen,
              }}
              onSelectNode={handleSelectNode}
              onStartEdit={handleStartEdit}
              onFinishEdit={handleFinishEdit}
              onAddChild={addChild}
              onReparentNode={reparentNode}
            />
          </div>
        </div>
      </div>
    </I18nContext.Provider>
  );
}