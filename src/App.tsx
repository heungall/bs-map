import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  BackgroundVariant,
  MarkerType,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import FloatingNode from './components/FloatingNode';
import Toolbar from './components/Toolbar';
import { exportSessionToPDF } from './utils/exportPDF';
import { copyMarkdownToClipboard } from './utils/exportMarkdown';
import type { BrainstormNode, BrainstormEdge, RelationType } from './types';
import './App.css';

const nodeTypes = { floating: FloatingNode };

// Pastel colors for node list dots (matching FloatingNode palette)
const PASTEL_DOT_COLORS = [
  '#f0b464', '#82bed2', '#b48cd2', '#82be82',
  '#d28ca0', '#d2be64', '#78beb4', '#aa82c8',
];

function getNodeColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return PASTEL_DOT_COLORS[Math.abs(hash) % PASTEL_DOT_COLORS.length];
}

// Soft edge colors — not harsh, semi-transparent
function getEdgeColor(type: RelationType): string {
  switch (type) {
    case 'related':
      return 'rgba(160, 150, 180, 0.5)';
    case 'cause-effect':
      return 'rgba(210, 140, 140, 0.5)';
    case 'expansion':
      return 'rgba(180, 160, 120, 0.5)';
    case 'opposite':
      return 'rgba(160, 140, 200, 0.5)';
    default:
      return 'rgba(160, 150, 180, 0.5)';
  }
}

// Wrapper to provide ReactFlow context
export default function App() {
  return (
    <ReactFlowProvider>
      <BrainstormApp />
    </ReactFlowProvider>
  );
}

function BrainstormApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([] as Edge[]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [sessionTitle, setSessionTitle] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const brainstormNodesRef = useRef<Map<string, BrainstormNode>>(new Map());
  const brainstormEdgesRef = useRef<Map<string, BrainstormEdge>>(new Map());
  const [nodeMemos, setNodeMemos] = useState<Record<string, string>>({});

  const handleMemoChange = useCallback((nodeId: string, memo: string) => {
    setNodeMemos((prev) => ({ ...prev, [nodeId]: memo }));
  }, []);

  // Get a random position within the current visible viewport
  const getViewportPosition = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return { x: 300, y: 300 };

    const rect = el.getBoundingClientRect();
    const padding = 80;
    const screenX = rect.left + padding + Math.random() * (rect.width - padding * 2);
    const screenY = rect.top + padding + Math.random() * (rect.height - padding * 2);

    return screenToFlowPosition({ x: screenX, y: screenY });
  }, [screenToFlowPosition]);

  // Node list for sidebar
  const nodeList = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        text: (n.data as { label: string }).label,
        isGenerated: (n.data as { isGenerated: boolean }).isGenerated,
        color: (n.data as { isGenerated: boolean }).isGenerated
          ? '#b48cd2'
          : getNodeColor(n.id),
      })),
    [nodes]
  );

  // Sync memos into node data
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, memo: nodeMemos[n.id] || '', onMemoChange: handleMemoChange },
      }))
    );
  }, [nodeMemos, setNodes, handleMemoChange]);

  const updateSelectedVisuals = useCallback(
    (selectedIds: string[]) => {
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: { ...n.data, selected: selectedIds.includes(n.id) },
        }))
      );
    },
    [setNodes]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const ids = selectedNodes.map((n: Node) => n.id);
      setSelectedNodeIds(ids);
      updateSelectedVisuals(ids);
    },
    [updateSelectedVisuals]
  );

  // Click on empty canvas to deselect all
  const onPaneClick = useCallback(() => {
    setSelectedNodeIds([]);
    updateSelectedVisuals([]);
  }, [updateSelectedVisuals]);

  const handleAddNode = useCallback(
    (text: string) => {
      const parts = text.split('|').map((s) => s.trim()).filter(Boolean);

      const newNodes: Node[] = parts.map((part) => {
        const id = uuidv4();
        const position = getViewportPosition();
        brainstormNodesRef.current.set(id, {
          id,
          text: part,
          createdFrom: [],
          createdAt: Date.now(),
        });
        return {
          id,
          type: 'floating',
          position,
          data: { label: part, isGenerated: false, selected: false, memo: '', onMemoChange: handleMemoChange },
        } as Node;
      });

      setNodes((nds) => [...nds, ...newNodes]);
    },
    [setNodes, getViewportPosition, handleMemoChange]
  );

  const handleConnect = useCallback(
    (relationType: RelationType) => {
      if (selectedNodeIds.length < 2) return;

      const newEdges: Edge[] = [];
      const duplicateEdgeIds: Set<string> = new Set();

      for (let i = 0; i < selectedNodeIds.length - 1; i++) {
        const edgeId = uuidv4();
        const source = selectedNodeIds[i];
        const target = selectedNodeIds[i + 1];

        // Find existing edges between this pair (either direction) and mark for removal
        brainstormEdgesRef.current.forEach((existing, existingId) => {
          if (
            (existing.source === source && existing.target === target) ||
            (existing.source === target && existing.target === source)
          ) {
            brainstormEdgesRef.current.delete(existingId);
            duplicateEdgeIds.add(existingId);
          }
        });

        brainstormEdgesRef.current.set(edgeId, {
          id: edgeId,
          source,
          target,
          relationType,
        });

        newEdges.push({
          id: edgeId,
          source,
          target,
          label: relationType,
          markerEnd: { type: MarkerType.ArrowClosed, color: getEdgeColor(relationType) },
          style: {
            stroke: getEdgeColor(relationType),
            strokeWidth: 1.5,
            strokeDasharray: '6,4',
          },
          labelStyle: { fontSize: 9, fill: 'rgba(120, 110, 130, 0.6)' },
        });
      }

      setEdges((eds) => [
        ...eds.filter((e) => !duplicateEdgeIds.has(e.id)),
        ...newEdges,
      ]);
    },
    [selectedNodeIds, setEdges]
  );

  const onConnectHandler = useCallback(
    (connection: Connection) => {
      const edgeId = uuidv4();
      brainstormEdgesRef.current.set(edgeId, {
        id: edgeId,
        source: connection.source!,
        target: connection.target!,
        relationType: 'related',
      });

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: edgeId,
            markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(160, 150, 180, 0.5)' },
            style: {
              stroke: 'rgba(160, 150, 180, 0.5)',
              strokeWidth: 1.5,
              strokeDasharray: '6,4',
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const handleGenerate = useCallback(() => {
    if (selectedNodeIds.length < 2) return;

    const parentTexts = selectedNodeIds
      .map((id) => brainstormNodesRef.current.get(id)?.text)
      .filter(Boolean);

    const promptText = window.prompt(
      `이 생각들을 조합해서 새로운 생각을 만들어보세요:\n\n${parentTexts.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n새로운 생각:`
    );

    if (!promptText?.trim()) return;

    const id = uuidv4();
    const parentNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
    const avgX =
      parentNodes.reduce((sum, n) => sum + n.position.x, 0) / parentNodes.length;
    const avgY =
      parentNodes.reduce((sum, n) => sum + n.position.y, 0) / parentNodes.length;

    brainstormNodesRef.current.set(id, {
      id,
      text: promptText.trim(),
      createdFrom: [...selectedNodeIds],
      createdAt: Date.now(),
    });

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'floating',
        position: { x: avgX, y: avgY + 140 },
        data: { label: promptText.trim(), isGenerated: true, selected: false, memo: '', onMemoChange: handleMemoChange },
      } as Node,
    ]);

    const newEdges: Edge[] = selectedNodeIds.map((parentId) => {
      const edgeId = uuidv4();
      brainstormEdgesRef.current.set(edgeId, {
        id: edgeId,
        source: parentId,
        target: id,
        relationType: 'expansion',
      });
      return {
        id: edgeId,
        source: parentId,
        target: id,
        label: 'expansion',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(180, 140, 200, 0.4)' },
        style: {
          stroke: 'rgba(180, 140, 200, 0.4)',
          strokeWidth: 1.5,
          strokeDasharray: '4,4',
        },
        labelStyle: { fontSize: 9, fill: 'rgba(140, 100, 180, 0.5)' },
        animated: true,
      };
    });

    setEdges((eds) => [...eds, ...newEdges]);
  }, [selectedNodeIds, nodes, setNodes, setEdges]);

  // Delete selected nodes
  const handleDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const idsToDelete = new Set(selectedNodeIds);

    // Remove from brainstorm refs
    idsToDelete.forEach((id) => brainstormNodesRef.current.delete(id));
    // Remove edges connected to deleted nodes
    brainstormEdgesRef.current.forEach((edge, edgeId) => {
      if (idsToDelete.has(edge.source) || idsToDelete.has(edge.target)) {
        brainstormEdgesRef.current.delete(edgeId);
      }
    });

    setNodes((nds) => nds.filter((n) => !idsToDelete.has(n.id)));
    setEdges((eds) =>
      eds.filter((e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target))
    );
    setSelectedNodeIds([]);
  }, [selectedNodeIds, setNodes, setEdges]);

  // Delete a single node by id
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      brainstormNodesRef.current.delete(nodeId);
      brainstormEdgesRef.current.forEach((edge, edgeId) => {
        if (edge.source === nodeId || edge.target === nodeId) {
          brainstormEdgesRef.current.delete(edgeId);
        }
      });

      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );
      setSelectedNodeIds((ids) => ids.filter((id) => id !== nodeId));
    },
    [setNodes, setEdges]
  );

  // Keyboard shortcut: Delete / Backspace
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeIds.length > 0) {
        // Don't delete if user is typing in an input
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        handleDeleteSelected();
      }
    },
    [selectedNodeIds, handleDeleteSelected]
  );

  const getExportNodes = useCallback(() => {
    return Array.from(brainstormNodesRef.current.values()).map((n) => ({
      ...n,
      memo: nodeMemos[n.id] || '',
    }));
  }, [nodeMemos]);

  const handleExportPDF = useCallback(() => {
    const allNodes = getExportNodes();
    const allEdges = Array.from(brainstormEdgesRef.current.values());
    exportSessionToPDF(sessionTitle || 'Brainstorming Session', allNodes, allEdges);
  }, [sessionTitle, getExportNodes]);

  const [copyDone, setCopyDone] = useState(false);
  const handleCopyMarkdown = useCallback(() => {
    const allNodes = getExportNodes();
    const allEdges = Array.from(brainstormEdgesRef.current.values());
    copyMarkdownToClipboard(sessionTitle || 'Brainstorming Session', allNodes, allEdges);
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }, [sessionTitle, getExportNodes]);

  return (
    <div className="app-container" onKeyDown={handleKeyDown} tabIndex={-1}>
      <Toolbar
        onAddNode={handleAddNode}
        onConnect={handleConnect}
        onGenerate={handleGenerate}
        onExportPDF={handleExportPDF}
        onCopyMarkdown={handleCopyMarkdown}
        copyDone={copyDone}
        onDeleteSelected={handleDeleteSelected}
        onDeleteNode={handleDeleteNode}
        selectedCount={selectedNodeIds.length}
        sessionTitle={sessionTitle}
        onTitleChange={setSessionTitle}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        nodeList={nodeList}
      />
      <div className="canvas-container" ref={canvasRef}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnectHandler}
          onSelectionChange={onSelectionChange}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          multiSelectionKeyCode="Shift"
          selectionOnDrag
          selectNodesOnDrag={false}
          panOnDrag={[1]}
          selectionMode={SelectionMode.Partial}
          fitView
          minZoom={0.2}
          maxZoom={2}
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={28}
            size={1}
            color="rgba(0, 0, 0, 0.05)"
          />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              const data = n.data as { isGenerated?: boolean };
              return data?.isGenerated ? '#d5c0e8' : '#ddd8d0';
            }}
            maskColor="rgba(248, 246, 243, 0.85)"
            style={{ backgroundColor: '#fffefa', borderRadius: '14px' }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
