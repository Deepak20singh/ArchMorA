import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphService } from '../../services/graph.service';
import { ServiceNode } from '../../models/service.model';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './properties-panel.component.html',
  styleUrls: ['./properties-panel.component.scss'],
})
export class PropertiesPanelComponent {
  private graphService = inject(GraphService);

  readonly selectedNode = this.graphService.selectedNode;

  // Editable copy — only created when a node is selected
  editNode: ServiceNode | null = null;

  readonly hasSelection = computed(() => this.selectedNode() !== null);

  ngDoCheck(): void {
    const current = this.selectedNode();
    if (current && current.id !== this.editNode?.id) {
      this.editNode = { ...current };
    } else if (!current) {
      this.editNode = null;
    }
  }

  save(): void {
    if (this.editNode) {
      this.graphService.updateNode({ ...this.editNode });
    }
  }
}
