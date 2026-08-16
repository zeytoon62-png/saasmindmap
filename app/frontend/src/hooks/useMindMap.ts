import { useState, useCallback, useRef } from "react";
import {
  MindMapData,
  MindMapNode,
  NodeFormatPatch,
  createNode,
  createDefaultMindMap,
  getNodeDepth,
  resolveNodeColor,
} from "@/types/mindmap";

const MAX_HISTORY = 50;

export function useMindMap(newNodeText = "New Node", defaultMainIdea = "Main Idea", defaultBranch1 = "Branch 1", defaultBranch2 = "Branch 2", defaultBranch3 = "Branch 3") {
  const [data, setData] = useState<MindMapData>(() => createDefaultMindMap(defaultMainIdea, defaultBranch1, defaultBranch2, defaultBranch3));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [lastCreatedNodeId, setLastCreatedNodeId] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);

  // Undo/Redo history
  const historyRef = useRef<MindMapData[]>([createDefaultMindMap(defaultMainIdea, defaultBranch1, defaultBranch2, defaultBranch3)]);
  const historyIndexRef = useRef<number>(0);

  const pushHistory = useCallback((newData: MindMapData) => {
    const history = historyRef.current;
    const index = historyIndexRef.current;

    const newHistory = history.slice(0, index + 1);
    newHistory.push(newData);

    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      historyIndexRef.current = newHistory.length - 1;
    }

    historyRef.current = newHistory;
    setIsModified(true);
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevData = historyRef.current[historyIndexRef.current];
      setData(prevData);
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextData = historyRef.current[historyIndexRef.current];
      setData(nextData);
    }
  }, []);

  const findNode = useCallback((node: MindMapNode, id: string): MindMapNode | null => {
    if (node.id === id) return node;
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  const findParent = useCallback((node: MindMapNode, id: string): MindMapNode | null => {
    for (const child of node.children) {
      if (child.id === id) return node;
      const found = findParent(child, id);
      if (found) return found;
    }
    return null;
  }, []);

  const deepClone = useCallback((node: MindMapNode): MindMapNode => {
    return JSON.parse(JSON.stringify(node));
  }, []);

  const updateTreeWithHistory = useCallback((updater: (root: MindMapNode) => MindMapNode) => {
    setData((prev) => {
      const newData = { ...prev, root: updater(prev.root) };
      pushHistory(newData);
      return newData;
    });
  }, [pushHistory]);

  /** New nodes inherit the effective color of the parent they are attached to. */
  const addChild = useCallback((parentId: string) => {
    const newNodeId = crypto.randomUUID();
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const parent = findNode(newRoot, parentId);
      if (parent) {
        const inherited = resolveNodeColor(parent, getNodeDepth(newRoot, parentId));
        const child = createNode(newNodeText, inherited);
        child.id = newNodeId;
        parent.children.push(child);
      }
      return newRoot;
    });
    setSelectedNodeId(newNodeId);
    setLastCreatedNodeId(newNodeId);
  }, [updateTreeWithHistory, deepClone, findNode, newNodeText]);

  /** Insert a new node right before the given node, as a previous sibling. */
  const addSiblingBefore = useCallback((nodeId: string) => {
    if (data.root.id === nodeId) return;
    const newNodeId = crypto.randomUUID();
    let inserted = false;
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const parent = findParent(newRoot, nodeId);
      if (!parent) return newRoot;
      const index = parent.children.findIndex((c) => c.id === nodeId);
      if (index === -1) return newRoot;

      const inherited = resolveNodeColor(parent, getNodeDepth(newRoot, parent.id));
      const sibling = createNode(newNodeText, inherited);
      sibling.id = newNodeId;
      parent.children.splice(index, 0, sibling);
      inserted = true;
      return newRoot;
    });
    if (inserted) {
      setSelectedNodeId(newNodeId);
      setLastCreatedNodeId(newNodeId);
    }
  }, [data.root.id, updateTreeWithHistory, deepClone, findParent, newNodeText]);

  const addSiblingAfter = useCallback((nodeId: string) => {
    if (data.root.id === nodeId) return;
    const newNodeId = crypto.randomUUID();
    let inserted = false;
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const parent = findParent(newRoot, nodeId);
      if (!parent) return newRoot;
      const index = parent.children.findIndex((c) => c.id === nodeId);
      if (index === -1) return newRoot;

      const inherited = resolveNodeColor(parent, getNodeDepth(newRoot, parent.id));
      const sibling = createNode(newNodeText, inherited);
      sibling.id = newNodeId;
      parent.children.splice(index + 1, 0, sibling);
      inserted = true;
      return newRoot;
    });
    if (inserted) {
      setSelectedNodeId(newNodeId);
      setLastCreatedNodeId(newNodeId);
    }
  }, [data.root.id, updateTreeWithHistory, deepClone, findParent, newNodeText]);

  const deleteNode = useCallback((nodeId: string) => {
    if (data.root.id === nodeId) return;
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const parent = findParent(newRoot, nodeId);
      if (parent) {
        parent.children = parent.children.filter((c) => c.id !== nodeId);
      }
      return newRoot;
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [data.root.id, updateTreeWithHistory, deepClone, findParent, selectedNodeId]);

  const updateNodeText = useCallback((nodeId: string, text: string) => {
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const node = findNode(newRoot, nodeId);
      if (node) {
        node.text = text;
      }
      return newRoot;
    });
  }, [updateTreeWithHistory, deepClone, findNode]);

  const updateNodeColor = useCallback((nodeId: string, color: string) => {
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const node = findNode(newRoot, nodeId);
      if (node) {
        node.color = color;
      }
      return newRoot;
    });
  }, [updateTreeWithHistory, deepClone, findNode]);

  /** Apply text formatting (align, direction, list, bold, font size) to a node. */
  const updateNodeFormat = useCallback((nodeId: string, patch: NodeFormatPatch) => {
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const node = findNode(newRoot, nodeId);
      if (node) {
        if (patch.align !== undefined) node.align = patch.align;
        if (patch.direction !== undefined) node.direction = patch.direction;
        if (patch.listStyle !== undefined) node.listStyle = patch.listStyle;
        if (patch.bold !== undefined) node.bold = patch.bold;
        if (patch.fontSize !== undefined) node.fontSize = patch.fontSize;
      }
      return newRoot;
    });
  }, [updateTreeWithHistory, deepClone, findNode]);

  const updateNodeComment = useCallback((nodeId: string, comment: string) => {
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const node = findNode(newRoot, nodeId);
      if (node) {
        node.comment = comment || undefined;
      }
      return newRoot;
    });
  }, [updateTreeWithHistory, deepClone, findNode]);

  const updateNodeHyperlink = useCallback((nodeId: string, hyperlink: string) => {
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const node = findNode(newRoot, nodeId);
      if (node) {
        node.hyperlink = hyperlink || undefined;
      }
      return newRoot;
    });
  }, [updateTreeWithHistory, deepClone, findNode]);

  const reparentNode = useCallback((nodeId: string, newParentId: string) => {
    if (nodeId === data.root.id) return;
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const oldParent = findParent(newRoot, nodeId);
      if (!oldParent) return newRoot;

      const nodeIndex = oldParent.children.findIndex((c) => c.id === nodeId);
      if (nodeIndex === -1) return newRoot;

      const [movedNode] = oldParent.children.splice(nodeIndex, 1);

      const newParent = findNode(newRoot, newParentId);
      if (!newParent) return newRoot;

      const isDescendant = (parent: MindMapNode, targetId: string): boolean => {
        if (parent.id === targetId) return true;
        return parent.children.some((c) => isDescendant(c, targetId));
      };
      if (isDescendant(movedNode, newParentId)) return newRoot;

      newParent.children.push(movedNode);
      return newRoot;
    });
  }, [data.root.id, updateTreeWithHistory, deepClone, findParent, findNode]);

  const loadFromJSON = useCallback((jsonData: MindMapData) => {
    setData(jsonData);
    setSelectedNodeId(null);
    historyRef.current = [jsonData];
    historyIndexRef.current = 0;
    setIsModified(false);
  }, []);

  const resetMap = useCallback((mainIdea?: string, branch1?: string, branch2?: string, branch3?: string) => {
    const newData = createDefaultMindMap(
      mainIdea || defaultMainIdea,
      branch1 || defaultBranch1,
      branch2 || defaultBranch2,
      branch3 || defaultBranch3
    );
    setData(newData);
    setSelectedNodeId(null);
    historyRef.current = [newData];
    historyIndexRef.current = 0;
    setIsModified(false);
  }, [defaultMainIdea, defaultBranch1, defaultBranch2, defaultBranch3]);

  const markSaved = useCallback(() => {
    setIsModified(false);
  }, []);

  /** Move a node one position up among its siblings (closer to index 0). */
  const moveNodeUp = useCallback((nodeId: string) => {
    if (data.root.id === nodeId) return;
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const parent = findParent(newRoot, nodeId);
      if (!parent) return newRoot;
      const idx = parent.children.findIndex((c) => c.id === nodeId);
      if (idx <= 0) return newRoot;
      [parent.children[idx - 1], parent.children[idx]] = [parent.children[idx], parent.children[idx - 1]];
      return newRoot;
    });
  }, [data.root.id, updateTreeWithHistory, deepClone, findParent]);

  /** Move a node one position down among its siblings (closer to last index). */
  const moveNodeDown = useCallback((nodeId: string) => {
    if (data.root.id === nodeId) return;
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const parent = findParent(newRoot, nodeId);
      if (!parent) return newRoot;
      const idx = parent.children.findIndex((c) => c.id === nodeId);
      if (idx === -1 || idx >= parent.children.length - 1) return newRoot;
      [parent.children[idx], parent.children[idx + 1]] = [parent.children[idx + 1], parent.children[idx]];
      return newRoot;
    });
  }, [data.root.id, updateTreeWithHistory, deepClone, findParent]);

  return {
    data,
    selectedNodeId,
    setSelectedNodeId,
    lastCreatedNodeId,
    setLastCreatedNodeId,
    isModified,
    addChild,
    addSiblingBefore,
    addSiblingAfter,
    deleteNode,
    updateNodeText,
    updateNodeColor,
    updateNodeFormat,
    updateNodeComment,
    updateNodeHyperlink,
    reparentNode,
    moveNodeUp,
    moveNodeDown,
    loadFromJSON,
    resetMap,
    findNode,
    undo,
    redo,
    canUndo,
    canRedo,
    markSaved,
  };
}