export interface BrainstormNode {
  id: string;
  text: string;
  memo?: string;
  createdFrom: string[]; // parent node IDs
  createdAt: number;
}

export interface BrainstormEdge {
  id: string;
  source: string;
  target: string;
  relationType?: RelationType;
}

export type RelationType = 'related' | 'cause-effect' | 'expansion' | 'opposite';

export const relationLabels: Record<RelationType, string> = {
  'related': '관련 있음',
  'cause-effect': '원인-결과',
  'expansion': '확장',
  'opposite': '반대',
};

export interface Session {
  id: string;
  title: string;
  nodes: BrainstormNode[];
  edges: BrainstormEdge[];
  createdAt: number;
}
