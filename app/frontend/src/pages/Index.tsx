import { useRef, useEffect, useState, useCallback } from "react";
import { useMindMap } from "@/hooks/useMindMap";
import { MindMapCanvas, MindMapCanvasHandle } from "@/components/MindMapCanvas";
import { Toolbar } from "@/components/Toolbar";
import { I18nContext } from "@/i18n/useTranslation";
import { Language, translations, isRTL as checkRTL } from "@/i18n/translations";
import { MindMapData } from "@/types/mindmap";

const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function Index() {
  const [language, setLanguageState] = useState<Language>("fa");
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
    deleteNode,
    updateNodeText,
    updateNodeColor,
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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [autoSaveHandle, setAutoSaveHandle] = useState<FileSystemFileHandle | null>(null);
  const [hasUserModified, setHasUserModified] = useState(false);
  const canvasHandle = useRef<MindMapCanvasHandle>(null);
  const autoSaveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedNode = selectedNodeId ? findNode(data.root, selectedNodeId) : null;

  // Track if user has made any modifications
  useEffect(() => {
    if (isModified) {
      setHasUserModified(true);
    }
  }, [isModified]);

  // Auto-edit newly created nodes
  useEffect(() => {
    if (lastCreatedNodeId) {
      setEditingNodeId(lastCreatedNodeId);
      setLastCreatedNodeId(null);
    }
  }, [lastCreatedNodeId, setLastCreatedNodeId]);

  // Auto-save interval (every 5 minutes)
  useEffect(() => {
    if (autoSaveEnabled && autoSaveHandle) {
      autoSaveIntervalRef.current = setInterval(async () => {
        try {
          const writable = await autoSaveHandle.createWritable();
          await writable.write(JSON.stringify(data, null, 2));
          await writable.close();
          console.log("Auto-saved at", new Date().toLocaleTimeString());
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      }, AUTO_SAVE_INTERVAL);
    }
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [autoSaveEnabled, autoSaveHandle, data]);

  const handleSave = async () => {
    if (fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        markSaved();
      } catch (err) {
        console.error("Save failed:", err);
        downloadJSON();
      }
    } else {
      await handleSaveAs();
    }
  };

  const handleSaveAs = async () => {
    if ("showSaveFilePicker" in window) {
      try {
        const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
          suggestedName: "mindmap.json",
          types: [
            {
              description: "JSON Files",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        setFileHandle(handle);
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        markSaved();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          downloadJSON();
        }
      }
    } else {
      downloadJSON();
    }
  };

  const downloadJSON = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindmap.json";
    a.click();
    URL.revokeObjectURL(url);
    markSaved();
  };

  const handleLoad = (loadedData: MindMapData) => {
    loadFromJSON(loadedData);
    setHasUserModified(true);
  };

  const handleToggleAutoSave = async () => {
    if (!autoSaveEnabled) {
      // Ask user for auto-save location
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
            suggestedName: "mindmap_autosave.json",
            types: [
              {
                description: "JSON Files",
                accept: { "application/json": [".json"] },
              },
            ],
          });
          setAutoSaveHandle(handle);
          setAutoSaveEnabled(true);
          // Immediately save once
          try {
            const writable = await handle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
          } catch (err) {
            console.error("Initial auto-save failed:", err);
          }
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Auto-save setup failed:", err);
          }
          // User cancelled - don't enable auto-save
        }
      } else {
        // Fallback: just enable auto-save with download
        setAutoSaveEnabled(true);
      }
    } else {
      setAutoSaveEnabled(false);
      setAutoSaveHandle(null);
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    }
  };

  const handleLanguageChange = useCallback((lang: Language) => {
    const newT = translations[lang];
    setLanguageState(lang);

    // Only reset map if user has NOT modified anything
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && e.shiftKey) {
        e.preventDefault();
        handleSaveAs();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, data, fileHandle]);

  // Set document direction
  useEffect(() => {
    document.documentElement.dir = isRTLDir ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [isRTLDir, language]);

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
        {/* Main content area with sidebar offset on desktop */}
        <div className="flex-1 flex flex-col min-w-0 lg:ms-56">
          <Toolbar
            data={data}
            onLoad={handleLoad}
            onReset={() => { resetMap(t.mainIdea, t.branch1, t.branch2, t.branch3); setHasUserModified(false); }}
            canvasHandle={canvasHandle}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            selectedNode={selectedNode}
            isRoot={selectedNode?.id === data.root.id}
            onDeleteNode={deleteNode}
            onUpdateColor={updateNodeColor}
            onStartEdit={handleStartEdit}
            onUpdateComment={updateNodeComment}
            onUpdateHyperlink={updateNodeHyperlink}
            autoSaveEnabled={autoSaveEnabled}
            onToggleAutoSave={handleToggleAutoSave}
            onSave={handleSave}
            onSaveAs={handleSaveAs}
            onLanguageChange={handleLanguageChange}
          />

          <div className="flex-1 relative min-h-0 overflow-hidden">
            <MindMapCanvas
              ref={canvasHandle}
              root={data.root}
              selectedNodeId={selectedNodeId}
              editingNodeId={editingNodeId}
              isRTL={isRTLDir}
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