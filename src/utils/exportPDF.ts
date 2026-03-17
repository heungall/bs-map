import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { BrainstormNode, BrainstormEdge } from '../types';
import { relationLabels } from '../types';

export async function exportSessionToPDF(
  title: string,
  nodes: BrainstormNode[],
  edges: BrainstormEdge[]
) {
  const generatedNodes = nodes.filter((n) => n.createdFrom.length > 0);
  const dateStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build HTML content
  const html = `
    <div style="
      width: 800px;
      padding: 60px;
      font-family: 'Noto Sans KR', sans-serif;
      color: #3d3a36;
      background: #fffefa;
      line-height: 1.7;
    ">
      <div style="text-align: center; margin-bottom: 48px;">
        <div style="font-size: 11px; color: #b8b0a4; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 8px;">
          brainstorming map
        </div>
        <h1 style="font-size: 28px; font-weight: 500; color: #3d3a36; margin: 0 0 12px 0;">
          ${escapeHtml(title)}
        </h1>
        <div style="font-size: 13px; color: #a39e96;">${dateStr}</div>
        <div style="font-size: 12px; color: #ccc5bb; margin-top: 8px;">
          ${nodes.length}개의 생각 · ${edges.length}개의 연결 · ${generatedNodes.length}개의 생성된 생각
        </div>
      </div>

      <div style="height: 1px; background: #e8e4de; margin: 32px 0;"></div>

      <h2 style="font-size: 16px; font-weight: 500; color: #7c7570; margin-bottom: 20px;">
        생각들
      </h2>
      ${nodes
        .map((node, i) => {
          const time = new Date(node.createdAt).toLocaleTimeString('ko-KR');
          const isGen = node.createdFrom.length > 0;
          return `
            <div style="
              display: flex;
              align-items: baseline;
              gap: 12px;
              margin-bottom: 10px;
              padding: 10px 14px;
              background: ${isGen ? '#f3e8f9' : '#f8f6f3'};
              border-radius: 10px;
            ">
              <span style="font-size: 12px; color: #b8b0a4; flex-shrink: 0;">${i + 1}.</span>
              <div style="flex: 1;">
                <span style="font-size: 14px; color: #3d3a36;">${escapeHtml(node.text)}</span>
                ${node.memo ? `<div style="font-size: 12px; color: #8c857c; margin-top: 4px; padding-left: 8px; border-left: 2px solid #e0dbd4;">${escapeHtml(node.memo)}</div>` : ''}
              </div>
              ${isGen ? '<span style="font-size: 10px; color: #b48cd2; flex-shrink: 0;">생성됨</span>' : ''}
              <span style="font-size: 11px; color: #ccc5bb; flex-shrink: 0;">${time}</span>
            </div>
          `;
        })
        .join('')}

      ${
        edges.length > 0
          ? `
        <div style="height: 1px; background: #e8e4de; margin: 32px 0;"></div>
        <h2 style="font-size: 16px; font-weight: 500; color: #7c7570; margin-bottom: 20px;">
          연결
        </h2>
        ${edges
          .map((edge) => {
            const src = nodes.find((n) => n.id === edge.source);
            const tgt = nodes.find((n) => n.id === edge.target);
            const rel = edge.relationType
              ? relationLabels[edge.relationType]
              : '관련 있음';
            return `
              <div style="
                margin-bottom: 8px;
                padding: 8px 14px;
                font-size: 13px;
                color: #6b6560;
                background: #f8f6f3;
                border-radius: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
              ">
                <span>${escapeHtml(src?.text || '?')}</span>
                <span style="color: #ccc5bb;">→</span>
                <span>${escapeHtml(tgt?.text || '?')}</span>
                <span style="font-size: 11px; color: #b8b0a4; margin-left: auto;">${rel}</span>
              </div>
            `;
          })
          .join('')}
      `
          : ''
      }

      ${
        generatedNodes.length > 0
          ? `
        <div style="height: 1px; background: #e8e4de; margin: 32px 0;"></div>
        <h2 style="font-size: 16px; font-weight: 500; color: #7c7570; margin-bottom: 20px;">
          생성된 생각
        </h2>
        ${generatedNodes
          .map((node) => {
            const parents = node.createdFrom
              .map((id) => nodes.find((n) => n.id === id)?.text || '?')
              .map(escapeHtml)
              .join(' + ');
            return `
              <div style="
                margin-bottom: 10px;
                padding: 12px 14px;
                background: #f3e8f9;
                border-radius: 10px;
                border-left: 3px solid #d5c0e8;
              ">
                <div style="font-size: 14px; color: #3d3a36; margin-bottom: 4px;">
                  ${escapeHtml(node.text)}
                </div>
                <div style="font-size: 11px; color: #b48cd2;">
                  from: ${parents}
                </div>
              </div>
            `;
          })
          .join('')}
      `
          : ''
      }
    </div>
  `;

  // Render HTML to canvas
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#fffefa',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4 height in mm

    const doc = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    // Add image, splitting across pages if needed
    while (position < imgHeight) {
      if (position > 0) {
        doc.addPage();
      }
      doc.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
      position += pageHeight;
    }

    const fileName = `${title || 'brainstorm'}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
