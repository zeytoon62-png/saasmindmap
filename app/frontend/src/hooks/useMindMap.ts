import { useState, useCallback, useRef } from "react";
import { MindMapData, MindMapNode, createNode, createDefaultMindMap } from "@/types/mindmap";

const MAX_HISTORY = 50;

export function useMindMap(newNodeText = "نود جدید", defaultMainIdea = "ایده اصلی", defaultBranch1 = "شاخه ۱", defaultBranch2 = "شاخه ۲", defaultBranch3 = "شاخه ۳") {
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

  const addChild = useCallback((parentId: string) => {
    const newNode = createNode(newNodeText);
    updateTreeWithHistory((root) => {
      const newRoot = deepClone(root);
      const parent = findNode(newRoot, parentId);
      if (parent) {
        parent.children.push(newNode);
      }
      return newRoot;
    });
    setSelectedNodeId(newNode.id);
    setLastCreatedNodeId(newNode.id);
  }, [updateTreeWithHistory, deepClone, findNode, newNodeText]);

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

  return {
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
  };
}