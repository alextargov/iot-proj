import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SCHEDULE_PRESETS, SchedulePreset } from '../../../../../shared/constants/schedule-presets';

@Component({
  standalone: false,
  selector: 'app-widget-schedule-form',
  templateUrl: './widget-schedule-form.component.html',
  styleUrls: ['./widget-schedule-form.component.scss'],
})
export class WidgetScheduleFormComponent implements OnInit {
  @Input() initialSchedule?: string;
  @Output() scheduleChange = new EventEmitter<string | null>();

  public schedulePresets = SCHEDULE_PRESETS;
  public selectedPreset: SchedulePreset | null = null;
  public customSchedule: string = '';
  public enableScheduling: boolean = false;

  ngOnInit(): void {
    if (this.initialSchedule) {
      this.enableScheduling = true;
      const preset = SCHEDULE_PRESETS.find(p => p.value === this.initialSchedule);
      if (preset) {
        this.selectedPreset = preset;
      } else {
        this.selectedPreset = SCHEDULE_PRESETS.find(p => p.value === 'custom') || null;
        this.customSchedule = this.initialSchedule;
      }
    }
  }

  public onEnableChange(): void {
    this.emitSchedule();
  }

  public onPresetChange(preset: SchedulePreset): void {
    this.selectedPreset = preset;
    this.emitSchedule();
  }

  public onCustomScheduleChange(): void {
    this.emitSchedule();
  }

  public getScheduleValue(): string | null {
    if (!this.enableScheduling) return null;
    if (this.selectedPreset?.value === 'custom') {
      return this.customSchedule || null;
    }
    return this.selectedPreset?.value || null;
  }

  public reset(): void {
    this.enableScheduling = false;
    this.selectedPreset = null;
    this.customSchedule = '';
  }

  private emitSchedule(): void {
    this.scheduleChange.emit(this.getScheduleValue());
  }
}
