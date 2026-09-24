import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Api } from '../../services/api';
import { SHARED_IMPORTS } from '../../shared/icons/icons';
import { filter } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-headerc',
  standalone: true,
  imports: [SHARED_IMPORTS, FormsModule, NgIf],
  templateUrl: './headerc.html',
  styleUrl: './headerc.css',
})
export class Headerc implements OnInit {
  userName: string = 'Testador';
  editUserName: string = '';
  userEmail: string = '';
  userAcesso: string = 'Usuário';
  currentPath: string = '/lista';
  isProfileModalOpen: boolean = false;
  isDropdownOpen: boolean = false;

  constructor(private router: Router, private api: Api) {
    const currentUrl = this.router.url;
    if (currentUrl.includes('/dashboard')) this.currentPath = '/dashboard';
    else if (currentUrl.includes('/criterios')) this.currentPath = '/criterios';
    else if (currentUrl.includes('/lista')) this.currentPath = '/lista';
    else if (currentUrl.includes('/configuracoes')) this.currentPath = '/configuracoes';

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url;
      if (url.includes('/dashboard')) this.currentPath = '/dashboard';
      else if (url.includes('/criterios')) this.currentPath = '/criterios';
      else if (url.includes('/lista')) this.currentPath = '/lista';
      else if (url.includes('/configuracoes')) this.currentPath = '/configuracoes';
    });
  }

  ngOnInit() {
    const storedName = localStorage.getItem('usuarioNome');
    if (storedName) this.userName = storedName.replace(/\.$/, '').trim();
    
    const storedEmail = localStorage.getItem('usuarioEmail');
    if (storedEmail) this.userEmail = storedEmail;
    
    const storedAcesso = localStorage.getItem('usuarioAcesso');
    if (storedAcesso) {
      let rawAcesso = storedAcesso.replace(/\.$/, '').trim();
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawAcesso);
      const isNumber = !isNaN(Number(rawAcesso));
      
      if (isUUID || isNumber) {
        this.userAcesso = 'Usuário';
      } else {
        this.userAcesso = rawAcesso;
      }
    }
  }

  toggleProfileModal() {
    if (!this.isProfileModalOpen) {
      this.editUserName = this.userName;
    }
    this.isProfileModalOpen = !this.isProfileModalOpen;
  }

  closeProfileModal(event?: Event) {
    if (event) {
      if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
        this.isProfileModalOpen = false;
      }
    } else {
      this.isProfileModalOpen = false;
    }
  }

  saveProfile() {
    this.userName = this.editUserName;
    localStorage.setItem('usuarioNome', this.userName);
    const userId = localStorage.getItem('usuarioId');
    
    if (userId) {
      this.api.atualizar('usuario', userId, { nome: this.userName }).subscribe();
    }

    this.isProfileModalOpen = false;
  }

  logout() {
    localStorage.clear();
    window.location.href = '/login';
  }

  navigateToRoute(route: string) {
    if (route) {
      this.router.navigate([route]);
      this.isDropdownOpen = false;
    }
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown() {
    setTimeout(() => this.isDropdownOpen = false, 150);
  }

  getPathName(path: string): string {
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/criterios')) return 'Critérios';
    if (path.includes('/lista')) return 'Lista de Tarefas';
    if (path.includes('/configuracoes')) return 'Configurações';
    return 'Menu';
  }
}
