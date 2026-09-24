import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footerc } from './core/components/footerc/footerc';
import { Headerc } from './core/components/headerc/headerc';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Footerc, Headerc],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
