import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Api } from '../../core/services/api';

export interface CadastroResponse {
  sucesso: boolean;
  mensagem: string;
}

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [FormsModule, NgIf],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css'
})
export class Cadastro {
  nome = '';
  email = '';
  senha = '';
  confirmarSenha = '';
  aceiteLgpd = false;
  mensagemErro = '';
  mensagemSucesso = '';
  carregando = false;

  constructor(private api: Api, private router: Router) {}

  cadastrar() {
    if (!this.nome || !this.email || !this.senha || !this.confirmarSenha) {
      this.mostrarErro('Preencha todos os campos!');
      return;
    }

    if (this.senha !== this.confirmarSenha) {
      this.mostrarErro('As senhas não coincidem!');
      return;
    }

    if (!this.aceiteLgpd) {
      this.mostrarErro('Você deve aceitar os Termos de Uso e a Política de Privacidade (LGPD)!');
      return;
    }

    this.carregando = true;
    this.mensagemErro = '';
    this.mensagemSucesso = '';

    try {
      const payload = {
        nome: this.nome,
        email: this.email,
        senha: this.senha,
        idAcesso: 'usuario'
      };

      this.api.criar('usuario', payload).subscribe({
        next: (resposta) => {
          this.carregando = false;

          if (resposta.sucesso) {
            this.mostrarSucesso('Cadastro realizado! Voltando ao login...');
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.mostrarErro(resposta.mensagem || 'Erro ao realizar o cadastro.');
          }
        },
        error: (erro) => {
          this.carregando = false;
          this.mostrarErro('Erro de conexão com o servidor.');
        }
      });
    } catch (e) {
      this.carregando = false;
      this.mostrarErro('Ocorreu um erro interno ao processar o cadastro.');
    }
  }

  mostrarErro(mensagem: string) {
    this.mensagemErro = mensagem;
    setTimeout(() => {
      this.mensagemErro = '';
    }, 4000);
  }

  mostrarSucesso(mensagem: string) {
    this.mensagemSucesso = mensagem;
    setTimeout(() => {
      this.mensagemSucesso = '';
    }, 4000);
  }

  voltar() {
    this.router.navigate(['/login']);
  }
}

