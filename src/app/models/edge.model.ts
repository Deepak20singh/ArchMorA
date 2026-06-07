export interface ConnectionEdge {
  id: string;
  source: string;
  target: string;
  communication: 'sync' | 'async' | 'event' | 'database' | 'cache';
  protocol?: string;
  label?: string;
}
