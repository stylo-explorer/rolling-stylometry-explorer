import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MfwSelectionComponent } from './mfw-selection.component';

describe('MfwSelectionComponent', () => {
  let component: MfwSelectionComponent;
  let fixture: ComponentFixture<MfwSelectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MfwSelectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MfwSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
