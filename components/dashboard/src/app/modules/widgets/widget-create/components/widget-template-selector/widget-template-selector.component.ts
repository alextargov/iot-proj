import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WIDGET_TEMPLATES, TEMPLATE_CATEGORIES, WidgetTemplate } from '../../../../../shared/templates/widget-templates';

@Component({
  standalone: false,
  selector: 'app-widget-template-selector',
  templateUrl: './widget-template-selector.component.html',
  styleUrls: ['./widget-template-selector.component.scss'],
})
export class WidgetTemplateSelectorComponent {
  @Input() selectedTemplate: WidgetTemplate | null = null;
  @Output() templateSelected = new EventEmitter<WidgetTemplate>();

  public templates = WIDGET_TEMPLATES;
  public templateCategories = TEMPLATE_CATEGORIES;

  public selectTemplate(template: WidgetTemplate): void {
    this.selectedTemplate = template;
    this.templateSelected.emit(template);
  }

  public getTemplatesByCategory(categoryId: string): WidgetTemplate[] {
    return this.templates.filter(t => t.category === categoryId);
  }

  public isSelected(template: WidgetTemplate): boolean {
    return this.selectedTemplate?.id === template.id;
  }
}
