import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Footerc } from './footerc';

describe('Footerc', () => {
  let component: Footerc;
  let fixture: ComponentFixture<Footerc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footerc],
    }).compileComponents();

    fixture = TestBed.createComponent(Footerc);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
