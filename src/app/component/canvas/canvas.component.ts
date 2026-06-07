import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AfterViewInit, ChangeDetectorRef, Component, ElementRef,
  Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild,
} from '@angular/core';
import Drawflow from 'drawflow';
import { GraphService } from '../../services/graph.service';
import { ConnectionEdge } from '../../models/edge.model';

interface EdgePopup {
  visible: boolean;
  connId: string;
  outputId: string; inputId: string;
  outputClass: string; inputClass: string;
  communication: ConnectionEdge['communication'];
  protocol: string; label: string;
}

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('drawflowContainer', { static: true }) containerRef!: ElementRef<HTMLElement>;
  @ViewChild('dropZone', { static: true }) dropZoneRef!: ElementRef<HTMLElement>;

  editor: any;
  private isBrowser: boolean;
  zoomLevel = 100;

  readonly commTypes = [
    { val: 'sync',     label: '— Sync'    },
    { val: 'async',    label: '╌ Async'   },
    { val: 'event',    label: '· Event'   },
    { val: 'database', label: '— DB'      },
    { val: 'cache',    label: '╌ Cache'   },
  ] as const;

  popup: EdgePopup = {
    visible: false, connId: '', outputId: '', inputId: '',
    outputClass: '', inputClass: '',
    communication: 'sync', protocol: 'REST', label: '',
  };

  private touch = { active: false, lastX: 0, lastY: 0 };
  private lastPinchDist = 0;
  private readonly ZOOM_MIN = 0.25;
  private readonly ZOOM_MAX = 2;
  private readonly ZOOM_STEP = 0.1;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    public graphService: GraphService,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.zone.runOutsideAngular(() => {
      this.editor = new Drawflow(this.containerRef.nativeElement);
      this.editor.start();
      this.editor.editor_mode = 'edit';
      this.editor.draggable_inputs = true;
      this.editor.zoom_max = this.ZOOM_MAX;
      this.editor.zoom_min = this.ZOOM_MIN;
      this.editor.zoom_value = this.ZOOM_STEP;

      this.wireDrawflowEvents();
      this.bindTouchPan();
      this.bindWheelZoom();
      setTimeout(() => this.addWelcomeNode(), 0);
      console.log('[Canvas] ✅ Drawflow started');
    });

    document.addEventListener('dragover', this.onDragOverNative);
    document.addEventListener('drop', this.onDropNative);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    document.removeEventListener('dragover', this.onDragOverNative);
    document.removeEventListener('drop', this.onDropNative);
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────

  zoomIn():    void { this.applyZoom(this.editor.zoom + this.ZOOM_STEP, null, null); }
  zoomOut():   void { this.applyZoom(this.editor.zoom - this.ZOOM_STEP, null, null); }
  zoomReset(): void {
    this.editor.canvas_x = 0;
    this.editor.canvas_y = 0;
    this.applyZoom(1, null, null);
  }

  private applyZoom(newZoom: number, ox: number | null, oy: number | null): void {
    const z = Math.min(Math.max(newZoom, this.ZOOM_MIN), this.ZOOM_MAX);
    if (ox !== null && oy !== null) {
      const r = z / this.editor.zoom;
      this.editor.canvas_x = ox - r * (ox - this.editor.canvas_x);
      this.editor.canvas_y = oy - r * (oy - this.editor.canvas_y);
    }
    this.editor.zoom = z;
    this.editor.zoom_last_value = z;
    this.editor.precanvas.style.transform =
      `translate(${this.editor.canvas_x}px,${this.editor.canvas_y}px) scale(${z})`;

    // Grid on #drawflow scales with zoom, stays fixed during pan
    const gridSize = 40 * z;
    this.containerRef.nativeElement.style.backgroundSize = `${gridSize}px ${gridSize}px`;

    this.zone.run(() => { this.zoomLevel = Math.round(z * 100); this.cdr.markForCheck(); });
  }

  // ── Wheel zoom ────────────────────────────────────────────────────────────

  private bindWheelZoom(): void {
    this.containerRef.nativeElement.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = this.containerRef.nativeElement.getBoundingClientRect();
        this.applyZoom(
          this.editor.zoom + (e.deltaY < 0 ? this.ZOOM_STEP : -this.ZOOM_STEP),
          e.clientX - rect.left, e.clientY - rect.top
        );
      } else {
        this.editor.canvas_x -= e.deltaX;
        this.editor.canvas_y -= e.deltaY;
        this.editor.precanvas.style.transform =
          `translate(${this.editor.canvas_x}px,${this.editor.canvas_y}px) scale(${this.editor.zoom})`;
      }
    }, { passive: false });
  }

  // ── Touch pan + pinch zoom ────────────────────────────────────────────────

  private bindTouchPan(): void {
    const el = this.containerRef.nativeElement;

    el.addEventListener('touchstart', (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('.drawflow-node')) return;
      if (e.touches.length === 1) {
        this.touch = { active: true, lastX: e.touches[0].clientX, lastY: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.touch.active = false;
        this.lastPinchDist = this.getPinchDist(e);
      }
    }, { passive: true });

    el.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = this.getPinchDist(e);
        const delta = (dist - this.lastPinchDist) * 0.005;
        this.lastPinchDist = dist;
        const rect = el.getBoundingClientRect();
        const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        this.applyZoom(this.editor.zoom + delta, mx, my);
        return;
      }
      if (!this.touch.active || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.touch.lastX;
      const dy = e.touches[0].clientY - this.touch.lastY;
      this.touch.lastX = e.touches[0].clientX;
      this.touch.lastY = e.touches[0].clientY;
      this.editor.canvas_x += dx;
      this.editor.canvas_y += dy;
      this.editor.precanvas.style.transform =
        `translate(${this.editor.canvas_x}px,${this.editor.canvas_y}px) scale(${this.editor.zoom})`;
    }, { passive: true });

    el.addEventListener('touchend', () => { this.touch.active = false; }, { passive: true });
  }

  private getPinchDist(e: TouchEvent): number {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ── Drag / Drop ───────────────────────────────────────────────────────────

  onDragOver(e: DragEvent): void { e.preventDefault(); }
  onDrop(e: DragEvent): void { e.preventDefault(); }

  private isOverDropZone(e: DragEvent): boolean {
    const r = this.dropZoneRef.nativeElement.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right &&
           e.clientY >= r.top  && e.clientY <= r.bottom;
  }

  private onDragOverNative = (e: DragEvent): void => {
    if (!this.isOverDropZone(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    console.log('[Canvas] 🟡 dragover ✔');
  };

  private onDropNative = (e: DragEvent): void => {
    if (!this.isOverDropZone(e)) return;
    e.preventDefault();
    console.log('[Canvas] 📦 DROP ✔');

    const raw = e.dataTransfer?.getData('application/json');
    if (!raw) { console.warn('[Canvas] ❌ dataTransfer empty'); return; }

    let item: { label: string; type: string; icon: string };
    try { item = JSON.parse(raw); } catch { console.error('[Canvas] ❌ JSON parse failed'); return; }
    console.log('[Canvas] ✅ item:', item);

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const x = (e.clientX - rect.left - this.editor.canvas_x) / this.editor.zoom;
    const y = (e.clientY - rect.top  - this.editor.canvas_y) / this.editor.zoom;

    if (item.type === 'note') { this.addTextNode(x, y); return; }

    const html = `<div class="df-node-card">
      <div class="df-node-icon">${item.icon}</div>
      <div class="df-node-name">${item.label}</div>
      <div class="df-node-type">${item.type}</div>
    </div>`;

    const id: number = this.editor.addNode(item.label, 1, 1, x, y, item.type, {}, html);
    console.log('[Canvas] ✅ addNode id:', id);
    this.zone.run(() => this.graphService.addNode(id, item, x, y));
  };

  // ── Text node ─────────────────────────────────────────────────────────────

  addTextNode(x: number, y: number): void {
    const html = `<div class="df-text-node">
      <div class="df-text-handle">📝 Text</div>
      <textarea class="df-text-area" placeholder="Type here..." rows="3"></textarea>
    </div>`;
    this.editor.addNode('text', 0, 0, x, y, 'note-node', {}, html);
  }

  // ── Drawflow events ───────────────────────────────────────────────────────

  private wireDrawflowEvents(): void {
    this.editor.on('nodeSelected', (id: string) =>
      this.zone.run(() => this.graphService.selectNode(id))
    );
    this.editor.on('nodeRemoved', (id: string) =>
      this.zone.run(() => this.graphService.removeNode(id))
    );
    this.editor.on('connectionCreated', (c: any) => {
      const connId = `${c.output_id}-${c.input_id}`;
      this.zone.run(() => {
        this.graphService.addEdge(connId, String(c.output_id), String(c.input_id));
        const edge = this.graphService.getEdge(connId)!;
        this.popup = {
          visible: true, connId,
          outputId: String(c.output_id), inputId: String(c.input_id),
          outputClass: c.output_class, inputClass: c.input_class,
          communication: edge.communication,
          protocol: edge.protocol ?? '', label: '',
        };
      });
    });
    this.editor.on('connectionRemoved', (c: any) => {
      const connId = `${c.output_id}-${c.input_id}`;
      this.zone.run(() => {
        this.graphService.removeEdge(connId);
        this.removeSvgLabel(connId);
      });
    });
  }

  // ── Edge popup ────────────────────────────────────────────────────────────

  confirmEdge(): void {
    const { connId, communication, protocol, label,
            outputId, inputId, outputClass, inputClass } = this.popup;
    this.graphService.updateEdge(connId, { communication, protocol, label });
    this.applyEdgeStyle(outputId, inputId, outputClass, inputClass, communication);
    if (label.trim()) this.injectSvgLabel(outputId, inputId, outputClass, inputClass, label, communication);
    this.popup.visible = false;
  }

  cancelEdge(): void {
    const { outputId, inputId, outputClass, inputClass } = this.popup;
    try { this.editor.removeSingleConnection(outputId, inputId, outputClass, inputClass); } catch { /**/ }
    this.graphService.removeEdge(this.popup.connId);
    this.popup.visible = false;
  }

  // ── SVG edge styling ──────────────────────────────────────────────────────

  private applyEdgeStyle(oId: string, iId: string, oCls: string, iCls: string, comm: ConnectionEdge['communication']): void {
    const svg = this.containerRef.nativeElement.querySelector(
      `.connection.node_in_node-${iId}.node_out_node-${oId}.${oCls}.${iCls}`
    );
    if (!svg) return;
    svg.classList.remove('conn-sync','conn-async','conn-event','conn-database','conn-cache');
    svg.classList.add(`conn-${comm}`);
  }

  private injectSvgLabel(oId: string, iId: string, oCls: string, iCls: string, label: string, comm: ConnectionEdge['communication']): void {
    const connId = `${oId}-${iId}`;
    this.removeSvgLabel(connId);
    const svg = this.containerRef.nativeElement.querySelector(
      `.connection.node_in_node-${iId}.node_out_node-${oId}.${oCls}.${iCls}`
    ) as SVGElement | null;
    if (!svg) return;
    const path = svg.querySelector('.main-path') as SVGPathElement | null;
    if (!path) return;
    const mid = path.getPointAtLength(path.getTotalLength() / 2);
    const ns = 'http://www.w3.org/2000/svg';
    const w = Math.max(label.length * 7 + 16, 60);

    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('x', String(mid.x - w / 2));
    bg.setAttribute('y', String(mid.y - 11));
    bg.setAttribute('width', String(w));
    bg.setAttribute('height', '20');
    bg.setAttribute('rx', '5');
    bg.setAttribute('class', `edge-label-bg edge-label-bg-${comm}`);
    bg.setAttribute('data-label-id', connId);

    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('x', String(mid.x));
    txt.setAttribute('y', String(mid.y + 4));
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('class', `edge-label-text edge-label-text-${comm}`);
    txt.setAttribute('data-label-id', connId);
    txt.textContent = label;

    svg.appendChild(bg);
    svg.appendChild(txt);
  }

  private removeSvgLabel(connId: string): void {
    this.containerRef.nativeElement
      .querySelectorAll(`[data-label-id="${connId}"]`)
      .forEach(el => el.remove());
  }

  // ── Toolbar ───────────────────────────────────────────────────────────────

  debugCanvas(): void {
    const container = this.containerRef.nativeElement;
    const dropZone = this.dropZoneRef.nativeElement;
    const precanvas = container.querySelector('.drawflow');
    const dzRect = dropZone.getBoundingClientRect();
    const cRect = container.getBoundingClientRect();
    console.log('=== DEBUG ===');
    console.log('editor:', this.editor ? '✅' : '❌');
    console.log('precanvas:', precanvas ? '✅' : '❌ NOT FOUND');
    console.log('#drawflow rect:', JSON.stringify(cRect));
    console.log('drop-zone rect:', JSON.stringify(dzRect));
    alert(
      `editor: ${this.editor ? '✅' : '❌'}\n` +
      `precanvas: ${precanvas ? '✅' : '❌ NOT FOUND'}\n` +
      `#drawflow: ${Math.round(cRect.width)}x${Math.round(cRect.height)}\n` +
      `drop-zone: ${Math.round(dzRect.width)}x${Math.round(dzRect.height)}`
    );
  }

  exportGraph(): void {
    const blob = new Blob([JSON.stringify(this.graphService.exportGraph(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'architecture.json'; a.click();
    URL.revokeObjectURL(url);
  }

  clearCanvas(): void {
    this.editor?.clear();
    this.graphService.reset();
    this.popup.visible = false;
    this.zoomReset();
    this.addWelcomeNode();
  }

  private addWelcomeNode(): void {
    if (!this.editor) return;
    const el = this.containerRef.nativeElement;
    const x = (el.clientWidth  / 2 - 130) / this.editor.zoom;
    const y = (el.clientHeight / 2 - 80)  / this.editor.zoom;
    this.editor.addNode(
      'welcome', 0, 0, x, y, 'welcome-node', {},
      `<div class="df-welcome">
        <div class="df-welcome-emoji">🚀</div>
        <div class="df-welcome-title">ArchMora</div>
        <div class="df-welcome-sub">
          Drag components from sidebar<br>
          Connect nodes via the dots<br>
          Right-click a node to delete
        </div>
      </div>`
    );
  }
}
