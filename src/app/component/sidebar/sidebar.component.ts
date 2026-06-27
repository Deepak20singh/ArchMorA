import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SidebarItem { label: string; type: string; icon: string; }
interface SidebarSection { title: string; items: SidebarItem[]; }

@Component({
  selector: 'app-sidebar',
  standalone: true,
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class SidebarComponent implements AfterViewInit {

  sections: SidebarSection[] = [
    {
      title: 'Client',
      items: [
        { label: 'Web App',      type: 'frontend',  icon: '🌐' },
        { label: 'Mobile App',   type: 'mobile',    icon: '📱' },
        { label: 'Desktop App',  type: 'desktop',   icon: '🖥️' },
        { label: 'IoT Device',   type: 'iot',       icon: '📡' },
      ],
    },
    {
      title: 'Gateway & Proxy',
      items: [
        { label: 'API Gateway',    type: 'gateway',  icon: '🚪' },
        { label: 'Load Balancer',  type: 'lb',       icon: '🔀' },
        { label: 'Reverse Proxy',  type: 'proxy',    icon: '🔁' },
        { label: 'CDN',            type: 'cdn',      icon: '🌍' },
        { label: 'DNS',            type: 'dns',      icon: '🗺️' },
      ],
    },
    {
      title: 'Backend Services',
      items: [
        { label: 'Auth Service',    type: 'auth',        icon: '🔐' },
        { label: 'Microservice',    type: 'service',     icon: '⚙️' },
        { label: 'GraphQL API',     type: 'graphql',     icon: '◈' },
        { label: 'REST API',        type: 'rest',        icon: '🔗' },
        { label: 'gRPC Service',    type: 'grpc',        icon: '⚡' },
        { label: 'WebSocket',       type: 'websocket',   icon: '🔌' },
        { label: 'Notification Svc',type: 'notification',icon: '🔔' },
        { label: 'Email Service',   type: 'email',       icon: '📧' },
        { label: 'Payment Service', type: 'payment',     icon: '💳' },
        { label: 'Search Service',  type: 'search',      icon: '🔍' },
      ],
    },
    {
      title: 'Databases',
      items: [
        { label: 'PostgreSQL',  type: 'postgres',   icon: '🐘' },
        { label: 'MySQL',       type: 'mysql',      icon: '🐬' },
        { label: 'MongoDB',     type: 'mongo',      icon: '🍃' },
        { label: 'Cassandra',   type: 'cassandra',  icon: '👁️' },
        { label: 'DynamoDB',    type: 'dynamo',     icon: '⚡' },
        { label: 'SQLite',      type: 'sqlite',     icon: '📦' },
      ],
    },
    {
      title: 'Cache',
      items: [
        { label: 'Redis',       type: 'redis',      icon: '🔴' },
        { label: 'Memcached',   type: 'memcached',  icon: '🟡' },
      ],
    },
    {
      title: 'Message Queue',
      items: [
        { label: 'RabbitMQ',    type: 'rabbitmq',   icon: '🐇' },
        { label: 'Kafka',       type: 'kafka',      icon: '🛰️' },
        { label: 'AWS SQS',     type: 'sqs',        icon: '📬' },
        { label: 'Pub/Sub',     type: 'pubsub',     icon: '📢' },
        { label: 'NATS',        type: 'nats',       icon: '🌊' },
      ],
    },
    {
      title: 'Storage',
      items: [
        { label: 'Object Store', type: 'objectstore', icon: '🗄️' },
        { label: 'File System',  type: 'filesystem',  icon: '📁' },
        { label: 'Data Lake',    type: 'datalake',    icon: '🏞️' },
        { label: 'Data Warehouse',type: 'warehouse',  icon: '🏭' },
      ],
    },
    {
      title: 'Search & Analytics',
      items: [
        { label: 'Elasticsearch', type: 'elasticsearch', icon: '🔎' },
        { label: 'Kibana',        type: 'kibana',        icon: '📊' },
        { label: 'Spark',         type: 'spark',         icon: '✨' },
        { label: 'Hadoop',        type: 'hadoop',        icon: '🐘' },
      ],
    },
    {
      title: 'Infrastructure',
      items: [
        { label: 'Docker',       type: 'docker',      icon: '🐳' },
        { label: 'Kubernetes',   type: 'k8s',         icon: '☸️' },
        { label: 'Nginx',        type: 'nginx',       icon: '🟩' },
        { label: 'Prometheus',   type: 'prometheus',  icon: '🔥' },
        { label: 'Grafana',      type: 'grafana',     icon: '📈' },
        { label: 'CI/CD',        type: 'cicd',        icon: '🔄' },
        { label: 'Firewall',     type: 'firewall',    icon: '🛡️' },
        { label: 'VPN',          type: 'vpn',         icon: '🔒' },
      ],
    },
    {
      title: 'Annotations',
      items: [
        { label: 'Sticky Note',  type: 'note',        icon: '📝' },
        { label: 'Text Label',   type: 'note',        icon: '🏷️' },
        { label: 'Warning',      type: 'note',        icon: '⚠️' },
        { label: 'Info Box',     type: 'note',        icon: 'ℹ️' },
      ],
    },
  ];

  search = '';

  get filteredSections(): SidebarSection[] {
    const q = this.search.toLowerCase().trim();
    if (!q) return this.sections;
    return this.sections
      .map(s => ({ ...s, items: s.items.filter(i => i.label.toLowerCase().includes(q) || i.type.includes(q)) }))
      .filter(s => s.items.length > 0);
  }

  constructor(
    private host: ElementRef<HTMLElement>,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {}

  toJson(item: SidebarItem): string {
    return JSON.stringify(item);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.host.nativeElement.addEventListener('dragstart', (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const card = target.closest<HTMLElement>('[data-item]');
      if (!card?.dataset['item']) return;
      e.dataTransfer!.setData('application/json', card.dataset['item']);
      e.dataTransfer!.effectAllowed = 'move';
    });

    this.bindTouchDrag();
  }

  private ghost: HTMLElement | null = null;
  private dragItem: string | null = null;

  private bindTouchDrag(): void {
    const host = this.host.nativeElement;

    host.addEventListener('touchstart', (e: TouchEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
      if (!card?.dataset['item']) return;
      this.dragItem = card.dataset['item']!;

      const t = e.touches[0];
      this.ghost = card.cloneNode(true) as HTMLElement;
      Object.assign(this.ghost.style, {
        position: 'fixed', zIndex: '9999', pointerEvents: 'none',
        opacity: '0.85', transform: 'scale(1.05)',
        left: t.clientX - card.offsetWidth / 2 + 'px',
        top:  t.clientY - card.offsetHeight / 2 + 'px',
        width: card.offsetWidth + 'px',
      });
      document.body.appendChild(this.ghost);
    }, { passive: true });

    host.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.ghost) return;
      const t = e.touches[0];
      this.ghost.style.left = t.clientX - this.ghost.offsetWidth  / 2 + 'px';
      this.ghost.style.top  = t.clientY - this.ghost.offsetHeight / 2 + 'px';
    }, { passive: true });

    host.addEventListener('touchend', (e: TouchEvent) => {
      if (this.ghost) { this.ghost.remove(); this.ghost = null; }
      if (!this.dragItem) return;

      const t = e.changedTouches[0];
      const dropEl = document.getElementById('drawflow');
      if (!dropEl) { this.dragItem = null; return; }

      const rect = dropEl.getBoundingClientRect();
      if (t.clientX < rect.left || t.clientX > rect.right ||
          t.clientY < rect.top  || t.clientY > rect.bottom) {
        this.dragItem = null; return;
      }

      dropEl.dispatchEvent(new CustomEvent('touch-drop', {
        detail: { item: this.dragItem, clientX: t.clientX, clientY: t.clientY },
        bubbles: true,
      }));
      this.dragItem = null;
    }, { passive: true });
  }
}
