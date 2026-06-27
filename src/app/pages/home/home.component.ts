import { Component, signal, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SidebarComponent } from '../../component/sidebar/sidebar.component';
import { CanvasComponent } from '../../component/canvas/canvas.component';
import { PropertiesPanelComponent } from '../../component/properties-panel/properties-panel.component';
import { AiPanelComponent } from '../../component/ai-panel/ai-panel.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, SidebarComponent, CanvasComponent, PropertiesPanelComponent, AiPanelComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  sidebarOpen = signal(false);
  propertiesOpen = signal(false);
  aiOpen = signal(false);
  aiHeight = 380;

  private swipeStartX = 0;
  private swipeStartY = 0;
  private resizing = false;
  private resizeStartY = 0;
  private resizeStartH = 0;

  private onMouseMove = (e: MouseEvent) => {
    if (!this.resizing) return;
    const delta = this.resizeStartY - e.clientY;
    const newH = Math.min(Math.max(this.resizeStartH + delta, 120), window.innerHeight * 0.85);
    this.aiHeight = newH;
  };

  private onMouseUp = () => { this.resizing = false; };

  startAiResize(e: MouseEvent): void {
    this.resizing = true;
    this.resizeStartY = e.clientY;
    this.resizeStartH = this.aiHeight;
    e.preventDefault();
  }

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (window.innerWidth >= 1024) this.sidebarOpen.set(true);
    document.addEventListener('touchstart', this.onTouchStart, { passive: true });
    document.addEventListener('touchend', this.onTouchEnd, { passive: true });
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.removeEventListener('touchstart', this.onTouchStart);
    document.removeEventListener('touchend', this.onTouchEnd);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }

  private onTouchStart = (e: TouchEvent): void => {
    this.swipeStartX = e.touches[0].clientX;
    this.swipeStartY = e.touches[0].clientY;
  };

  private onTouchEnd = (e: TouchEvent): void => {
    const dx = e.changedTouches[0].clientX - this.swipeStartX;
    const dy = e.changedTouches[0].clientY - this.swipeStartY;

    // Only horizontal swipes (dx > dy in magnitude)
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

    if (dx > 0) {
      // Swipe RIGHT → open sidebar (if started from left edge) or close properties
      if (this.swipeStartX < 40) {
        this.sidebarOpen.set(true);
      } else if (this.propertiesOpen()) {
        this.propertiesOpen.set(false);
      }
    } else {
      // Swipe LEFT → close sidebar or open properties (if started from right edge)
      if (this.swipeStartX > window.innerWidth - 40) {
        this.propertiesOpen.set(true);
      } else if (this.sidebarOpen()) {
        this.sidebarOpen.set(false);
      }
    }
  };
}
