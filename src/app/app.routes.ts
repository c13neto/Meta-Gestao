import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Cadastro } from './pages/cadastro/cadastro';
import { Criterios } from './pages/criterios/criterios';
import { Lista } from './pages/lista/lista';
import { Dashboard } from './pages/dashboard/dashboard';
import { Guia } from './pages/guia/guia';
import { AuthGuard } from './core/services/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'cadastro', component: Cadastro },
  { path: 'criterios', component: Criterios, canActivate: [AuthGuard] },
  { path: 'lista', component: Lista, canActivate: [AuthGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [AuthGuard] },
  { path: 'guia', component: Guia, canActivate: [AuthGuard] },
  { path: '**', redirectTo: 'login' }
];
