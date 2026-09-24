import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Api } from '../../core/services/api';

export interface LoginDevMsg {
  id: string;
  nome: string;
  email: string;
  idAcesso: string;
  nomeAcesso?: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  email = '';
  senha = '';
  mensagemErro = '';
  carregando = false;

  constructor(private api: Api, private router: Router) {}

  entrar() {
    if (!this.email || !this.senha) {
      this.mostrarErro('Preencha todos os campos!');
      return;
    }

    this.carregando = true;
    this.mensagemErro = '';

    try {
      const query = `action=login&email=${encodeURIComponent(this.email)}&senha=${encodeURIComponent(this.senha)}`;

      this.api.getCustom<LoginDevMsg>(query).subscribe({
        next: (resposta) => {
          this.carregando = false;

          if (resposta.sucesso && resposta.devMsg) {
            localStorage.setItem('usuarioId', resposta.devMsg.id);
            localStorage.setItem('usuarioNome', (resposta.devMsg.nome || '').replace(/\.$/, '').trim());
            localStorage.setItem('usuarioEmail', resposta.devMsg.email);
            localStorage.setItem('usuarioAcesso', (resposta.devMsg.nomeAcesso || resposta.devMsg.idAcesso || 'Testador').replace(/\.$/, '').trim());
            this.router.navigate(['/dashboard']);
          } else {
            this.mostrarErro(resposta.mensagem || 'E-mail ou senha incorretos.');
          }
        },
        error: (erro) => {
          this.carregando = false;
          this.mostrarErro('Erro de conexão com o servidor.');
        }
      });
    } catch (e) {
      this.carregando = false;
      this.mostrarErro('Ocorreu um erro interno ao processar o login.');
    }
  }

  mostrarErro(mensagem: string) {
    this.mensagemErro = mensagem;
    setTimeout(() => {
      this.mensagemErro = '';
    }, 4000);
  }


  cadastrar() {
    this.router.navigate(['/cadastro']);
  }
}
