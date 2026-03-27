import { useState, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { RelationType } from '../types';
import { relationLabels } from '../types';

interface NodeListItem {
  id: string;
  text: string;
  isGenerated: boolean;
  color: string;
}

interface ToolbarProps {
  onAddNode: (text: string) => void;
  onConnect: (type: RelationType) => void;
  onGenerate: () => void;
  onExportPDF: () => void;
  onCopyMarkdown: () => void;
  copyDone: boolean;
  onDeleteSelected: () => void;
  onDeleteNode: (nodeId: string) => void;
  selectedCount: number;
  sessionTitle: string;
  onTitleChange: (title: string) => void;
  nodeCount: number;
  edgeCount: number;
  nodeList: NodeListItem[];
  meetingMinutesSlot?: ReactNode;
}

export default function Toolbar({
  onAddNode,
  onConnect,
  onGenerate,
  onExportPDF,
  onCopyMarkdown,
  copyDone,
  onDeleteSelected,
  onDeleteNode,
  selectedCount,
  sessionTitle,
  onTitleChange,
  nodeCount,
  edgeCount,
  nodeList,
  meetingMinutesSlot,
}: ToolbarProps) {
  const [inputText, setInputText] = useState('');
  const [showRelation, setShowRelation] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return; // 한글 IME 조합 중이면 무시
    if (e.key === 'Enter' && !e.shiftKey && inputText.trim()) {
      e.preventDefault();
      onAddNode(inputText.trim());
      setInputText('');
    }
  };

  const handleConnect = (type: RelationType) => {
    onConnect(type);
    setShowRelation(false);
  };

  return (
    <div className="left-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-title">brainstorming map</div>
        <input
          className="session-title-input"
          value={sessionTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="세션 제목을 적어보세요..."
        />
      </div>

      {/* Input */}
      <div className="input-section">
        <div className="input-label">생각 던지기</div>
        <textarea
          ref={textareaRef}
          className="idea-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="사과 | 바나나 | 포도"
          rows={3}
        />
        <div className="input-hint">Enter로 던지기 · Shift+Enter로 줄바꿈<br /><span className="input-hint-pipe">|</span> 로 여러 생각 한번에</div>
      </div>

      <div className="panel-divider" />

      {/* Actions */}
      <div className="actions-section">
        <div className="actions-label">도구</div>

        {selectedCount > 0 && (
          <div className="selection-info">
            {selectedCount}개의 생각이 선택됨
          </div>
        )}

        <div className="connect-wrapper">
          <button
            className="btn btn-connect"
            disabled={selectedCount < 2}
            onClick={() => setShowRelation(!showRelation)}
          >
            연결하기 {selectedCount >= 2 ? `(${selectedCount}개)` : ''}
          </button>
          {showRelation && (
            <div className="relation-dropdown">
              {(Object.entries(relationLabels) as [RelationType, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    className="relation-option"
                    onClick={() => handleConnect(key)}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <button
          className="btn btn-generate"
          disabled={selectedCount < 2}
          onClick={onGenerate}
        >
          새로운 생각 만들기
        </button>

        <button
          className="btn btn-delete"
          disabled={selectedCount < 1}
          onClick={onDeleteSelected}
        >
          선택 삭제 {selectedCount >= 1 ? `(${selectedCount}개)` : ''}
        </button>

        <button className="btn btn-markdown" onClick={onCopyMarkdown}>
          {copyDone ? '복사됨!' : 'Markdown 복사'}
        </button>

        <button className="btn btn-export" onClick={onExportPDF}>
          PDF로 내보내기
        </button>

        {meetingMinutesSlot}
      </div>

      <div className="panel-divider" />

      {/* Node List */}
      {nodeList.length > 0 && (
        <div className="node-list-section">
          <div className="node-list-label">생각들 ({nodeList.length})</div>
          {nodeList.map((node) => (
            <div key={node.id} className="node-list-item">
              <div
                className="node-list-dot"
                style={{ background: node.color }}
              />
              <span className="node-list-text">{node.text}</span>
              <button
                className="node-list-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.id);
                }}
                title="삭제"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="panel-stats">
        <span>{nodeCount} 생각</span>
        <span>·</span>
        <span>{edgeCount} 연결</span>
      </div>

      {/* Credit */}
      <div className="panel-credit">
        built by <a href="https://github.com/heungall" target="_blank" rel="noopener noreferrer">heungall</a> · with AI
      </div>
    </div>
  );
}
