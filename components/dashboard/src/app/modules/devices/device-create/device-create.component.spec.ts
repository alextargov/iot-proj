import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceCreateComponent } from './device-create.component';

describe('DeviceCreateComponent', () => {
  let component: DeviceCreateComponent;
  let fixture: ComponentFixture<DeviceCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DeviceCreateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DeviceCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
