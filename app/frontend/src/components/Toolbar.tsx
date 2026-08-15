import {
  Upload, Image as ImageIcon, Undo2, Redo2, Trash2, Palette, MessageSquare, Link2,
  MessageCircle, Menu, X, FilePlus, Download, PanelLeftClose, Check,
  ChevronDown, Globe, AlertCircle, AlignLeft, AlignCenter, AlignRight,
  Bold, List, ListOrdered, Type, FileJson, FileText, FileImage, FileCode2, FileDown,
  Heart, Info, Send, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import {
  MindMapData, MindMapNode, NodeFormatPatch,
  MIN_FONT_SIZE, MAX_FONT_SIZE, resolveFontSize,
} from "@/types/mindmap";
import { MindMapCanvasHandle } from "@/components/MindMapCanvas";
import { SaveFormat } from "@/lib/mindmapExport";
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
  onUpdateFormat: (id: string, patch: NodeFormatPatch) => void;
  onSave: (format: SaveFormat) => void;
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

interface CryptoWallet {
  id: number;
  crypto_name: string;
  wallet_address: string;
  qr_code_url: string;
  is_active: boolean;
  display_order: number;
}

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
  onUpdateComment, onUpdateHyperlink, onUpdateFormat,
  onSave, onLanguageChange,
  sidebarOpen, onToggleSidebar,
}: ToolbarProps) {
  const { t, language, isRTL } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [linkText, setLinkText] = useState("");
  const [customColor, setCustomColor] = useState("#2563EB");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showSaveFormats, setShowSaveFormats] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [contactText, setContactText] = useState("");
  const [feedbackType, setFeedbackType] = useState<"normal" | "urgent">("normal");
  const [sending, setSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // New modals
  const [showAboutUs, setShowAboutUs] = useState(false);
  const [aboutUsText, setAboutUsText] = useState("");
  const [showSupportUs, setShowSupportUs] = useState(false);
  const [cryptoWallets, setCryptoWallets] = useState<CryptoWallet[]>([]);
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoWallet | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [resolvedQrUrl, setResolvedQrUrl] = useState("");

  const closeMenus = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (selectedNode?.color) setCustomColor(selectedNode.color);
  }, [selectedNode?.color]);

  useEffect(() => {
    setShowColors(false);
    setShowFormat(false);
    setShowCommentInput(false);
    setShowLinkInput(false);
  }, [selectedNode?.id]);

  useEffect(() => {
    if (!langOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [langOpen]);

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
          onLoad({ root: parsed.root, version: parsed.version || "1.0" });
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
    setShowFormat(false);
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
    setShowFormat(false);
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
          feedback_type: feedbackType,
          contact_info: contactText.trim(),
          device_info: detectDeviceInfo(),
        },
      });
      setFeedbackSent(true);
      setTimeout(() => setFeedbackSent(false), 3000);
    } catch (err) {
      console.error("Feedback submit failed:", err);
    }
    setSending(false);
    setFeedbackText("");
    setContactText("");
    setShowFeedback(false);
  };

  const handlePickFormat = (format: SaveFormat) => {
    setShowSaveFormats(false);
    onSave(format);
  };

  const handleOpenAboutUs = async () => {
    closeMenus();
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/admin/settings",
        method: "GET",
        data: {},
      });
      const settings = (res as any)?.data || [];
      // Try language-specific key first, then fall back to generic
      const langKey = `about_us_text_${language}`;
      const langSetting = settings.find((s: any) => s.setting_key === langKey);
      const fallbackSetting = settings.find((s: any) => s.setting_key === "about_us_text");
      if (langSetting && langSetting.setting_value) {
        setAboutUsText(langSetting.setting_value);
      } else if (fallbackSetting && fallbackSetting.setting_value) {
        setAboutUsText(fallbackSetting.setting_value);
      }
    } catch {
      // Use default text if API fails
    }
    if (!aboutUsText) {
      setAboutUsText("گروه فنی هنری انعکاس با هدف ارایه خدمات رایگان کوچک ولی مفید به شما کاربر گرامی اقدام به توسعه این سرویس نموده است. استفاده از این سرویس کاملا رایگان است. برای تداوم این سرویس از ما حمایت و ما را به دیگران معرفی کنید. برای هرگونه ارتباط با ما از این آیدی در تلگرام استفاده کنید: pmindmap");
    }
    setShowAboutUs(true);
  };

  const handleOpenSupportUs = async () => {
    closeMenus();
    try {
      const res = await client.apiCall.invoke({
        url: "/api/v1/admin/wallets",
        method: "GET",
        data: {},
      });
      const wallets = (res as any)?.data || [];
      const activeWallets = wallets.filter((w: CryptoWallet) => w.is_active);
      setCryptoWallets(activeWallets);
      if (activeWallets.length > 0) setSelectedCrypto(activeWallets[0]);
      else setSelectedCrypto(null);
    } catch {
      setCryptoWallets([]);
      setSelectedCrypto(null);
    }
    setShowSupportUs(true);
  };

  const handleCopyAddress = () => {
    if (selectedCrypto) {
      navigator.clipboard.writeText(selectedCrypto.wallet_address).catch(() => {});
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Resolve QR image URL from object storage when selectedCrypto changes
  useEffect(() => {
    if (!selectedCrypto?.qr_code_url) {
      setResolvedQrUrl("");
      return;
    }
    const qrKey = selectedCrypto.qr_code_url;
    // If already a full URL, use directly
    if (qrKey.startsWith("http://") || qrKey.startsWith("https://")) {
      setResolvedQrUrl(qrKey);
      return;
    }
    // Resolve from object storage
    client.storage
      .getDownloadUrl({ bucket_name: "qr-images", object_key: qrKey })
      .then((res: any) => {
        const url = res?.data?.download_url || res?.download_url || "";
        setResolvedQrUrl(url);
      })
      .catch(() => setResolvedQrUrl(""));
  }, [selectedCrypto?.qr_code_url]);

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
        onClick={() => { setShowSaveFormats(true); closeMenus(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Download className="w-4 h-4 text-slate-500" />
        <span>{t.save}</span>
      </button>

      <div className="h-px bg-slate-200 my-2" />

      <div className="px-1 mb-1">
        <p className="text-xs text-slate-500 mb-1.5">{t.language}</p>
        {languageDropdown}
      </div>

      <div className="h-px bg-slate-200 my-2" />

      {/* About Us */}
      <button
        onClick={handleOpenAboutUs}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Info className="w-4 h-4 text-slate-500" />
        <span>{t.aboutUs}</span>
      </button>

      {/* Support Us (Crypto) */}
      <button
        onClick={handleOpenSupportUs}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <Heart className="w-4 h-4 text-pink-500" />
        <span>{t.supportUs}</span>
      </button>

      <div className="h-px bg-slate-200 my-2" />

      {/* Feedback */}
      <button
        onClick={() => { setShowFeedback(true); closeMenus(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
      >
        <MessageCircle className="w-4 h-4 text-slate-500" />
        <span>{t.feedback}</span>
      </button>

      {/* Telegram support link */}
      <a
        href="https://t.me/pmindmap"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-blue-600 cursor-pointer transition-colors w-full text-start"
      >
        <Send className="w-4 h-4 text-blue-500" />
        <span>{t.telegramSupport}</span>
      </a>
    </div>
  );

  const currentFontSize = selectedNode ? resolveFontSize(selectedNode, isRoot) : 12;
  const currentAlign = selectedNode?.align ?? "center";
  const currentDirection = selectedNode?.direction ?? (isRTL ? "rtl" : "ltr");
  const currentList = selectedNode?.listStyle ?? "none";
  const currentBold = selectedNode?.bold ?? isRoot;

  const formatToggleClass = (active: boolean) =>
    `h-9 w-9 flex items-center justify-center rounded-lg border cursor-pointer transition-colors ${
      active
        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
        : "border-slate-200 text-slate-600 hover:bg-slate-100"
    }`;

  const saveFormatOptions: { format: SaveFormat; label: string; icon: JSX.Element }[] = [
    { format: "json", label: t.formatJson, icon: <FileJson className="w-4 h-4 text-slate-500" /> },
    { format: "markdown", label: t.formatMarkdown, icon: <FileText className="w-4 h-4 text-slate-500" /> },
    { format: "jpg", label: t.formatJpg, icon: <FileImage className="w-4 h-4 text-slate-500" /> },
    { format: "png", label: t.formatPng, icon: <ImageIcon className="w-4 h-4 text-slate-500" /> },
    { format: "svg", label: t.formatSvg, icon: <FileCode2 className="w-4 h-4 text-slate-500" /> },
    { format: "pdf", label: t.formatPdf, icon: <FileDown className="w-4 h-4 text-slate-500" /> },
  ];

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

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveFormats(true)}
          className="h-9 sm:h-8 px-2 sm:px-3 cursor-pointer hover:bg-green-50 active:bg-green-100 border-green-300 text-green-700"
          title={t.saveFormatTitle}
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline ml-1.5">{t.save}</span>
        </Button>

        {selectedNode && (
          <>
            <div className="w-px h-6 bg-slate-300 mx-0.5" />

            {/* Text formatting for the selected node's text */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowFormat(!showFormat);
                  setShowColors(false);
                  setShowCommentInput(false);
                  setShowLinkInput(false);
                }}
                className="h-9 w-9 sm:h-8 sm:w-auto sm:px-3 p-0 cursor-pointer hover:bg-emerald-50 active:bg-emerald-100 border-emerald-300 text-emerald-700"
                title={t.textFormat}
              >
                <Type className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">{t.textFormat}</span>
              </Button>
              {showFormat && (
                <div className="absolute top-full start-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 z-50 w-72 max-w-[90vw]">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{t.textFormat}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <button
                      className={formatToggleClass(currentAlign === "left")}
                      title={t.alignLeft}
                      aria-label={t.alignLeft}
                      onClick={() => onUpdateFormat(selectedNode.id, { align: "left" })}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      className={formatToggleClass(currentAlign === "center")}
                      title={t.alignCenter}
                      aria-label={t.alignCenter}
                      onClick={() => onUpdateFormat(selectedNode.id, { align: "center" })}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      className={formatToggleClass(currentAlign === "right")}
                      title={t.alignRight}
                      aria-label={t.alignRight}
                      onClick={() => onUpdateFormat(selectedNode.id, { align: "right" })}
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>
                    <div className="w-px h-7 bg-slate-200 mx-0.5" />
                    <button
                      className={formatToggleClass(currentBold)}
                      title={t.boldText}
                      aria-label={t.boldText}
                      onClick={() => onUpdateFormat(selectedNode.id, { bold: !currentBold })}
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <button
                      className={formatToggleClass(currentDirection === "ltr")}
                      title={t.directionLtr}
                      aria-label={t.directionLtr}
                      onClick={() => onUpdateFormat(selectedNode.id, { direction: "ltr" })}
                    >
                      <span className="text-[11px] font-bold tracking-tight select-none">LTR</span>
                    </button>
                    <button
                      className={formatToggleClass(currentDirection === "rtl")}
                      title={t.directionRtl}
                      aria-label={t.directionRtl}
                      onClick={() => onUpdateFormat(selectedNode.id, { direction: "rtl" })}
                    >
                      <span className="text-[11px] font-bold tracking-tight select-none">RTL</span>
                    </button>
                    <div className="w-px h-7 bg-slate-200 mx-0.5" />
                    <button
                      className={formatToggleClass(currentList === "numbered")}
                      title={t.numberedList}
                      aria-label={t.numberedList}
                      onClick={() =>
                        onUpdateFormat(selectedNode.id, { listStyle: currentList === "numbered" ? "none" : "numbered" })
                      }
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                      className={formatToggleClass(currentList === "bulleted")}
                      title={t.bulletedList}
                      aria-label={t.bulletedList}
                      onClick={() =>
                        onUpdateFormat(selectedNode.id, { listStyle: currentList === "bulleted" ? "none" : "bulleted" })
                      }
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-px bg-slate-200 my-3" />

                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{t.fontSizeLabel}</p>
                  <div className="flex items-center gap-3">
                    <button
                      className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                      title={t.decreaseFontSize}
                      aria-label={t.decreaseFontSize}
                      disabled={currentFontSize <= MIN_FONT_SIZE}
                      onClick={() => onUpdateFormat(selectedNode.id, { fontSize: Math.max(MIN_FONT_SIZE, currentFontSize - 1) })}
                    >
                      <Minus4 />
                    </button>
                    <input
                      type="range"
                      min={MIN_FONT_SIZE}
                      max={MAX_FONT_SIZE}
                      value={currentFontSize}
                      onChange={(e) => onUpdateFormat(selectedNode.id, { fontSize: Number(e.target.value) })}
                      className="flex-1 cursor-pointer accent-emerald-600"
                      aria-label={t.fontSizeLabel}
                    />
                    <button
                      className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                      title={t.increaseFontSize}
                      aria-label={t.increaseFontSize}
                      disabled={currentFontSize >= MAX_FONT_SIZE}
                      onClick={() => onUpdateFormat(selectedNode.id, { fontSize: Math.min(MAX_FONT_SIZE, currentFontSize + 1) })}
                    >
                      <Plus4 />
                    </button>
                    <span className="text-sm font-mono text-slate-600 w-8 text-center">{currentFontSize}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowColors(!showColors);
                  setShowFormat(false);
                  setShowCommentInput(false);
                  setShowLinkInput(false);
                }}
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

        {feedbackSent && (
          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-1">
            <Check className="w-3.5 h-3.5" />
            <span>{t.feedbackSentSuccess}</span>
          </span>
        )}

        <div className="text-xs text-slate-500 hidden xl:block">
          {selectedNode ? t.shortcutHints : t.helpText}
        </div>
      </div>

      {/* Save format submenu */}
      {showSaveFormats && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSaveFormats(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-80 max-w-full">
            <p className="text-sm font-semibold mb-1">{t.saveFormatTitle}</p>
            <p className="text-xs text-slate-500 mb-3">{t.saveFormatMessage}</p>
            <div className="flex flex-col gap-1">
              {saveFormatOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => handlePickFormat(option.format)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-sm text-slate-700 cursor-pointer transition-colors w-full text-start"
                >
                  {option.icon}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowSaveFormats(false)} className="cursor-pointer">
                {t.cancelButton}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Feedback dialog */}
      {showFeedback && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowFeedback(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-96 max-w-full">
            <p className="text-sm font-medium mb-2">{t.feedbackTitle}</p>
            <p className="text-xs text-slate-500 mb-3">{t.feedbackMessage}</p>

            {/* Feedback type selector */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setFeedbackType("normal")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${
                  feedbackType === "normal"
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.normalFeedback}
              </button>
              <button
                onClick={() => setFeedbackType("urgent")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${
                  feedbackType === "urgent"
                    ? "border-red-400 bg-red-50 text-red-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.urgentFeedback}
              </button>
            </div>

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

            {/* Telegram link */}
            <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
              <Send className="w-3.5 h-3.5" />
              <span>{t.telegramContactText}</span>
              <a href="https://t.me/pmindmap" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                @pmindmap
              </a>
            </div>

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

      {/* About Us modal */}
      {showAboutUs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAboutUs(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-96 max-w-full">
            <p className="text-sm font-semibold mb-3">{t.aboutUsTitle}</p>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap" dir="auto">
              {aboutUsText}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-blue-600">
              <Send className="w-3.5 h-3.5" />
              <span>Telegram:</span>
              <a href="https://t.me/pmindmap" target="_blank" rel="noopener noreferrer" className="font-medium underline">
                @pmindmap
              </a>
            </div>
            <div className="flex justify-between items-center mt-4">
              <a
                href="https://t.me/pmindmap"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-600 font-medium hover:underline cursor-pointer"
              >
                ❤️ {t.financialSupport}
              </a>
              <Button variant="outline" size="sm" onClick={() => setShowAboutUs(false)} className="cursor-pointer">
                {t.close}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Support Us (Crypto donations) modal */}
      {showSupportUs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSupportUs(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-5 w-96 max-w-full">
            <p className="text-sm font-semibold mb-3">{t.supportUsTitle}</p>

            {cryptoWallets.length === 0 ? (
              <p className="text-sm text-slate-500">{t.noCryptoWallets}</p>
            ) : (
              <>
                <p className="text-xs text-slate-500 mb-2">{t.selectCrypto}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {cryptoWallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => { setSelectedCrypto(w); setCopiedAddress(false); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-colors ${
                        selectedCrypto?.id === w.id
                          ? "border-pink-400 bg-pink-50 text-pink-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {w.crypto_name}
                    </button>
                  ))}
                </div>

                {selectedCrypto && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">{t.walletAddress}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs break-all bg-white border border-slate-200 rounded p-2 font-mono">
                        {selectedCrypto.wallet_address}
                      </code>
                      <button
                        onClick={handleCopyAddress}
                        className="shrink-0 p-2 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
                        title={t.copyAddress}
                      >
                        {copiedAddress ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                      </button>
                    </div>
                    {copiedAddress && (
                      <p className="text-xs text-green-600 mt-1">{t.copied}</p>
                    )}
                    {(resolvedQrUrl || selectedCrypto.qr_code_url) && (
                      <div className="mt-3 flex justify-center">
                        <img
                          src={resolvedQrUrl || selectedCrypto.qr_code_url}
                          alt={`${selectedCrypto.crypto_name} QR`}
                          className="w-40 h-40 border border-slate-200 rounded-lg object-contain bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowSupportUs(false)} className="cursor-pointer">
                {t.close}
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

/** Small local glyphs so font-size steppers stay visually compact. */
function Minus4() {
  return <span className="text-lg leading-none font-semibold select-none">−</span>;
}

function Plus4() {
  return <span className="text-lg leading-none font-semibold select-none">+</span>;
}