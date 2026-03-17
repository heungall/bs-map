import { memo, useMemo, useEffect, useState, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

const PASTEL_COLORS = [
  { bg: '#fef3e2', border: 'rgba(240, 180, 100, 0.2)' },
  { bg: '#e8f4f8', border: 'rgba(130, 190, 210, 0.2)' },
  { bg: '#f3e8f9', border: 'rgba(180, 140, 210, 0.2)' },
  { bg: '#e8f5e9', border: 'rgba(130, 190, 130, 0.2)' },
  { bg: '#fce4ec', border: 'rgba(210, 140, 160, 0.2)' },
  { bg: '#fff8e1', border: 'rgba(210, 190, 100, 0.2)' },
  { bg: '#e0f2f1', border: 'rgba(120, 190, 180, 0.2)' },
  { bg: '#f3e5f5', border: 'rgba(170, 130, 200, 0.2)' },
];

const GENERATED_COLOR = { bg: '#ede7f6', border: 'rgba(140, 100, 180, 0.3)' };

interface FloatingNodeData {
  label: string;
  isGenerated: boolean;
  selected: boolean;
  memo: string;
  onMemoChange: (nodeId: string, memo: string) => void;
}

function FloatingNode({ data, id }: NodeProps) {
  const nodeData = data as unknown as FloatingNodeData;
  const [entered, setEntered] = useState(true);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState(nodeData.memo || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setEntered(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setMemoText(nodeData.memo || '');
  }, [nodeData.memo]);

  useEffect(() => {
    if (memoOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [memoOpen]);

  const { color, floatDuration, floatDelay } = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash) % PASTEL_COLORS.length;
    return {
      color: nodeData.isGenerated ? GENERATED_COLOR : PASTEL_COLORS[idx],
      floatDuration: 4.5 + (Math.abs(hash >> 8) % 30) / 10,
      floatDelay: -(Math.abs(hash >> 16) % 50) / 10,
    };
  }, [id, nodeData.isGenerated]);

  const handleMemoToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (memoOpen) {
      // Closing — save
      nodeData.onMemoChange(id, memoText);
    }
    setMemoOpen(!memoOpen);
  };

  const handleMemoBlur = () => {
    nodeData.onMemoChange(id, memoText);
    setMemoOpen(false);
  };

  const hasMemo = (nodeData.memo || '').trim().length > 0;

  return (
    <div
      className={`floating-node ${nodeData.isGenerated ? 'generated' : ''} ${nodeData.selected ? 'multi-selected' : ''} ${entered ? 'node-enter' : ''}`}
      style={{
        background: color.bg,
        borderColor: color.border,
        '--float-duration': `${floatDuration}s`,
        '--float-delay': `${floatDelay}s`,
      } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} />

      <div className="node-text">{nodeData.label}</div>
      {nodeData.isGenerated && <div className="node-badge">from combined ideas</div>}

      {/* Memo button */}
      <button
        className={`node-memo-btn ${hasMemo ? 'has-memo' : ''}`}
        onClick={handleMemoToggle}
        title={hasMemo ? '메모 보기' : '메모 추가'}
      >
        {hasMemo ? '📝' : '✏️'}
      </button>

      {/* Memo area */}
      {memoOpen && (
        <div className="node-memo-area" onClick={(e) => e.stopPropagation()}>
          <textarea
            ref={textareaRef}
            className="node-memo-input"
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            onBlur={handleMemoBlur}
            placeholder="첨언을 적어보세요..."
            rows={3}
          />
        </div>
      )}

      {/* Memo preview when closed */}
      {!memoOpen && hasMemo && (
        <div className="node-memo-preview">{nodeData.memo}</div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(FloatingNode);
