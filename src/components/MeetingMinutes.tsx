import { useState } from 'react';
import type { BrainstormNode, BrainstormEdge } from '../types';
import { generateMinutesPDF } from '../utils/exportMinutesPDF';

interface MeetingMinutesProps {
  nodes: BrainstormNode[];
  edges: BrainstormEdge[];
}

interface MeetingMetadata {
  date: string;
  department: string;
  topic: string;
  attendees: string;
}

interface MinutesResult {
  emailSummary: string;
  minutes: {
    title: string;
    date: string;
    department: string;
    topic: string;
    attendees: string;
    agendas: { no: number; title: string; detail: string; status?: string }[];
    actionItems: { item: string; content: string; note: string }[];
    summary: string;
  };
}

type Step = 'closed' | 'metadata' | 'loading' | 'result';

export default function MeetingMinutes({ nodes, edges }: MeetingMinutesProps) {
  const [step, setStep] = useState<Step>('closed');
  const [metadata, setMetadata] = useState<MeetingMetadata>({
    date: new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
    department: '',
    topic: '',
    attendees: '',
  });
  const [result, setResult] = useState<MinutesResult | null>(null);
  const [error, setError] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);

  const handleGenerate = async () => {
    if (!metadata.topic.trim()) return;

    setStep('loading');
    setError('');

    try {
      const response = await fetch('/api/generate-minutes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges, metadata }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'API 호출 실패');
      }

      const data: MinutesResult = await response.json();
      setResult(data);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
      setStep('metadata');
    }
  };

  const handleCopyEmail = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.emailSummary);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  };

  const handleExportPDF = () => {
    if (!result) return;
    generateMinutesPDF(result.minutes);
  };

  const handleClose = () => {
    setStep('closed');
    setError('');
  };

  if (step === 'closed') {
    return (
      <button
        className="btn btn-minutes"
        disabled={nodes.length === 0}
        onClick={() => setStep('metadata')}
      >
        AI 회의록 생성
      </button>
    );
  }

  return (
    <>
      <button
        className="btn btn-minutes active"
        onClick={() => setStep('metadata')}
      >
        AI 회의록 생성
      </button>

      <div className="minutes-overlay" onClick={handleClose}>
        <div className="minutes-modal" onClick={(e) => e.stopPropagation()}>
          <button className="minutes-close" onClick={handleClose}>&times;</button>

          {step === 'metadata' && (
            <div className="minutes-step">
              <h2 className="minutes-title">회의 정보 입력</h2>
              <p className="minutes-desc">
                브레인스토밍 노드 {nodes.length}개를 기반으로 회의록을 생성합니다.
              </p>

              {error && <div className="minutes-error">{error}</div>}

              <div className="minutes-form">
                <label className="minutes-label">
                  일시
                  <input
                    className="minutes-input"
                    value={metadata.date}
                    onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
                    placeholder="예: 2026년 3월 27일 (금) 오후 2:00 – 3:00"
                  />
                </label>
                <label className="minutes-label">
                  부서
                  <input
                    className="minutes-input"
                    value={metadata.department}
                    onChange={(e) => setMetadata({ ...metadata, department: e.target.value })}
                    placeholder="예: 개발팀"
                  />
                </label>
                <label className="minutes-label">
                  주제 *
                  <input
                    className="minutes-input"
                    value={metadata.topic}
                    onChange={(e) => setMetadata({ ...metadata, topic: e.target.value })}
                    placeholder="예: 신규 프로젝트 방향 논의"
                  />
                </label>
                <label className="minutes-label">
                  참석자
                  <input
                    className="minutes-input"
                    value={metadata.attendees}
                    onChange={(e) => setMetadata({ ...metadata, attendees: e.target.value })}
                    placeholder="예: 참석자1, 참석자2"
                  />
                </label>
              </div>

              <button
                className="btn btn-generate-minutes"
                onClick={handleGenerate}
                disabled={!metadata.topic.trim()}
              >
                AI로 회의록 생성하기
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="minutes-step minutes-loading">
              <div className="minutes-spinner" />
              <h2 className="minutes-title">회의록 생성 중...</h2>
              <p className="minutes-desc">
                AI가 {nodes.length}개의 생각을 분석하고 있습니다
              </p>
            </div>
          )}

          {step === 'result' && result && (
            <div className="minutes-step minutes-result">
              <h2 className="minutes-title">회의록 완성</h2>

              {/* Email Summary */}
              <div className="minutes-section">
                <div className="minutes-section-header">
                  <h3>메일용 요약</h3>
                  <button className="btn btn-copy-email" onClick={handleCopyEmail}>
                    {emailCopied ? '복사됨!' : '복사'}
                  </button>
                </div>
                <pre className="minutes-email-preview">{result.emailSummary}</pre>
              </div>

              {/* Agendas Preview */}
              <div className="minutes-section">
                <div className="minutes-section-header">
                  <h3>논의 안건 ({result.minutes.agendas.length}건)</h3>
                </div>
                <div className="minutes-agendas">
                  {result.minutes.agendas.map((a) => (
                    <div key={a.no} className="minutes-agenda-item">
                      <span className="agenda-no">{String(a.no).padStart(2, '0')}</span>
                      <span className="agenda-title">{a.title}</span>
                      {a.status && <span className="agenda-status">{a.status}</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Items */}
              {result.minutes.actionItems.length > 0 && (
                <div className="minutes-section">
                  <div className="minutes-section-header">
                    <h3>후속 조치 ({result.minutes.actionItems.length}건)</h3>
                  </div>
                  <div className="minutes-actions">
                    {result.minutes.actionItems.map((a, i) => (
                      <div key={i} className="minutes-action-item">
                        <strong>{a.item}</strong>
                        <span>{a.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export buttons */}
              <div className="minutes-export-row">
                <button className="btn btn-export-minutes-pdf" onClick={handleExportPDF}>
                  PDF 다운로드
                </button>
                <button className="btn btn-copy-email" onClick={handleCopyEmail}>
                  {emailCopied ? '복사됨!' : '메일 요약 복사'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
