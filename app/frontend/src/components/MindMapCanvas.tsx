import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo } from "react";
import {
  MindMapNode,
  NodeAlign,
  NodeDirection,
  NodeListStyle,
  getNodeDepth,
  resolveNodeColor,
  resolveFontSize,
} from "@/types/mindmap";
import { EXPORT_WEBSITE } from "@/lib/mindmapExport";
import { Maximize2, Minus, Plus, Crosshair } from "lucide-react";

interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
  iconReserve: number;
  fontSize: number;
  lineHeight: number;
  align: NodeAlign;
  direction: NodeDirection;
  bold: boolean;
}

interface MindMapCanvasProps {
  root: MindMapNode;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  isRTL: boolean;
  labels: {
    zoomIn: string;
    zoomOut: string;
    resetView: string;
    fitToScreen: string;
  };
  onSelectNode: (id: string) => void;
  onStartEdit: (id: string) => void;
  onFinishEdit: (id: string, text: string) => void;
  onAddChild: (parentId: string) => void;
  onReparentNode: (nodeId: string, newParentId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  readOnly?: boolean;
}

export interface ImageExportResult {
  dataUrl: string;
  width: number;
  height: number;
}

export interface MindMapCanvasHandle {
  exportToImage: (format?: "png" | "jpeg") => Promise<ImageExportResult | null>;
  exportToSvgString: () => string | null;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const NODE_MIN_WIDTH = 64;
const NODE_MIN_HEIGHT = 34;
/** Halved horizontal/vertical text padding inside node boxes. */
const NODE_PADDING_X = 7;
const NODE_PADDING_Y = 5;
const MAX_CHARS_PER_LINE = 22;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 14;
const PLUS_BUTTON_RADIUS = 6;
const ICON_SIZE = 11;
const ICON_PAD = 3;
const EDGE_MARGIN = 40;
const FIT_MARGIN = 48;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;
/** Room reserved at the bottom of exports for the website stamp. */
const EXPORT_FOOTER_HEIGHT = 46;

/** Prefix each paragraph with a list marker when a list style is active. */
function applyListStyle(text: string, listStyle?: NodeListStyle): string {
  if (!listStyle || listStyle === "none") return text;
  let counter = 0;
  return text
    .split("\n")
    .map((paragraph) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return paragraph;
      counter += 1;
      return listStyle === "numbered" ? `${counter}. ${trimmed}` : `• ${trimmed}`;
    })
    .join("\n");
}

/** Wrap long labels and honour explicit line breaks entered with Shift+Enter. */
function wrapText(text: string): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const clean = paragraph.replace(/[ \t]+/g, " ").trim();
    if (!clean) {
      lines.push("");
      continue;
    }
    if (clean.length <= MAX_CHARS_PER_LINE) {
      lines.push(clean);
      continue;
    }

    const words = clean.split(" ");
    let current = "";

    for (const word of words) {
      if (word.length > MAX_CHARS_PER_LINE) {
        if (current) {
          lines.push(current);
          current = "";
        }
        let rest = word;
        while (rest.length > MAX_CHARS_PER_LINE) {
          lines.push(rest.slice(0, MAX_CHARS_PER_LINE));
          rest = rest.slice(MAX_CHARS_PER_LINE);
        }
        current = rest;
        continue;
      }
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > MAX_CHARS_PER_LINE) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }

  return lines.length ? lines : [""];
}

function hasIcons(node: MindMapNode): boolean {
  return !!node.comment || !!node.hyperlink;
}

interface Measurement {
  lines: string[];
  width: number;
  height: number;
  iconReserve: number;
  fontSize: number;
  lineHeight: number;
  align: NodeAlign;
  direction: NodeDirection;
  bold: boolean;
}

function measureNode(node: MindMapNode, text: string, isRoot: boolean, defaultDirection: NodeDirection): Measurement {
  const fontSize = resolveFontSize(node, isRoot);
  const lineHeight = Math.max(13, Math.round(fontSize * 1.45));
  const bold = node.bold ?? isRoot;
  const charWidth = fontSize * (bold ? 0.78 : 0.72);

  const lines = wrapText(applyListStyle(text, node.listStyle));
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const iconReserve = hasIcons(node) ? ICON_SIZE + ICON_PAD * 2 : 0;

  const width = Math.max(NODE_MIN_WIDTH, Math.round(longest * charWidth) + NODE_PADDING_X * 2) + iconReserve;
  const height = Math.max(NODE_MIN_HEIGHT, lines.length * lineHeight + NODE_PADDING_Y * 2);

  return {
    lines,
    width,
    height,
    iconReserve,
    fontSize,
    lineHeight,
    align: node.align ?? "center",
    direction: node.direction ?? defaultDirection,
    bold,
  };
}

function calculateLayout(
  node: MindMapNode,
  x: number,
  y: number,
  positions: NodePosition[],
  isRTL: boolean,
  textOf: (node: MindMapNode) => string,
  depth = 0
): { totalHeight: number } {
  const defaultDirection: NodeDirection = isRTL ? "rtl" : "ltr";
  const measured = measureNode(node, textOf(node), depth === 0, defaultDirection);

  if (node.children.length === 0 || node.collapsed) {
    positions.push({ id: node.id, x, y, ...measured });
    return { totalHeight: measured.height };
  }

  let childY = y;
  let totalChildHeight = 0;

  for (const child of node.children) {
    const childWidth = measureNode(child, textOf(child), false, defaultDirection).width;
    const childX = isRTL ? x - HORIZONTAL_GAP - childWidth : x + measured.width + HORIZONTAL_GAP;
    const { totalHeight } = calculateLayout(child, childX, childY, positions, isRTL, textOf, depth + 1);
    totalChildHeight += totalHeight;
    childY += totalHeight + VERTICAL_GAP;
  }

  totalChildHeight += (node.children.length - 1) * VERTICAL_GAP;

  const nodeY = y + totalChildHeight / 2 - measured.height / 2;
  positions.push({ id: node.id, x, y: nodeY, ...measured });

  return { totalHeight: Math.max(totalChildHeight, measured.height) };
}

/** Open links directly, adding a protocol when the user omitted it. */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export const MindMapCanvas = forwardRef<MindMapCanvasHandle, MindMapCanvasProps>(
  ({ root, selectedNodeId, editingNodeId, isRTL: isRTLLayout, labels, onSelectNode, onStartEdit, onFinishEdit, onAddChild, onReparentNode, onToggleCollapse, readOnly = false }, ref) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: EDGE_MARGIN, y: EDGE_MARGIN });
    const [isPanning, setIsPanning] = useState(false);
    const [editText, setEditText] = useState("");

    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLTextAreaElement>(null);
    const zoomRef = useRef(1);
    const panRef = useRef({ x: EDGE_MARGIN, y: EDGE_MARGIN });
    const panStartRef = useRef({ x: 0, y: 0 });
    const pinchDistance = useRef<number | null>(null);
    const pinchCenter = useRef<{ x: number; y: number } | null>(null);

    // Drag state
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const [nearestParentId, setNearestParentId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const isDragActive = useRef(false);
    // Long-press state for mobile drag
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressTriggered = useRef(false);
    const longPressStartPos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      zoomRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
      panRef.current = pan;
    }, [pan]);

    // Live text of the node being edited so the box resizes while typing.
    const textOf = useCallback(
      (node: MindMapNode) => (node.id === editingNodeId ? editText : node.text),
      [editingNodeId, editText]
    );

    // Memoize layout calculation – prevents expensive recalculation during zoom/pan
    const { positions, contentMinX, contentMaxX, contentMinY, contentMaxY } = useMemo(() => {
      const pos: NodePosition[] = [];
      calculateLayout(root, 0, 0, pos, isRTLLayout, textOf);
      if (pos.length === 0) return { positions: pos, contentMinX: 0, contentMaxX: 0, contentMinY: 0, contentMaxY: 0 };
      const minX = Math.min(...pos.map((p) => p.x));
      const maxX = Math.max(...pos.map((p) => p.x + p.width));
      const minY = Math.min(...pos.map((p) => p.y));
      const maxY = Math.max(...pos.map((p) => p.y + p.height));
      return { positions: pos, contentMinX: minX, contentMaxX: maxX, contentMinY: minY, contentMaxY: maxY };
    }, [root, isRTLLayout, textOf]);

    /** Compute pan so that the root node is centered in viewport at zoom=1. */
    const computeInitialPan = useCallback(() => {
      const container = containerRef.current;
      const containerWidth = container?.clientWidth ?? 0;
      const containerHeight = container?.clientHeight ?? 0;
      // Find root node position
      const rootPos = positions.find((p) => p.id === root.id);
      if (rootPos && containerWidth > 0 && containerHeight > 0) {
        const rootCenterX = rootPos.x + rootPos.width / 2;
        const rootCenterY = rootPos.y + rootPos.height / 2;
        return {
          x: containerWidth / 2 - rootCenterX,
          y: containerHeight / 2 - rootCenterY,
        };
      }
      // Fallback: edge margin
      if (isRTLLayout && containerWidth > 0) {
        return { x: containerWidth - EDGE_MARGIN - contentMaxX, y: EDGE_MARGIN };
      }
      return { x: EDGE_MARGIN - contentMinX, y: EDGE_MARGIN };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRTLLayout, contentMaxX, contentMinX, positions, root.id]);

    const resetView = useCallback(() => {
      const next = computeInitialPan();
      zoomRef.current = 1;
      panRef.current = next;
      setZoom(1);
      setPan(next);
    }, [computeInitialPan]);

    /** Scale and centre so the entire map fits inside the visible viewport. */
    const fitToScreen = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const viewWidth = container.clientWidth;
      const viewHeight = container.clientHeight;
      if (viewWidth <= 0 || viewHeight <= 0) return;

      // Include the trailing "+"/chevron buttons so nothing is clipped after fitting.
      const boundsMinX = contentMinX - (PLUS_BUTTON_RADIUS * 4 + 12);
      const boundsMaxX = contentMaxX + (PLUS_BUTTON_RADIUS * 4 + 12);
      const boundsWidth = Math.max(1, boundsMaxX - boundsMinX);
      const boundsHeight = Math.max(1, contentMaxY - contentMinY);

      const availableWidth = Math.max(50, viewWidth - FIT_MARGIN * 2);
      const availableHeight = Math.max(50, viewHeight - FIT_MARGIN * 2);
      const rawZoom = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight);
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, rawZoom));
      if (!Number.isFinite(nextZoom) || nextZoom <= 0) return;

      const nextX = viewWidth / 2 - ((boundsMinX + boundsMaxX) / 2) * nextZoom;
      const nextY = viewHeight / 2 - ((contentMinY + contentMaxY) / 2) * nextZoom;
      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return;

      zoomRef.current = nextZoom;
      panRef.current = { x: nextX, y: nextY };
      setZoom(nextZoom);
      setPan({ x: nextX, y: nextY });
    }, [contentMinX, contentMaxX, contentMinY, contentMaxY]);

    // Initial placement and re-placement when the reading direction flips.
    useEffect(() => {
      resetView();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRTLLayout]);

    useEffect(() => {
      if (!editingNodeId) return;
      const findNodeText = (node: MindMapNode): string | null => {
        if (node.id === editingNodeId) return node.text;
        for (const child of node.children) {
          const found = findNodeText(child);
          if (found !== null) return found;
        }
        return null;
      };
      const text = findNodeText(root);
      if (text !== null) setEditText(text);
      const timer = setTimeout(() => {
        // preventScroll keeps the top toolbar in place when the mobile keyboard opens.
        editInputRef.current?.focus({ preventScroll: true });
        editInputRef.current?.select();
      }, 40);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingNodeId]);

    /** Detached copy of the map with an opaque background and the website stamp. */
    const buildExportSvg = useCallback((): { clone: SVGSVGElement; width: number; height: number } | null => {
      if (!svgRef.current) return null;

      const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
      const totalWidth = contentMaxX - contentMinX + 200;
      const totalHeight = contentMaxY - contentMinY + 160 + EXPORT_FOOTER_HEIGHT;

      clone.setAttribute("xmlns", SVG_NS);
      clone.setAttribute("width", String(totalWidth));
      clone.setAttribute("height", String(totalHeight));
      clone.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);

      const background = clone.querySelector('rect[data-bg="true"]');
      if (background) background.setAttribute("fill", "#F8FAFC");

      const gElement = clone.querySelector("g[transform]");
      if (gElement) {
        gElement.setAttribute("transform", `translate(${-contentMinX + 80}, ${-contentMinY + 60})`);
      }

      clone.querySelectorAll("foreignObject").forEach((fo) => fo.remove());

      // Website address stamped at the bottom of every exported image.
      const footer = document.createElementNS(SVG_NS, "text");
      footer.setAttribute("x", String(totalWidth / 2));
      footer.setAttribute("y", String(totalHeight - EXPORT_FOOTER_HEIGHT / 2.6));
      footer.setAttribute("text-anchor", "middle");
      footer.setAttribute("font-size", "15");
      footer.setAttribute("font-family", "Arial, Helvetica, sans-serif");
      footer.setAttribute("fill", "#64748B");
      footer.textContent = EXPORT_WEBSITE;
      clone.appendChild(footer);

      return { clone, width: totalWidth, height: totalHeight };
    }, [contentMinX, contentMaxX, contentMinY, contentMaxY]);

    useImperativeHandle(ref, () => ({
      exportToSvgString: () => {
        const built = buildExportSvg();
        if (!built) return null;
        return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(built.clone)}`;
      },
      exportToImage: async (format: "png" | "jpeg" = "png") => {
        const built = buildExportSvg();
        if (!built) return null;

        const { clone, width, height } = built;
        const svgString = new XMLSerializer().serializeToString(clone);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        return new Promise<ImageExportResult | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.scale(2, 2);
              ctx.fillStyle = "#F8FAFC";
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              const mime = format === "jpeg" ? "image/jpeg" : "image/png";
              resolve({ dataUrl: canvas.toDataURL(mime, 0.95), width, height });
            } else {
              resolve(null);
            }
            URL.revokeObjectURL(url);
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          img.src = url;
        });
      },
    }));

    const findPosition = (id: string) => positions.find((p) => p.id === id);

    /** Pointer coordinates relative to the canvas box (sidebar-safe). */
    const toLocalPoint = useCallback((clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      return {
        x: clientX - (rect?.left ?? 0),
        y: clientY - (rect?.top ?? 0),
      };
    }, []);

    const localToSvg = useCallback((localX: number, localY: number) => {
      const currentZoom = zoomRef.current || 1;
      return {
        x: (localX - panRef.current.x) / currentZoom,
        y: (localY - panRef.current.y) / currentZoom,
      };
    }, []);

    /** Zoom around a fixed anchor point so the content under the pointer stays put. */
    const applyZoom = useCallback((factor: number, anchorX: number, anchorY: number) => {
      if (!Number.isFinite(factor) || factor <= 0) return;
      const prevZoom = zoomRef.current || 1;
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor));
      if (!Number.isFinite(nextZoom) || nextZoom === prevZoom) return;

      const ratio = nextZoom / prevZoom;
      const prevPan = panRef.current;
      const nextX = anchorX - (anchorX - prevPan.x) * ratio;
      const nextY = anchorY - (anchorY - prevPan.y) * ratio;
      if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) return;

      zoomRef.current = nextZoom;
      panRef.current = { x: nextX, y: nextY };
      setZoom(nextZoom);
      setPan({ x: nextX, y: nextY });
    }, []);

    const zoomFromButton = useCallback((factor: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      applyZoom(factor, (rect?.width ?? 0) / 2, (rect?.height ?? 0) / 2);
    }, [applyZoom]);

    const movePan = useCallback((dx: number, dy: number) => {
      const prev = panRef.current;
      const next = { x: prev.x + dx, y: prev.y + dy };
      if (!Number.isFinite(next.x) || !Number.isFinite(next.y)) return;
      panRef.current = next;
      setPan(next);
    }, []);

    const getDescendantIds = useCallback((node: MindMapNode, targetId: string): string[] => {
      if (node.id === targetId) {
        const collect = (n: MindMapNode): string[] => {
          let ids = [n.id];
          for (const child of n.children) ids = ids.concat(collect(child));
          return ids;
        };
        return collect(node);
      }
      for (const child of node.children) {
        const result = getDescendantIds(child, targetId);
        if (result.length > 0) return result;
      }
      return [];
    }, []);

    const findNearestNode = useCallback((x: number, y: number, excludeIds: string[]): string | null => {
      let nearest: string | null = null;
      let minDist = Infinity;
      for (const pos of positions) {
        if (excludeIds.includes(pos.id)) continue;
        // In RTL: the dragged node's RIGHT edge connects to the target's LEFT edge
        // In LTR: the dragged node's LEFT edge connects to the target's RIGHT edge
        const edgeX = isRTLLayout ? pos.x : pos.x + pos.width;
        const edgeY = pos.y + pos.height / 2;
        const dist = Math.sqrt((edgeX - x) ** 2 + (edgeY - y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = pos.id;
        }
      }
      // Only snap if within a reasonable distance
      return minDist < 200 ? nearest : null;
    }, [positions, isRTLLayout]);

    const cancelDrag = useCallback(() => {
      setDraggingNodeId(null);
      setNearestParentId(null);
      isDragActive.current = false;
      dragStartPos.current = null;
    }, []);

    const startNodeDrag = useCallback((nodeId: string, pos: NodePosition, clientX: number, clientY: number) => {
      const local = toLocalPoint(clientX, clientY);
      const svgPoint = localToSvg(local.x, local.y);
      dragStartPos.current = { x: clientX, y: clientY };
      dragOffset.current = {
        x: svgPoint.x - (pos.x + pos.width / 2),
        y: svgPoint.y - (pos.y + pos.height / 2),
      };
      setDraggingNodeId(nodeId);
    }, [toLocalPoint, localToSvg]);

    const renderConnections = (node: MindMapNode): JSX.Element[] => {
      const lines: JSX.Element[] = [];
      const parentPos = findPosition(node.id);
      if (!parentPos) return lines;

      for (const child of node.children) {
        if (draggingNodeId === child.id && isDragActive.current) continue;
        const childPos = findPosition(child.id);
        if (!childPos) continue;

        const startX = isRTLLayout
          ? parentPos.x - PLUS_BUTTON_RADIUS * 4 - 12
          : parentPos.x + parentPos.width + PLUS_BUTTON_RADIUS * 4 + 12;
        const startY = parentPos.y + parentPos.height / 2;
        const endX = isRTLLayout ? childPos.x + childPos.width : childPos.x;
        const endY = childPos.y + childPos.height / 2;
        const midX = (startX + endX) / 2;

        const depth = getNodeDepth(root, child.id);
        const color = resolveNodeColor(child, depth);

        lines.push(
          <path
            key={`${node.id}-${child.id}`}
            d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeOpacity={0.4}
          />
        );

        lines.push(...renderConnections(child));
      }
      return lines;
    };

    const renderDragConnection = (): JSX.Element | null => {
      if (!draggingNodeId || !isDragActive.current || !nearestParentId) return null;
      const parentPos = findPosition(nearestParentId);
      if (!parentPos) return null;

      // Parent connection point: left edge in RTL, right edge in LTR
      const startX = isRTLLayout
        ? parentPos.x
        : parentPos.x + parentPos.width;
      const startY = parentPos.y + parentPos.height / 2;
      // Dragged node connection point: right edge in RTL, left edge in LTR
      const draggedWidth = positions.find((p) => p.id === draggingNodeId)?.width ?? NODE_MIN_WIDTH;
      const endX = isRTLLayout ? dragPos.x + draggedWidth / 2 : dragPos.x - draggedWidth / 2;
      const endY = dragPos.y;
      const midX = (startX + endX) / 2;

      return (
        <path
          d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="6 3"
          strokeOpacity={0.7}
        />
      );
    };

    const renderNodeIcons = (node: MindMapNode, pos: NodePosition, iconColor: string): JSX.Element | null => {
      if (!hasIcons(node)) return null;
      // Trailing side of the node, inset by a small padding.
      const iconX = isRTLLayout ? pos.x + ICON_PAD : pos.x + pos.width - ICON_PAD - ICON_SIZE;
      const topY = pos.y + ICON_PAD;
      const bottomY = pos.y + pos.height - ICON_PAD - ICON_SIZE;

      return (
        <g key={`icons-${node.id}`}>
          {node.comment && (
            <g transform={`translate(${iconX}, ${topY})`} opacity={0.9}>
              <title>{node.comment}</title>
              <path
                d="M0.8 1.2 h9.4 a0.8 0.8 0 0 1 0.8 0.8 v4.8 a0.8 0.8 0 0 1 -0.8 0.8 h-5.6 l-2.6 2.2 v-2.2 h-1.2 a0.8 0.8 0 0 1 -0.8 -0.8 v-4.8 a0.8 0.8 0 0 1 0.8 -0.8 z"
                fill="none"
                stroke={iconColor}
                strokeWidth={1.1}
                strokeLinejoin="round"
              />
            </g>
          )}
          {node.hyperlink && (
            <g
              transform={`translate(${iconX}, ${bottomY})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                const target = normalizeUrl(node.hyperlink || "");
                if (target) window.open(target, "_blank", "noopener,noreferrer");
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <title>{node.hyperlink}</title>
              <rect x={0} y={0} width={ICON_SIZE} height={ICON_SIZE} fill="transparent" />
              <g fill="none" stroke={iconColor} strokeWidth={1.2} strokeLinecap="round">
                <path d="M4.3 6.9 a2.1 2.1 0 0 1 0 -2.9 l1.4 -1.4 a2.1 2.1 0 0 1 2.9 2.9 l-0.6 0.6" />
                <path d="M6.7 4.1 a2.1 2.1 0 0 1 0 2.9 l-1.4 1.4 a2.1 2.1 0 0 1 -2.9 -2.9 l0.6 -0.6" />
              </g>
            </g>
          )}
        </g>
      );
    };

    /** Resolve the anchor/x pair for the node's alignment and reading direction. */
    const resolveTextAnchor = (pos: NodePosition) => {
      const contentLeft = pos.x + (isRTLLayout ? pos.iconReserve : 0) + NODE_PADDING_X;
      const contentRight = pos.x + pos.width - (isRTLLayout ? 0 : pos.iconReserve) - NODE_PADDING_X;
      const rtlText = pos.direction === "rtl";

      if (pos.align === "left") {
        return { anchor: rtlText ? "end" : "start", x: contentLeft } as const;
      }
      if (pos.align === "right") {
        return { anchor: rtlText ? "start" : "end", x: contentRight } as const;
      }
      return { anchor: "middle", x: (contentLeft + contentRight) / 2 } as const;
    };

    const renderNodes = (node: MindMapNode): JSX.Element[] => {
      const elements: JSX.Element[] = [];
      const pos = findPosition(node.id);
      if (!pos) return elements;

      const depth = getNodeDepth(root, node.id);
      const color = resolveNodeColor(node, depth);
      const isSelected = selectedNodeId === node.id;
      const isEditing = editingNodeId === node.id;
      const isRoot = depth === 0;
      const isBeingDragged = draggingNodeId === node.id && isDragActive.current;
      const isNearestTarget = nearestParentId === node.id && draggingNodeId !== null && isDragActive.current;
      const iconColor = isRoot ? "#FFFFFF" : color;

      const { anchor, x: textX } = resolveTextAnchor(pos);
      const firstLineY = pos.y + pos.height / 2 - (pos.lines.length * pos.lineHeight) / 2 + pos.lineHeight / 2;

      elements.push(
        <g
          key={node.id}
          className={readOnly ? "cursor-default" : "cursor-pointer"}
          opacity={isBeingDragged ? 0 : 1}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly && !isDragActive.current) onSelectNode(node.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!readOnly) onStartEdit(node.id);
            }}
            onMouseDown={(e) => {
              if (!readOnly && e.button === 0 && !isRoot && !isEditing) {
                e.stopPropagation();
                startNodeDrag(node.id, pos, e.clientX, e.clientY);
              }
            }}
            onTouchStart={(e) => {
              if (!readOnly && !isRoot && !isEditing && e.touches.length === 1) {
                // Long-press: start drag only after holding for 500ms
                longPressTriggered.current = false;
                const touch = e.touches[0];
                const startX = touch.clientX;
                const startY = touch.clientY;
                longPressStartPos.current = { x: startX, y: startY };
                if (longPressTimer.current) clearTimeout(longPressTimer.current);
                longPressTimer.current = setTimeout(() => {
                  longPressTriggered.current = true;
                  onSelectNode(node.id);
                  startNodeDrag(node.id, pos, startX, startY);
                }, 500);
              }
            }}
            onTouchMove={(e) => {
              // Cancel long-press only if finger moved more than 10px (avoid jitter)
              if (longPressTimer.current && !longPressTriggered.current && e.touches.length === 1) {
                const touch = e.touches[0];
                const sp = longPressStartPos.current;
                if (sp) {
                  const dist = Math.sqrt((touch.clientX - sp.x) ** 2 + (touch.clientY - sp.y) ** 2);
                  if (dist > 10) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                    longPressStartPos.current = null;
                  }
                }
              }
            }}
            onTouchEnd={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
              longPressStartPos.current = null;
            }}
          >
            <rect
              x={pos.x}
              y={pos.y}
              width={pos.width}
              height={pos.height}
              rx={isRoot ? 10 : 6}
              fill={isRoot ? color : "white"}
              stroke={isNearestTarget ? "#10b981" : color}
              strokeWidth={isSelected ? 3 : isNearestTarget ? 3 : 1.5}
              filter={isSelected ? "url(#selectedShadow)" : undefined}
            />
            {!isEditing && (
              <text
                textAnchor={anchor}
                dominantBaseline="central"
                fill={isRoot ? "white" : color}
                fontSize={pos.fontSize}
                fontWeight={pos.bold ? 700 : 500}
                style={{ pointerEvents: "none", userSelect: "none", direction: pos.direction }}
              >
                {pos.lines.map((line, index) => (
                  <tspan key={index} x={textX} y={firstLineY + index * pos.lineHeight}>
                    {line}
                  </tspan>
                ))}
              </text>
            )}
            {!isEditing && renderNodeIcons(node, pos, iconColor)}
          </g>
        );

        if (isEditing) {
          elements.push(
            <foreignObject
              key={`edit-${node.id}`}
              x={pos.x + 2}
              y={pos.y + 2}
              width={pos.width - 4}
              height={pos.height - 4}
            >
              <textarea
                ref={editInputRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.shiftKey) {
                    // Shift+Enter inserts a line break instead of committing.
                    e.stopPropagation();
                    return;
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onFinishEdit(node.id, editText.trim() || node.text);
                  } else if (e.key === "Escape") {
                    onFinishEdit(node.id, node.text);
                  }
                  e.stopPropagation();
                }}
                onBlur={() => onFinishEdit(node.id, editText.trim() || node.text)}
                onClick={(e) => e.stopPropagation()}
                dir={pos.direction}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  overflow: "hidden",
                  background: isRoot ? color : "white",
                  color: isRoot ? "white" : color,
                  fontSize: `${pos.fontSize}px`,
                  lineHeight: `${pos.lineHeight}px`,
                  fontWeight: pos.bold ? 700 : 500,
                  textAlign: pos.align,
                  direction: pos.direction,
                  borderRadius: isRoot ? "8px" : "4px",
                  padding: `${Math.max(1, NODE_PADDING_Y - 2)}px ${Math.max(1, NODE_PADDING_X - 3)}px`,
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </foreignObject>
          );
        }

      if (isBeingDragged) {
        const measured = measureNode(node, node.text, isRoot, isRTLLayout ? "rtl" : "ltr");
        elements.push(
          <g key={`drag-${node.id}`} opacity={0.7}>
            <rect
              x={dragPos.x - measured.width / 2}
              y={dragPos.y - measured.height / 2}
              width={measured.width}
              height={measured.height}
              rx={6}
              fill="white"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill={color}
              fontSize={measured.fontSize}
              fontWeight={measured.bold ? 700 : 500}
              style={{ pointerEvents: "none", userSelect: "none", direction: measured.direction }}
            >
              {measured.lines.map((line, index) => (
                <tspan
                  key={index}
                  x={dragPos.x}
                  y={dragPos.y - (measured.lines.length * measured.lineHeight) / 2 + measured.lineHeight / 2 + index * measured.lineHeight}
                >
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        );
      }

      if (!isBeingDragged && !readOnly) {
        const dir = isRTLLayout ? -1 : 1;
        const edgeX = isRTLLayout ? pos.x : pos.x + pos.width;
        const buttonY = pos.y + pos.height / 2;
        const plusX = edgeX + dir * (PLUS_BUTTON_RADIUS * 3 + 8);
        const chevronX = edgeX + dir * (PLUS_BUTTON_RADIUS + 4);

        const hasChildren = node.children.length > 0;
        const isCollapsed = hasChildren && node.collapsed;

        // "+" button: shown and active only while the subtree is expanded.
        if (!isCollapsed) {
          elements.push(
            <g
              key={`plus-${node.id}`}
              className="cursor-pointer"
              onTouchStart={(e) => {
                // Prevent focus loss (blur) on the editing textarea so text isn't lost
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                // If currently editing any node, commit the text first
                if (editingNodeId) {
                  const commitText = editText.trim();
                  // Use editText if non-empty; for same node use node.text as fallback
                  const fallback = editingNodeId === node.id ? node.text : commitText || node.text;
                  onFinishEdit(editingNodeId, commitText || fallback);
                }
                onAddChild(node.id);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Commit any ongoing edit before adding child
                if (editingNodeId) {
                  const commitText = editText.trim();
                  const fallback = editingNodeId === node.id ? node.text : commitText || node.text;
                  onFinishEdit(editingNodeId, commitText || fallback);
                }
                onAddChild(node.id);
              }}
            >
              <circle cx={plusX} cy={buttonY} r={PLUS_BUTTON_RADIUS} fill="white" stroke={color} strokeWidth={1.5} opacity={0.85} />
              <line x1={plusX - 2.5} y1={buttonY} x2={plusX + 2.5} y2={buttonY} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
              <line x1={plusX} y1={buttonY - 2.5} x2={plusX} y2={buttonY + 2.5} stroke={color} strokeWidth={1.6} strokeLinecap="round" />
            </g>
          );
        }

        // Chevron button: always visible, but inactive for leaf nodes.
        {
          const pointsRight = isCollapsed ? isRTLLayout : !isRTLLayout;
          const chevColor = isCollapsed ? "#FFFFFF" : color;
          const chevD = pointsRight
            ? `M ${chevronX - 2.5} ${buttonY - 3} L ${chevronX + 2.5} ${buttonY} L ${chevronX - 2.5} ${buttonY + 3}`
            : `M ${chevronX + 2.5} ${buttonY - 3} L ${chevronX - 2.5} ${buttonY} L ${chevronX + 2.5} ${buttonY + 3}`;

          elements.push(
            <g
              key={`collapse-${node.id}`}
              className={hasChildren ? "cursor-pointer" : "cursor-default"}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) onToggleCollapse(node.id);
              }}
            >
              <circle
                cx={chevronX}
                cy={buttonY}
                r={PLUS_BUTTON_RADIUS}
                fill={isCollapsed ? color : "white"}
                stroke={color}
                strokeWidth={1.5}
                opacity={0.9}
              />
              <path d={chevD} fill="none" stroke={chevColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        }
      }

      if (!node.collapsed) {
        for (const child of node.children) {
          elements.push(...renderNodes(child));
        }
      }
      return elements;
    };

    const handleDragMove = useCallback((clientX: number, clientY: number) => {
      if (!draggingNodeId || !dragStartPos.current) return;
      const dx = clientX - dragStartPos.current.x;
      const dy = clientY - dragStartPos.current.y;
      if (!isDragActive.current && Math.sqrt(dx * dx + dy * dy) > 8) {
        isDragActive.current = true;
      }
      if (!isDragActive.current) return;

      const local = toLocalPoint(clientX, clientY);
      const svgPoint = localToSvg(local.x, local.y);
      const nodeX = svgPoint.x - dragOffset.current.x;
      const nodeY = svgPoint.y - dragOffset.current.y;
      setDragPos({ x: nodeX, y: nodeY });

      const excludeIds = getDescendantIds(root, draggingNodeId);
      const draggedWidth = positions.find((p) => p.id === draggingNodeId)?.width ?? NODE_MIN_WIDTH;
      // In RTL: right edge of dragged node (nodeX + width/2) tries to connect to left edge of target
      // In LTR: left edge of dragged node (nodeX - width/2) tries to connect to right edge of target
      const probeX = isRTLLayout ? nodeX + draggedWidth / 2 : nodeX - draggedWidth / 2;
      setNearestParentId(findNearestNode(probeX, nodeY, excludeIds));
    }, [draggingNodeId, toLocalPoint, localToSvg, getDescendantIds, root, findNearestNode, isRTLLayout, positions]);

    const finishInteraction = useCallback(() => {
      if (draggingNodeId && isDragActive.current && nearestParentId) {
        onReparentNode(draggingNodeId, nearestParentId);
      }
      cancelDrag();
      setIsPanning(false);
    }, [draggingNodeId, nearestParentId, onReparentNode, cancelDrag]);

    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const local = toLocalPoint(e.clientX, e.clientY);
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      applyZoom(factor, local.x, local.y);
    };

    const isBackgroundTarget = (target: EventTarget | null) => {
      const el = target as SVGElement | null;
      if (!el) return false;
      return el.tagName === "svg" || (el.tagName === "rect" && el.getAttribute("data-bg") === "true");
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 0 && !draggingNodeId && isBackgroundTarget(e.target)) {
        const local = toLocalPoint(e.clientX, e.clientY);
        panStartRef.current = { x: local.x - panRef.current.x, y: local.y - panRef.current.y };
        setIsPanning(true);
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (draggingNodeId) {
        handleDragMove(e.clientX, e.clientY);
      } else if (isPanning) {
        const local = toLocalPoint(e.clientX, e.clientY);
        const next = { x: local.x - panStartRef.current.x, y: local.y - panStartRef.current.y };
        panRef.current = next;
        setPan(next);
      }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length >= 2) {
        // Two fingers means pinch: abandon any node drag or pan in progress.
        cancelDrag();
        setIsPanning(false);
        const [a, b] = [e.touches[0], e.touches[1]];
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        pinchDistance.current = distance > 1 ? distance : null;
        pinchCenter.current = toLocalPoint((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);
        return;
      }

      if (e.touches.length === 1 && !draggingNodeId && isBackgroundTarget(e.target)) {
        const local = toLocalPoint(e.touches[0].clientX, e.touches[0].clientY);
        panStartRef.current = { x: local.x - panRef.current.x, y: local.y - panRef.current.y };
        setIsPanning(true);
      }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
      if (e.cancelable) e.preventDefault();

      if (e.touches.length >= 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const center = toLocalPoint((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2);

        const previousDistance = pinchDistance.current;
        if (previousDistance && previousDistance > 1 && distance > 1) {
          applyZoom(distance / previousDistance, center.x, center.y);
        }
        if (pinchCenter.current) {
          movePan(center.x - pinchCenter.current.x, center.y - pinchCenter.current.y);
        }
        pinchDistance.current = distance > 1 ? distance : null;
        pinchCenter.current = center;
        return;
      }

      if (e.touches.length === 1) {
        if (draggingNodeId) {
          handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        } else if (isPanning) {
          const local = toLocalPoint(e.touches[0].clientX, e.touches[0].clientY);
          const next = { x: local.x - panStartRef.current.x, y: local.y - panStartRef.current.y };
          panRef.current = next;
          setPan(next);
        }
      }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        pinchDistance.current = null;
        pinchCenter.current = null;
      }
      if (e.touches.length === 0) {
        finishInteraction();
      }
    };

    useEffect(() => {
      const up = () => finishInteraction();
      window.addEventListener("mouseup", up);
      window.addEventListener("touchcancel", up);
      return () => {
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchcancel", up);
      };
    }, [finishInteraction]);

    const controlClass =
      "w-10 h-10 sm:w-8 sm:h-8 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors duration-150";

    return (
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-slate-50 h-full min-h-0 touch-none">
        {/* Zoom controls sit on the side opposite to the tree growth direction */}
        <div className={`absolute top-3 z-40 flex flex-col gap-2 ${isRTLLayout ? "left-3" : "right-3"}`}>
          <button onClick={() => zoomFromButton(1.2)} className={controlClass} title={labels.zoomIn} aria-label={labels.zoomIn}>
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => zoomFromButton(1 / 1.2)} className={controlClass} title={labels.zoomOut} aria-label={labels.zoomOut}>
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={resetView} className={controlClass} title={labels.resetView} aria-label={labels.resetView}>
            <Crosshair className="w-4 h-4" />
          </button>
          <button onClick={fitToScreen} className={controlClass} title={labels.fitToScreen} aria-label={labels.fitToScreen}>
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div className={`absolute bottom-3 z-40 text-xs text-slate-400 bg-white/80 px-2 py-1 rounded ${isRTLLayout ? "left-3" : "right-3"}`}>
          {Math.round(zoom * 100)}%
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ display: "block", minHeight: "100%", touchAction: "none" }}
          className={`${isPanning ? "cursor-grabbing" : draggingNodeId ? "cursor-move" : "cursor-grab"} h-full w-full`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={finishInteraction}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => {
            if (!isDragActive.current) onSelectNode("");
          }}
        >
          <defs>
            <filter id="selectedShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.2" />
            </filter>
          </defs>
          <rect data-bg="true" x="0" y="0" width="100%" height="100%" fill="transparent" />
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {renderConnections(root)}
            {renderDragConnection()}
            {renderNodes(root)}
          </g>
        </svg>
      </div>
    );
  }
);

MindMapCanvas.displayName = "MindMapCanvas";