import { jsPDF } from "jspdf";
import { MindMapData, MindMapNode } from "@/types/mindmap";

/** Website stamped into every exported file. */
export const EXPORT_WEBSITE = "www.pmindmap.com";

export type SaveFormat = "json" | "markdown" | "png" | "jpg" | "svg" | "pdf";

function triggerDownload(url: string, filename: string, revoke: boolean) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) URL.revokeObjectURL(url);
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  triggerDownload(URL.createObjectURL(blob), filename, true);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  triggerDownload(dataUrl, filename, false);
}

/** JSON payload with the website recorded in the file header fields. */
export function buildJSONString(data: MindMapData): string {
  const payload = {
    website: EXPORT_WEBSITE,
    generator: `Personal Mind Map - ${EXPORT_WEBSITE}`,
    exportedAt: new Date().toISOString(),
    version: data.version,
    root: data.root,
  };
  return JSON.stringify(payload, null, 2);
}

function nodeToMarkdown(node: MindMapNode, depth: number, lines: string[]) {
  const label = node.text.replace(/\n+/g, " ").trim() || "-";
  const linked = node.hyperlink ? `[${label}](${node.hyperlink})` : label;

  if (depth === 0) {
    lines.push(`# ${linked}`, "");
  } else {
    lines.push(`${"  ".repeat(depth - 1)}- ${linked}`);
  }

  if (node.comment) {
    const indent = depth === 0 ? "" : "  ".repeat(depth);
    lines.push(`${indent}> ${node.comment.replace(/\n+/g, " ").trim()}`);
  }

  for (const child of node.children) {
    nodeToMarkdown(child, depth + 1, lines);
  }
}

/** Markdown outline with the website in the file header. */
export function buildMarkdownString(data: MindMapData): string {
  const lines: string[] = [
    `<!-- ${EXPORT_WEBSITE} -->`,
    `<!-- Exported from Personal Mind Map - ${EXPORT_WEBSITE} -->`,
    "",
    `> ${EXPORT_WEBSITE}`,
    "",
  ];
  nodeToMarkdown(data.root, 0, lines);
  lines.push("", "---", `Created with ${EXPORT_WEBSITE}`, "");
  return lines.join("\n");
}

/** Wrap the raster export into a single-page PDF with the website in the footer. */
export async function exportPdf(dataUrl: string, imageWidth: number, imageHeight: number, filename: string) {
  const orientation = imageWidth >= imageHeight ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const footerSpace = 26;

  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2 - footerSpace;
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight, 1);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const offsetX = (pageWidth - drawWidth) / 2;
  const offsetY = margin;

  pdf.addImage(dataUrl, "PNG", offsetX, offsetY, drawWidth, drawHeight);

  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139);
  pdf.text(EXPORT_WEBSITE, pageWidth / 2, pageHeight - margin / 1.5, { align: "center" });

  pdf.save(filename);
}