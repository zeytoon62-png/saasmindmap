export type Language = "fa" | "ar" | "en" | "es";

export interface Translations {
  // General
  appTitle: string;
  // Toolbar
  undo: string;
  redo: string;
  load: string;
  save: string;
  saveAs: string;
  saveImage: string;
  newFile: string;
  exportImage: string;
  reset: string;
  edit: string;
  color: string;
  delete: string;
  autoSave: string;
  autoSaveOn: string;
  autoSaveOff: string;
  language: string;
  feedback: string;
  menu: string;
  // Node actions
  comment: string;
  hyperlink: string;
  addComment: string;
  addHyperlink: string;
  editComment: string;
  editHyperlink: string;
  commentPlaceholder: string;
  hyperlinkPlaceholder: string;
  // Tooltips
  undoTooltip: string;
  redoTooltip: string;
  loadTooltip: string;
  saveTooltip: string;
  saveAsTooltip: string;
  exportImageTooltip: string;
  resetTooltip: string;
  editTooltip: string;
  colorTooltip: string;
  deleteTooltip: string;
  feedbackTooltip: string;
  // Messages
  invalidJSON: string;
  jsonReadError: string;
  helpText: string;
  autoSaveLocationPrompt: string;
  // Default mind map
  mainIdea: string;
  branch1: string;
  branch2: string;
  branch3: string;
  newNode: string;
  // Dialogs
  saveDialogTitle: string;
  saveDialogMessage: string;
  saveButton: string;
  cancelButton: string;
  okButton: string;
  feedbackTitle: string;
  feedbackMessage: string;
  feedbackPlaceholder: string;
  sendButton: string;
}

export const translations: Record<Language, Translations> = {
  fa: {
    appTitle: "ویرایشگر نقشه ذهنی",
    undo: "بازگشت",
    redo: "از نو",
    load: "بارگذاری",
    save: "ذخیره",
    saveAs: "ذخیره جدید",
    saveImage: "ذخیره تصویر",
    newFile: "جدید",
    exportImage: "تصویر",
    reset: "ریست",
    edit: "ویرایش",
    color: "رنگ",
    delete: "حذف",
    autoSave: "ذخیره خودکار",
    autoSaveOn: "ذخیره خودکار: روشن",
    autoSaveOff: "ذخیره خودکار: خاموش",
    language: "زبان",
    feedback: "بازخورد",
    menu: "منو",
    comment: "یادداشت",
    hyperlink: "لینک",
    addComment: "افزودن یادداشت",
    addHyperlink: "افزودن لینک",
    editComment: "ویرایش یادداشت",
    editHyperlink: "ویرایش لینک",
    commentPlaceholder: "متن یادداشت را وارد کنید...",
    hyperlinkPlaceholder: "آدرس لینک را وارد کنید...",
    undoTooltip: "بازگشت (Ctrl+Z)",
    redoTooltip: "از نو (Ctrl+Y)",
    loadTooltip: "بارگذاری JSON",
    saveTooltip: "ذخیره JSON",
    saveAsTooltip: "ذخیره به عنوان فایل جدید",
    exportImageTooltip: "خروجی تصویر",
    resetTooltip: "شروع مجدد",
    editTooltip: "ویرایش متن",
    colorTooltip: "تغییر رنگ",
    deleteTooltip: "حذف نود",
    feedbackTooltip: "ارسال نظرات و ایرادات",
    invalidJSON: "فایل JSON معتبر نیست. ساختار مایندمپ یافت نشد.",
    jsonReadError: "خطا در خواندن فایل JSON",
    helpText: "کلیک: انتخاب • دابل‌کلیک: ویرایش • درگ: جابه‌جایی",
    autoSaveLocationPrompt: "لطفاً محل ذخیره فایل‌های خودکار را انتخاب کنید.",
    mainIdea: "ایده اصلی",
    branch1: "شاخه ۱",
    branch2: "شاخه ۲",
    branch3: "شاخه ۳",
    newNode: "نود جدید",
    saveDialogTitle: "ذخیره پروژه",
    saveDialogMessage: "لطفاً محل ذخیره فایل را انتخاب کنید.",
    saveButton: "ذخیره",
    cancelButton: "انصراف",
    okButton: "تأیید",
    feedbackTitle: "ارسال بازخورد",
    feedbackMessage: "نظرات، پیشنهادات یا ایرادات خود را بنویسید:",
    feedbackPlaceholder: "متن بازخورد...",
    sendButton: "ارسال",
  },
  ar: {
    appTitle: "محرر الخريطة الذهنية",
    undo: "تراجع",
    redo: "إعادة",
    load: "تحميل",
    save: "حفظ",
    saveAs: "حفظ باسم",
    saveImage: "حفظ صورة",
    newFile: "جديد",
    exportImage: "صورة",
    reset: "إعادة تعيين",
    edit: "تحرير",
    color: "لون",
    delete: "حذف",
    autoSave: "حفظ تلقائي",
    autoSaveOn: "الحفظ التلقائي: مفعّل",
    autoSaveOff: "الحفظ التلقائي: معطّل",
    language: "اللغة",
    feedback: "ملاحظات",
    menu: "القائمة",
    comment: "ملاحظة",
    hyperlink: "رابط",
    addComment: "إضافة ملاحظة",
    addHyperlink: "إضافة رابط",
    editComment: "تحرير الملاحظة",
    editHyperlink: "تحرير الرابط",
    commentPlaceholder: "أدخل نص الملاحظة...",
    hyperlinkPlaceholder: "أدخل عنوان الرابط...",
    undoTooltip: "تراجع (Ctrl+Z)",
    redoTooltip: "إعادة (Ctrl+Y)",
    loadTooltip: "تحميل JSON",
    saveTooltip: "حفظ JSON",
    saveAsTooltip: "حفظ كملف جديد",
    exportImageTooltip: "تصدير صورة",
    resetTooltip: "إعادة تعيين",
    editTooltip: "تحرير النص",
    colorTooltip: "تغيير اللون",
    deleteTooltip: "حذف العقدة",
    feedbackTooltip: "إرسال الملاحظات والمشاكل",
    invalidJSON: "ملف JSON غير صالح. لم يتم العثور على بنية الخريطة الذهنية.",
    jsonReadError: "خطأ في قراءة ملف JSON",
    helpText: "نقر: تحديد • نقر مزدوج: تحرير • سحب: نقل",
    autoSaveLocationPrompt: "يرجى اختيار مكان حفظ الملفات التلقائية.",
    mainIdea: "الفكرة الرئيسية",
    branch1: "الفرع ١",
    branch2: "الفرع ٢",
    branch3: "الفرع ٣",
    newNode: "عقدة جديدة",
    saveDialogTitle: "حفظ المشروع",
    saveDialogMessage: "يرجى اختيار مكان حفظ الملف.",
    saveButton: "حفظ",
    cancelButton: "إلغاء",
    okButton: "موافق",
    feedbackTitle: "إرسال ملاحظات",
    feedbackMessage: "اكتب ملاحظاتك أو اقتراحاتك أو المشاكل:",
    feedbackPlaceholder: "نص الملاحظات...",
    sendButton: "إرسال",
  },
  en: {
    appTitle: "Mind Map Editor",
    undo: "Undo",
    redo: "Redo",
    load: "Load",
    save: "Save",
    saveAs: "Save As",
    saveImage: "Save Image",
    newFile: "New",
    exportImage: "Image",
    reset: "Reset",
    edit: "Edit",
    color: "Color",
    delete: "Delete",
    autoSave: "Auto Save",
    autoSaveOn: "Auto Save: On",
    autoSaveOff: "Auto Save: Off",
    language: "Language",
    feedback: "Feedback",
    menu: "Menu",
    comment: "Comment",
    hyperlink: "Link",
    addComment: "Add Comment",
    addHyperlink: "Add Link",
    editComment: "Edit Comment",
    editHyperlink: "Edit Link",
    commentPlaceholder: "Enter comment text...",
    hyperlinkPlaceholder: "Enter link URL...",
    undoTooltip: "Undo (Ctrl+Z)",
    redoTooltip: "Redo (Ctrl+Y)",
    loadTooltip: "Load JSON",
    saveTooltip: "Save JSON",
    saveAsTooltip: "Save as new file",
    exportImageTooltip: "Export Image",
    resetTooltip: "Reset",
    editTooltip: "Edit Text",
    colorTooltip: "Change Color",
    deleteTooltip: "Delete Node",
    feedbackTooltip: "Send feedback and report issues",
    invalidJSON: "Invalid JSON file. Mind map structure not found.",
    jsonReadError: "Error reading JSON file",
    helpText: "Click: Select • Double-click: Edit • Drag: Reparent",
    autoSaveLocationPrompt: "Please choose a location for auto-save files.",
    mainIdea: "Main Idea",
    branch1: "Branch 1",
    branch2: "Branch 2",
    branch3: "Branch 3",
    newNode: "New Node",
    saveDialogTitle: "Save Project",
    saveDialogMessage: "Please choose a location to save the file.",
    saveButton: "Save",
    cancelButton: "Cancel",
    okButton: "OK",
    feedbackTitle: "Send Feedback",
    feedbackMessage: "Write your comments, suggestions, or issues:",
    feedbackPlaceholder: "Feedback text...",
    sendButton: "Send",
  },
  es: {
    appTitle: "Editor de Mapa Mental",
    undo: "Deshacer",
    redo: "Rehacer",
    load: "Cargar",
    save: "Guardar",
    saveAs: "Guardar como",
    saveImage: "Guardar imagen",
    newFile: "Nuevo",
    exportImage: "Imagen",
    reset: "Reiniciar",
    edit: "Editar",
    color: "Color",
    delete: "Eliminar",
    autoSave: "Guardado automático",
    autoSaveOn: "Guardado auto: Activado",
    autoSaveOff: "Guardado auto: Desactivado",
    language: "Idioma",
    feedback: "Comentarios",
    menu: "Menú",
    comment: "Nota",
    hyperlink: "Enlace",
    addComment: "Agregar nota",
    addHyperlink: "Agregar enlace",
    editComment: "Editar nota",
    editHyperlink: "Editar enlace",
    commentPlaceholder: "Ingrese el texto de la nota...",
    hyperlinkPlaceholder: "Ingrese la URL del enlace...",
    undoTooltip: "Deshacer (Ctrl+Z)",
    redoTooltip: "Rehacer (Ctrl+Y)",
    loadTooltip: "Cargar JSON",
    saveTooltip: "Guardar JSON",
    saveAsTooltip: "Guardar como archivo nuevo",
    exportImageTooltip: "Exportar imagen",
    resetTooltip: "Reiniciar",
    editTooltip: "Editar texto",
    colorTooltip: "Cambiar color",
    deleteTooltip: "Eliminar nodo",
    feedbackTooltip: "Enviar comentarios y reportar problemas",
    invalidJSON: "Archivo JSON no válido. No se encontró la estructura del mapa mental.",
    jsonReadError: "Error al leer el archivo JSON",
    helpText: "Clic: Seleccionar • Doble clic: Editar • Arrastrar: Mover",
    autoSaveLocationPrompt: "Por favor elija una ubicación para los archivos de guardado automático.",
    mainIdea: "Idea Principal",
    branch1: "Rama 1",
    branch2: "Rama 2",
    branch3: "Rama 3",
    newNode: "Nuevo Nodo",
    saveDialogTitle: "Guardar Proyecto",
    saveDialogMessage: "Por favor elija una ubicación para guardar el archivo.",
    saveButton: "Guardar",
    cancelButton: "Cancelar",
    okButton: "Aceptar",
    feedbackTitle: "Enviar Comentarios",
    feedbackMessage: "Escriba sus comentarios, sugerencias o problemas:",
    feedbackPlaceholder: "Texto de comentarios...",
    sendButton: "Enviar",
  },
};

export function isRTL(lang: Language): boolean {
  return lang === "fa" || lang === "ar";
}

export function getLanguageLabel(lang: Language): string {
  switch (lang) {
    case "fa": return "فارسی";
    case "ar": return "العربية";
    case "en": return "English";
    case "es": return "Español";
  }
}