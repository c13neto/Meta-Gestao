import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Criterios } from './pages/criterios/criterios';
import { Lista } from './pages/lista/lista';
import { Dashboard } from './pages/dashboard/dashboard';
import { AuthGuard } from './core/services/auth-guard';
import { Footerc } from './core/components/footerc/footerc';
import { Headerc } from './core/components/headerc/headerc';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'footer', component: Footerc },
  { path: 'header', component: Headerc, canActivate:[AuthGuard] },
  { path: 'criterios', component: Criterios, canActivate:[AuthGuard]},
  { path: 'lista', component: Lista, canActivate:[AuthGuard] },
  { path: 'dashboard', component: Dashboard, canActivate:[AuthGuard] }
];
