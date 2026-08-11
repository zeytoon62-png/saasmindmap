export type NodeAlign = "left" | "center" | "right";
export type NodeDirection = "ltr" | "rtl";
export type NodeListStyle = "none" | "numbered" | "bulleted";

export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  color?: string;
  comment?: string;
  hyperlink?: string;
  /** Text formatting applied to the node label. */
  align?: NodeAlign;
  direction?: NodeDirection;
  listStyle?: NodeListStyle;
  bold?: boolean;
  fontSize?: number;
}

/** Partial formatting update applied to a single node. */
export interface NodeFormatPatch {
  align?: NodeAlign;
  direction?: NodeDirection;
  listStyle?: NodeListStyle;
  bold?: boolean;
  fontSize?: number;
}

export interface MindMapData {
  root: MindMapNode;
  version: string;
}

export const DEFAULT_NODE_COLORS = ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DB2777", "#0891B2"];

export const ROOT_FONT_SIZE = 13;
export const NODE_FONT_SIZE = 12;
export const MIN_FONT_SIZE = 9;
export const MAX_FONT_SIZE = 28;

export function createNode(text: string, color?: string): MindMapNode {
  const node: MindMapNode = {
    id: crypto.randomUUID(),
    text,
    children: [],
  };
  if (color) node.color = color;
  return node;
}

/** Depth of a node in the tree, or -1 when it is not part of the tree. */
export function getNodeDepth(root: MindMapNode, targetId: string, depth = 0): number {
  if (root.id === targetId) return depth;
  for (const child of root.children) {
    const found = getNodeDepth(child, targetId, depth + 1);
    if (found >= 0) return found;
  }
  return -1;
}

/** Explicit node color, falling back to the depth-based default palette. */
export function resolveNodeColor(node: MindMapNode, depth: number): string {
  if (node.color) return node.color;
  const safeDepth = depth < 0 ? 0 : depth;
  return DEFAULT_NODE_COLORS[safeDepth % DEFAULT_NODE_COLORS.length];
}

export function resolveFontSize(node: MindMapNode, isRoot: boolean): number {
  const size = node.fontSize ?? (isRoot ? ROOT_FONT_SIZE : NODE_FONT_SIZE);
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size));
}

export function createDefaultMindMap(mainIdea = "Main Idea", branch1 = "Branch 1", branch2 = "Branch 2", branch3 = "Branch 3"): MindMapData {
  const root = createNode(mainIdea);
  const rootColor = DEFAULT_NODE_COLORS[0];
  root.color = rootColor;
  root.children = [
    createNode(branch1, rootColor),
    createNode(branch2, rootColor),
    createNode(branch3, rootColor),
  ];
  return { root, version: "1.0" };
}