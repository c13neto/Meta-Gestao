import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-guia',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './guia.html',
  styleUrl: './guia.css',
})
export class Guia {
  constructor(private router: Router) {}

  irPara(rota: string) {
    this.router.navigate([rota]);
  }
}
