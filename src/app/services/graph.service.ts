import { Injectable, signal } from '@angular/core';
import { ServiceNode } from '../models/service.model';
import { ConnectionEdge } from '../models/edge.model';

export interface ArchitectureGraph {
  nodes: ServiceNode[];
  edges: ConnectionEdge[];
}

const TYPE_CATEGORY_MAP: Record<string, ServiceNode['category']> = {
  frontend: 'frontend', mobile: 'frontend',
  gateway: 'gateway', auth: 'backend', service: 'backend',
  postgres: 'database', mongo: 'database', mysql: 'database', cassandra: 'database',
  redis: 'cache', memcached: 'cache',
  rabbitmq: 'queue', kafka: 'queue', sqs: 'queue', pubsub: 'queue',
  lb: 'backend', cdn: 'backend', nginx: 'backend', docker: 'backend',
  k8s: 'backend', elasticsearch: 'backend', prometheus: 'backend',
};

const EDGE_COMM_MAP: Record<string, ConnectionEdge['communication']> = {
  postgres: 'database', mongo: 'database', mysql: 'database', cassandra: 'database',
  redis: 'cache', memcached: 'cache',
  rabbitmq: 'async', kafka: 'async', sqs: 'async', pubsub: 'async',
};

@Injectable({ providedIn: 'root' })
export class GraphService {
  private nodes = new Map<string, ServiceNode>();
  private edges = new Map<string, ConnectionEdge>();

  readonly selectedNode = signal<ServiceNode | null>(null);
  readonly selectedEdge = signal<ConnectionEdge | null>(null);
  readonly graphUpdated = signal<number>(0);

  addNode(drawflowId: number, item: { label: string; type: string; icon: string }, x: number, y: number): void {
    const id = String(drawflowId);
    this.nodes.set(id, {
      id, type: item.type, name: item.label,
      category: TYPE_CATEGORY_MAP[item.type] ?? 'backend',
      technology: item.label, x, y,
    });
    this.graphUpdated.update(v => v + 1);
  }

  removeNode(id: string): void {
    this.nodes.delete(id);
    for (const [key, edge] of this.edges) {
      if (edge.source === id || edge.target === id) this.edges.delete(key);
    }
    if (this.selectedNode()?.id === id) this.selectedNode.set(null);
    this.graphUpdated.update(v => v + 1);
  }

  addEdge(id: string, source: string, target: string): void {
    const targetNode = this.nodes.get(target);
    const comm = EDGE_COMM_MAP[targetNode?.type ?? ''] ?? 'sync';
    this.edges.set(id, {
      id, source, target, communication: comm,
      protocol: comm === 'sync' ? 'REST' : undefined,
      label: '',
    });
    this.graphUpdated.update(v => v + 1);
  }

  updateEdge(id: string, patch: Partial<ConnectionEdge>): void {
    const existing = this.edges.get(id);
    if (!existing) return;
    this.edges.set(id, { ...existing, ...patch });
    this.graphUpdated.update(v => v + 1);
  }

  removeEdge(id: string): void {
    this.edges.delete(id);
    if (this.selectedEdge()?.id === id) this.selectedEdge.set(null);
    this.graphUpdated.update(v => v + 1);
  }

  getEdge(id: string): ConnectionEdge | undefined {
    return this.edges.get(id);
  }

  selectNode(id: string): void {
    this.selectedNode.set(this.nodes.get(id) ?? null);
    this.selectedEdge.set(null);
  }

  selectEdge(id: string): void {
    this.selectedEdge.set(this.edges.get(id) ?? null);
    this.selectedNode.set(null);
  }

  updateNode(updated: ServiceNode): void {
    this.nodes.set(updated.id, updated);
    this.graphUpdated.update(v => v + 1);
  }

  exportGraph(): ArchitectureGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  reset(): void {
    this.nodes.clear();
    this.edges.clear();
    this.selectedNode.set(null);
    this.selectedEdge.set(null);
    this.graphUpdated.update(v => v + 1);
  }
}
