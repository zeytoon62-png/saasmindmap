export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  color?: string;
  comment?: string;
  hyperlink?: string;
}

export interface MindMapData {
  root: MindMapNode;
  version: string;
}

export function createNode(text: string): MindMapNode {
  return {
    id: crypto.randomUUID(),
    text,
    children: [],
  };
}

export function createDefaultMindMap(mainIdea = "ایده اصلی", branch1 = "شاخه ۱", branch2 = "شاخه ۲", branch3 = "شاخه ۳"): MindMapData {
  const root = createNode(mainIdea);
  root.children = [
    createNode(branch1),
    createNode(branch2),
    createNode(branch3),
  ];
  return { root, version: "1.0" };
}