import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Footerc } from './core/components/footerc/footerc';
import { Headerc } from './core/components/headerc/headerc';
import { filter } from 'rxjs/operators';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Footerc, Headerc, NgIf],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  mostrarMenu: boolean = false;

  constructor(private router: Router) {
    this.mostrarMenu = !(window.location.pathname.includes('/login') || window.location.pathname.includes('/cadastro'));

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      // Esconder se a URL contiver login ou cadastro
      this.mostrarMenu = !(url.includes('/login') || url.includes('/cadastro'));
    });
  }
}
