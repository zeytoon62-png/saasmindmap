import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
import { MindMapNode } from "@/types/mindmap";

interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MindMapCanvasProps {
  root: MindMapNode;
  selectedNodeId: string | null;
  editingNodeId: string | null;
  isRTL: boolean;
  onSelectNode: (id: string) => void;
  onStartEdit: (id: string) => void;
  onFinishEdit: (id: string, text: string) => void;
  onAddChild: (parentId: string) => void;
  onReparentNode: (nodeId: string, newParentId: string) => void;
}

export interface MindMapCanvasHandle {
  exportToImage: () => Promise<string | null>;
}

const NODE_HEIGHT = 34;
const NODE_PADDING_X = 8;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 14;
const PLUS_BUTTON_RADIUS = 11;

function measureTextWidth(text: string): number {
  return Math.max(60, text.length * 11 + NODE_PADDING_X * 2);
}

function calculateLayout(
  node: MindMapNode,
  x: number,
  y: number,
  positions: NodePosition[],
  isRTL: boolean
): { totalHeight: number } {
  const width = measureTextWidth(node.text);

  if (node.children.length === 0) {
    positions.push({ id: node.id, x, y, width, height: NODE_HEIGHT });
    return { totalHeight: NODE_HEIGHT };
  }

  let childY = y;
  let totalChildHeight = 0;

  for (const child of node.children) {
    const actualChildX = isRTL ? x - HORIZONTAL_GAP - measureTextWidth(child.text) : x + width + HORIZONTAL_GAP;
    const { totalHeight } = calculateLayout(child, actualChildX, childY, positions, isRTL);
    totalChildHeight += totalHeight;
    childY += totalHeight + VERTICAL_GAP;
  }

  totalChildHeight += (node.children.length - 1) * VERTICAL_GAP;

  const nodeY = y + totalChildHeight / 2 - NODE_HEIGHT / 2;
  positions.push({ id: node.id, x, y: nodeY, width, height: NODE_HEIGHT });

  return { totalHeight: Math.max(totalChildHeight, NODE_HEIGHT) };
}

function getNodeColor(node: MindMapNode, depth: number): string {
  if (node.color) return node.color;
  const colors = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DB2777", "#0891B2"];
  return colors[depth % colors.length];
}

function getNodeDepth(root: MindMapNode, targetId: string, depth = 0): number {
  if (root.id === targetId) return depth;
  for (const child of root.children) {
    const d = getNodeDepth(child, targetId, depth + 1);
    if (d >= 0) return d;
  }
  return -1;
}

export const MindMapCanvas = forwardRef<MindMapCanvasHandle, MindMapCanvasProps>(
  ({ root, selectedNodeId, editingNodeId, isRTL: isRTLLayout, onSelectNode, onStartEdit, onFinishEdit, onAddChild, onReparentNode }, ref) => {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 40, y: 40 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastTouchDistance = useRef<number | null>(null);
    const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);
    const [editText, setEditText] = useState("");
    const foreignObjectInputRef = useRef<HTMLInputElement>(null);
    const initialPanSet = useRef(false);

    // Drag state
    const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
    const [nearestParentId, setNearestParentId] = useState<string | null>(null);
    const dragStartPos = useRef<{ x: number; y: number } | null>(null);
    const isDragActive = useRef(false);

    const positions: NodePosition[] = [];
    const startX = isRTLLayout ? 800 : 0;
    calculateLayout(root, startX, 0, positions, isRTLLayout);

    const minX = Math.min(...positions.map((p) => p.x));
    const maxX = Math.max(...positions.map((p) => p.x + p.width)) + 150;
    const maxY = Math.max(...positions.map((p) => p.y + p.height)) + 100;

    // Set initial pan: RTL -> tree at right side of canvas
    useEffect(() => {
      if (!initialPanSet.current && containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        if (isRTLLayout) {
          // Position tree at the right side of the canvas
          const treeWidth = maxX - minX;
          const offsetX = containerWidth - treeWidth - 60;
          setPan({ x: offsetX - minX, y: 40 });
        } else {
          setPan({ x: 40, y: 40 });
        }
        initialPanSet.current = true;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset pan when RTL changes
    useEffect(() => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        if (isRTLLayout) {
          const treeWidth = maxX - minX;
          const offsetX = containerWidth - treeWidth - 60;
          setPan({ x: offsetX - minX, y: 40 });
        } else {
          setPan({ x: 40, y: 40 });
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRTLLayout]);

    // When editing starts, set the text
    useEffect(() => {
      if (editingNodeId) {
        const findNodeText = (node: MindMapNode): string | null => {
          if (node.id === editingNodeId) return node.text;
          for (const child of node.children) {
            const t = findNodeText(child);
            if (t !== null) return t;
          }
          return null;
        };
        const text = findNodeText(root);
        if (text !== null) setEditText(text);
        setTimeout(() => {
          if (foreignObjectInputRef.current) {
            foreignObjectInputRef.current.focus();
            foreignObjectInputRef.current.select();
          }
        }, 50);
      }
    }, [editingNodeId, root]);

    useImperativeHandle(ref, () => ({
      exportToImage: async () => {
        if (!svgRef.current) return null;

        const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
        const totalWidth = maxX - minX + 120;
        const totalHeight = maxY + 120;
        svgClone.setAttribute("width", String(totalWidth));
        svgClone.setAttribute("height", String(totalHeight));

        const gElement = svgClone.querySelector("g");
        if (gElement) {
          gElement.setAttribute("transform", `translate(${-minX + 60}, 60)`);
        }

        const foreignObjects = svgClone.querySelectorAll("foreignObject");
        foreignObjects.forEach((fo) => fo.remove());

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgClone);
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        return new Promise<string | null>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = totalWidth * 2;
            canvas.height = totalHeight * 2;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.scale(2, 2);
              ctx.fillStyle = "#F8FAFC";
              ctx.fillRect(0, 0, totalWidth, totalHeight);
              ctx.drawImage(img, 0, 0, totalWidth, totalHeight);
              resolve(canvas.toDataURL("image/png"));
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

    const getDescendantIds = useCallback((node: MindMapNode, targetId: string): string[] => {
      if (node.id === targetId) {
        const collect = (n: MindMapNode): string[] => {
          let ids = [n.id];
          for (const c of n.children) ids = ids.concat(collect(c));
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

    // RTL/LTR-aware proximity: 
    // RTL: distance from left edge of moving node to left edge of fixed node (where children connect from left)
    // LTR: distance from right edge of moving node to right edge of fixed node (where children connect from right)
    const findNearestNode = useCallback((x: number, y: number, excludeIds: string[]): string | null => {
      let nearest: string | null = null;
      let minDist = Infinity;
      for (const pos of positions) {
        if (excludeIds.includes(pos.id)) continue;
        let edgeX: number;
        if (isRTLLayout) {
          // In RTL, children connect to the left side of parent
          edgeX = pos.x;
        } else {
          // In LTR, children connect to the right side of parent
          edgeX = pos.x + pos.width;
        }
        const edgeY = pos.y + pos.height / 2;
        const dist = Math.sqrt((edgeX - x) ** 2 + (edgeY - y) ** 2);
        if (dist < minDist) {
          minDist = dist;
          nearest = pos.id;
        }
      }
      return nearest;
    }, [positions, isRTLLayout]);

    const screenToSvg = useCallback((clientX: number, clientY: number) => {
      return {
        x: (clientX - pan.x) / zoom,
        y: (clientY - pan.y) / zoom,
      };
    }, [pan.x, pan.y, zoom]);

    const renderConnections = (node: MindMapNode): JSX.Element[] => {
      const lines: JSX.Element[] = [];
      const parentPos = findPosition(node.id);
      if (!parentPos) return lines;

      for (const child of node.children) {
        if (draggingNodeId === child.id && isDragActive.current) continue;
        const childPos = findPosition(child.id);
        if (!childPos) continue;

        let startX: number, startY: number, endX: number, endY: number;

        if (isRTLLayout) {
          startX = parentPos.x - PLUS_BUTTON_RADIUS * 2 - 4;
          startY = parentPos.y + parentPos.height / 2;
          endX = childPos.x + childPos.width;
          endY = childPos.y + childPos.height / 2;
        } else {
          startX = parentPos.x + parentPos.width + PLUS_BUTTON_RADIUS * 2 + 4;
          startY = parentPos.y + parentPos.height / 2;
          endX = childPos.x;
          endY = childPos.y + childPos.height / 2;
        }

        const midX = (startX + endX) / 2;
        const depth = getNodeDepth(root, child.id);
        const color = getNodeColor(child, depth);

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

      let connStartX: number, connStartY: number;
      if (isRTLLayout) {
        connStartX = parentPos.x - PLUS_BUTTON_RADIUS * 2 - 4;
        connStartY = parentPos.y + parentPos.height / 2;
      } else {
        connStartX = parentPos.x + parentPos.width + PLUS_BUTTON_RADIUS * 2 + 4;
        connStartY = parentPos.y + parentPos.height / 2;
      }
      const endX = dragPos.x;
      const endY = dragPos.y;
      const midX = (connStartX + endX) / 2;

      return (
        <path
          d={`M ${connStartX} ${connStartY} C ${midX} ${connStartY}, ${midX} ${endY}, ${endX} ${endY}`}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="6 3"
          strokeOpacity={0.7}
        />
      );
    };

    const renderNodes = (node: MindMapNode): JSX.Element[] => {
      const elements: JSX.Element[] = [];
      const pos = findPosition(node.id);
      if (!pos) return elements;

      const depth = getNodeDepth(root, node.id);
      const color = getNodeColor(node, depth);
      const isSelected = selectedNodeId === node.id;
      const isEditing = editingNodeId === node.id;
      const isRoot = depth === 0;
      const isBeingDragged = draggingNodeId === node.id && isDragActive.current;
      const isNearestTarget = nearestParentId === node.id && draggingNodeId !== null && isDragActive.current;
      const hasComment = !!node.comment;
      const hasHyperlink = !!node.hyperlink;

      if (isBeingDragged) {
        const w = measureTextWidth(node.text);
        elements.push(
          <g key={`drag-${node.id}`} opacity={0.7}>
            <rect
              x={dragPos.x - w / 2}
              y={dragPos.y - NODE_HEIGHT / 2}
              width={w}
              height={NODE_HEIGHT}
              rx={6}
              fill="white"
              stroke={color}
              strokeWidth={2}
              strokeDasharray="4 2"
            />
            <text
              x={dragPos.x}
              y={dragPos.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={color}
              fontSize={12}
              fontWeight={500}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {node.text}
            </text>
          </g>
        );
      } else {
        elements.push(
          <g
            key={node.id}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (!isDragActive.current) {
                onSelectNode(node.id);
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartEdit(node.id);
            }}
            onMouseDown={(e) => {
              if (e.button === 0 && !isRoot && !isEditing) {
                e.stopPropagation();
                dragStartPos.current = { x: e.clientX, y: e.clientY };
                setDraggingNodeId(node.id);
                const svgPt = screenToSvg(e.clientX, e.clientY);
                setDragOffset({ x: svgPt.x - (pos.x + pos.width / 2), y: svgPt.y - (pos.y + NODE_HEIGHT / 2) });
              }
            }}
            onTouchStart={(e) => {
              if (!isRoot && !isEditing && e.touches.length === 1) {
                dragStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                setDraggingNodeId(node.id);
                const svgPt = screenToSvg(e.touches[0].clientX, e.touches[0].clientY);
                setDragOffset({ x: svgPt.x - (pos.x + pos.width / 2), y: svgPt.y - (pos.y + NODE_HEIGHT / 2) });
              }
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
                x={pos.x + pos.width / 2}
                y={pos.y + pos.height / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={isRoot ? "white" : color}
                fontSize={isRoot ? 13 : 12}
                fontWeight={isRoot ? 700 : 500}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {node.text}
              </text>
            )}
            {/* Comment & Hyperlink icons inside node at trailing corner */}
            {(hasComment || hasHyperlink) && !isEditing && (
              <g>
                {hasComment && (
                  <g>
                    <title>{node.comment}</title>
                    <text
                      x={isRTLLayout ? pos.x + 5 : pos.x + pos.width - (hasHyperlink ? 18 : 10)}
                      y={pos.y + 9}
                      fontSize={8}
                      fill={isRoot ? "rgba(255,255,255,0.8)" : "#d97706"}
                      style={{ pointerEvents: "none" }}
                    >💬</text>
                  </g>
                )}
                {hasHyperlink && (
                  <g
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (node.hyperlink) {
                        window.open(node.hyperlink, "_blank", "noopener,noreferrer");
                      }
                    }}
                  >
                    <title>{node.hyperlink}</title>
                    <text
                      x={isRTLLayout ? pos.x + 5 + (hasComment ? 10 : 0) : pos.x + pos.width - 10}
                      y={pos.y + 9}
                      fontSize={8}
                      fill={isRoot ? "rgba(255,255,255,0.8)" : "#3b82f6"}
                      style={{ pointerEvents: "auto" }}
                    >🔗</text>
                  </g>
                )}
              </g>
            )}
          </g>
        );

        // Inline editing
        if (isEditing) {
          elements.push(
            <foreignObject
              key={`edit-${node.id}`}
              x={pos.x + 2}
              y={pos.y + 2}
              width={pos.width - 4}
              height={pos.height - 4}
            >
              <input
                ref={foreignObjectInputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onFinishEdit(node.id, editText.trim() || node.text);
                  } else if (e.key === "Escape") {
                    onFinishEdit(node.id, node.text);
                  }
                  e.stopPropagation();
                }}
                onBlur={() => {
                  onFinishEdit(node.id, editText.trim() || node.text);
                }}
                onClick={(e) => e.stopPropagation()}
                dir="auto"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  outline: "none",
                  background: isRoot ? color : "white",
                  color: isRoot ? "white" : color,
                  fontSize: isRoot ? "13px" : "12px",
                  fontWeight: isRoot ? 700 : 500,
                  textAlign: "center",
                  borderRadius: isRoot ? "8px" : "4px",
                  padding: "0 4px",
                }}
              />
            </foreignObject>
          );
        }
      }

      // Plus button
      if (!isBeingDragged) {
        let plusX: number;
        const plusY = pos.y + pos.height / 2;

        if (isRTLLayout) {
          plusX = pos.x - PLUS_BUTTON_RADIUS - 4;
        } else {
          plusX = pos.x + pos.width + PLUS_BUTTON_RADIUS + 4;
        }

        elements.push(
          <g
            key={`plus-${node.id}`}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onAddChild(node.id);
            }}
          >
            <circle
              cx={plusX}
              cy={plusY}
              r={PLUS_BUTTON_RADIUS}
              fill="white"
              stroke={color}
              strokeWidth={1.5}
              opacity={0.8}
            />
            <line
              x1={plusX - 5}
              y1={plusY}
              x2={plusX + 5}
              y2={plusY}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1={plusX}
              y1={plusY - 5}
              x2={plusX}
              y2={plusY + 5}
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        );
      }

      for (const child of node.children) {
        elements.push(...renderNodes(child));
      }
      return elements;
    };

    const handleGlobalMove = useCallback((clientX: number, clientY: number) => {
      if (draggingNodeId && dragStartPos.current) {
        const dx = clientX - dragStartPos.current.x;
        const dy = clientY - dragStartPos.current.y;
        if (!isDragActive.current && Math.sqrt(dx * dx + dy * dy) > 8) {
          isDragActive.current = true;
        }
        if (isDragActive.current) {
          const svgPt = screenToSvg(clientX, clientY);
          const nodeX = svgPt.x - dragOffset.x;
          const nodeY = svgPt.y - dragOffset.y;
          setDragPos({ x: nodeX, y: nodeY });

          const excludeIds = getDescendantIds(root, draggingNodeId);
          // For proximity: use the connecting edge of the dragged node
          let proximityX: number;
          if (isRTLLayout) {
            // RTL: left edge of moving node seeks right edge of target (which is pos.x for target's child-connect side)
            proximityX = nodeX - 30;
          } else {
            // LTR: right edge of moving node seeks left edge of target
            proximityX = nodeX + 30;
          }
          const nearest = findNearestNode(proximityX, nodeY, excludeIds);
          setNearestParentId(nearest);
        }
      }
    }, [draggingNodeId, dragOffset, screenToSvg, getDescendantIds, root, findNearestNode, isRTLLayout]);

    const handleGlobalUp = useCallback(() => {
      if (draggingNodeId && isDragActive.current && nearestParentId) {
        onReparentNode(draggingNodeId, nearestParentId);
      }
      setDraggingNodeId(null);
      setNearestParentId(null);
      isDragActive.current = false;
      dragStartPos.current = null;
      setIsPanning(false);
    }, [draggingNodeId, nearestParentId, onReparentNode]);

    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.max(0.3, Math.min(3, prev + delta)));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 0 && !draggingNodeId) {
        const target = e.target as SVGElement;
        if (target.tagName === "svg" || (target.tagName === "rect" && target.getAttribute("data-bg") === "true")) {
          setIsPanning(true);
          setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      if (draggingNodeId) {
        handleGlobalMove(e.clientX, e.clientY);
      } else if (isPanning) {
        setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      }
    };

    const handleMouseUp = () => {
      handleGlobalUp();
    };

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (e.touches.length === 1 && !draggingNodeId) {
        const target = e.target as SVGElement;
        if (target.tagName === "svg" || (target.tagName === "rect" && target.getAttribute("data-bg") === "true")) {
          setIsPanning(true);
          setPanStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
        }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
        lastTouchCenter.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
      }
    }, [pan.x, pan.y, draggingNodeId]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      if (draggingNodeId && e.touches.length === 1) {
        handleGlobalMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 1 && isPanning) {
        setPan({
          x: e.touches[0].clientX - panStart.x,
          y: e.touches[0].clientY - panStart.y,
        });
      } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scale = distance / lastTouchDistance.current;
        setZoom((prev) => Math.max(0.3, Math.min(3, prev * scale)));
        lastTouchDistance.current = distance;

        const center = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        if (lastTouchCenter.current) {
          setPan((prev) => ({
            x: prev.x + (center.x - lastTouchCenter.current!.x),
            y: prev.y + (center.y - lastTouchCenter.current!.y),
          }));
        }
        lastTouchCenter.current = center;
      }
    }, [draggingNodeId, isPanning, panStart.x, panStart.y, handleGlobalMove]);

    const handleTouchEnd = useCallback(() => {
      handleGlobalUp();
      lastTouchDistance.current = null;
      lastTouchCenter.current = null;
    }, [handleGlobalUp]);

    useEffect(() => {
      const up = () => handleGlobalUp();
      window.addEventListener("mouseup", up);
      window.addEventListener("touchend", up);
      return () => {
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchend", up);
      };
    }, [handleGlobalUp]);

    const handleCenter = () => {
      setZoom(1);
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        if (isRTLLayout) {
          const treeWidth = maxX - minX;
          const offsetX = containerWidth - treeWidth - 60;
          setPan({ x: offsetX - minX, y: 40 });
        } else {
          setPan({ x: 40, y: 40 });
        }
      }
    };

    return (
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-slate-50 h-full min-h-0 touch-none">
        {/* Zoom controls - left side for RTL, right side for LTR */}
        <div className={`absolute top-3 z-40 flex flex-col gap-2 ${isRTLLayout ? "left-3" : "right-3"}`}>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="w-10 h-10 sm:w-8 sm:h-8 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors duration-150 text-xl sm:text-lg font-medium"
          >
            +
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="w-10 h-10 sm:w-8 sm:h-8 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors duration-150 text-xl sm:text-lg font-medium"
          >
            −
          </button>
          <button
            onClick={handleCenter}
            className="w-10 h-10 sm:w-8 sm:h-8 bg-white rounded-lg shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors duration-150 text-sm"
            title="Center"
          >
            ⊙
          </button>
        </div>

        {/* Zoom indicator */}
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
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => { if (!isDragActive.current) onSelectNode(""); }}
        >
          <defs>
            <filter id="selectedShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.2" />
            </filter>
          </defs>
          <rect
            data-bg="true"
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="transparent"
          />
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