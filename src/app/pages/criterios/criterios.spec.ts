import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Criterios } from './criterios';

describe('Criterios', () => {
  let component: Criterios;
  let fixture: ComponentFixture<Criterios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Criterios]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Criterios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
