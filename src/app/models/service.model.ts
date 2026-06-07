export interface ServiceNode {
  id: string;
  type: string;

  name: string;

  category:
    | 'frontend'
    | 'backend'
    | 'database'
    | 'queue'
    | 'cache'
    | 'gateway';

  technology?: string;

  scaling?: 'horizontal' | 'vertical';

  description?: string;

  x?: number;
  y?: number;
}