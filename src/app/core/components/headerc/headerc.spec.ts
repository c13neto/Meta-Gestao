import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Headerc } from './headerc';

describe('Headerc', () => {
  let component: Headerc;
  let fixture: ComponentFixture<Headerc>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Headerc],
    }).compileComponents();

    fixture = TestBed.createComponent(Headerc);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
