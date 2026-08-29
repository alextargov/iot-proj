import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DataModelInfoFragment } from '../../../../../shared/graphql/generated';
import { DatamodelService } from '../../../../../shared/services/datamodel/datamodel.service';
import { SchemaField } from '../../../../../shared/components/schema-node-editor/schema-node-editor.component';
import { Mode, SchemaTypeEnum } from '../../../../datamodel/datamodel-create/datamodel-create.component';

@Component({
  standalone: false,
  selector: 'app-device-datamodel-form',
  templateUrl: './device-datamodel-form.component.html',
  styleUrls: ['./device-datamodel-form.component.scss'],
})
export class DeviceDatamodelFormComponent implements OnInit {
  @Input() initialDataModelId?: string;
  @Output() formReady = new EventEmitter<UntypedFormGroup>();

  public form: UntypedFormGroup;
  public dataModels: DataModelInfoFragment[] = [];
  public filteredDataModels: Observable<DataModelInfoFragment[]>;
  public schema: SchemaField = { type: SchemaTypeEnum.Object, properties: {} };
  public mode: 'ui' | 'code' = 'code';
  public selectedMode: Mode = Mode.CODE;

  public editorOptions = {
    theme: 'vs-dark',
    language: 'json',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    wordWrap: 'on',
    formatOnPaste: true,
    formatOnType: true,
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    folding: true,
    tabSize: 2,
    readOnly: true,
    padding: { top: 10, bottom: 10 },
    scrollbar: { vertical: 'auto', horizontal: 'auto' },
  };

  constructor(
    private fb: UntypedFormBuilder,
    private dataModelService: DatamodelService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      dataModel: [''],
    });

    this.formReady.emit(this.form);

    this.dataModelService.listDataModels().subscribe((data: DataModelInfoFragment[]) => {
      this.dataModels = data;

      this.filteredDataModels = this.form.get('dataModel')!.valueChanges.pipe(
        startWith(''),
        map(dataModel => (dataModel ? this._filterDataModels(dataModel) : this.dataModels.slice()))
      );

      // Pre-select if initialDataModelId provided
      if (this.initialDataModelId) {
        const initial = this.dataModels.find(dm => dm.id === this.initialDataModelId);
        if (initial) {
          this.form.get('dataModel')?.setValue(initial);
          this.schema = JSON.parse(initial.schema);
        }
      }
    });
  }

  public displayDataModel(dataModel: DataModelInfoFragment): string {
    return dataModel && dataModel.name ? dataModel.name : '';
  }

  public onDataModelSelected(event: MatAutocompleteSelectedEvent): void {
    const dataModel = event.option.value as DataModelInfoFragment;
    this.schema = JSON.parse(dataModel.schema);
  }

  public onCodeToggleClick(): void {
    this.mode = Mode.CODE;
  }

  public onUiToggleClick(): void {
    const dataModel = this.form.get('dataModel')?.value as DataModelInfoFragment;
    if (dataModel?.schema) {
      this.schema = JSON.parse(dataModel.schema);
    }
    this.mode = Mode.UI;
  }

  public getSelectedDataModel(): DataModelInfoFragment | null {
    return this.form.get('dataModel')?.value || null;
  }

  public reset(): void {
    this.form.reset();
    this.schema = { type: SchemaTypeEnum.Object, properties: {} };
  }

  private _filterDataModels(value: DataModelInfoFragment | string): DataModelInfoFragment[] {
    const filterValue = typeof value === 'string' ? value.toLowerCase() : value.name?.toLowerCase() || '';
    return this.dataModels.filter(dm => dm.name.toLowerCase().includes(filterValue));
  }
}
