import type { BrainstormNode, BrainstormEdge } from '../types';
import { relationLabels } from '../types';

export function exportSessionToMarkdown(
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

  let md = '';

  // Header
  md += `# ${title}\n\n`;
  md += `> ${dateStr}  \n`;
  md += `> ${nodes.length}개의 생각 · ${edges.length}개의 연결 · ${generatedNodes.length}개의 생성된 생각\n\n`;
  md += `---\n\n`;

  // Ideas
  md += `## 생각들\n\n`;
  nodes.forEach((node, i) => {
    const time = new Date(node.createdAt).toLocaleTimeString('ko-KR');
    const tag = node.createdFrom.length > 0 ? ' `생성됨`' : '';
    md += `${i + 1}. **${node.text}**${tag}  _${time}_\n`;
    if (node.memo) {
      md += `    > ${node.memo.replace(/\n/g, '\n    > ')}\n`;
    }
  });
  md += `\n`;

  // Connections
  if (edges.length > 0) {
    md += `---\n\n`;
    md += `## 연결\n\n`;
    md += `| 출발 | → | 도착 | 관계 |\n`;
    md += `| --- | --- | --- | --- |\n`;
    edges.forEach((edge) => {
      const src = nodes.find((n) => n.id === edge.source)?.text || '?';
      const tgt = nodes.find((n) => n.id === edge.target)?.text || '?';
      const rel = edge.relationType ? relationLabels[edge.relationType] : '관련 있음';
      md += `| ${src} | → | ${tgt} | ${rel} |\n`;
    });
    md += `\n`;
  }

  // Generated Ideas
  if (generatedNodes.length > 0) {
    md += `---\n\n`;
    md += `## 생성된 생각\n\n`;
    generatedNodes.forEach((node) => {
      const parents = node.createdFrom
        .map((id) => nodes.find((n) => n.id === id)?.text || '?')
        .join(' + ');
      md += `- **${node.text}**\n`;
      md += `  - from: ${parents}\n`;
    });
    md += `\n`;
  }

  return md;
}

export function copyMarkdownToClipboard(
  title: string,
  nodes: BrainstormNode[],
  edges: BrainstormEdge[]
) {
  const md = exportSessionToMarkdown(title, nodes, edges);
  navigator.clipboard.writeText(md);
}
