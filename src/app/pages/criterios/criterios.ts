import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Api } from '../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PesoAval {
  id?: string;
  peso: string | number;
  aval: string | number;
  _editPeso?: boolean;
  _editAval?: boolean;
  _origPeso?: string | number;
  _origAval?: string | number;
}

export interface Criterio {
  id?: string;
  nome: string;
  tipo: string;
  pesos: PesoAval[];
  editando?: boolean;
  pesosRemovidos?: string[];
  _editField?: 'nome' | 'tipo' | null;
  _origVal?: string;
}

@Component({
  selector: 'app-criterios',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, FormsModule, LucideAngularModule],
  templateUrl: './criterios.html',
  styleUrl: './criterios.css',
})
export class Criterios implements OnInit {
  
  criteriosSalvos: Criterio[] = [];
  
  novoCriterio: Criterio = {
    nome: '',
    tipo: 'cinco',
    pesos: []
  };

  carregando: boolean = false;
  mensagemPopup: string = '';
  popupSucesso: boolean = false;
  
  constructor(private api: Api) {}

  ngOnInit() {
    this.onTipoChange();
    this.carregarCriterios();
  }

  onTipoChange() {
    this.novoCriterio.pesos = [];
    if (this.novoCriterio.tipo === 'cinco') {
      for (let i = 0; i <= 5; i++) {
        this.novoCriterio.pesos.push({ peso: i, aval: '' });
      }
    } else if (this.novoCriterio.tipo === 'dez') {
      for (let i = 0; i <= 10; i++) {
        this.novoCriterio.pesos.push({ peso: i, aval: '' });
      }
    } else if (this.novoCriterio.tipo === 'mais') {
      this.novoCriterio.pesos.push({ peso: '', aval: '' });
    }
  }

  adicionarMaisPeso() {
    if (this.novoCriterio.tipo === 'mais') {
      this.novoCriterio.pesos.push({ peso: '', aval: '' });
    }
  }

  removerPesoNovo(index: number) {
    this.novoCriterio.pesos.splice(index, 1);
  }

  onEditTipoChange(crit: Criterio) {
    if (!crit.pesosRemovidos) crit.pesosRemovidos = [];
    crit.pesos.forEach(p => { if (p.id) crit.pesosRemovidos!.push(p.id); });
    crit.pesos = [];
    if (crit.tipo === 'cinco') {
      for (let i = 0; i <= 5; i++) {
        crit.pesos.push({ peso: i, aval: '' });
      }
    } else if (crit.tipo === 'dez') {
      for (let i = 0; i <= 10; i++) {
        crit.pesos.push({ peso: i, aval: '' });
      }
    } else if (crit.tipo === 'mais') {
      crit.pesos.push({ peso: '', aval: '' });
    }
  }

  adicionarMaisPesoEdit(crit: Criterio) {
    if (crit.tipo === 'mais') {
      crit.pesos.push({ peso: '', aval: '' });
    }
  }

  removerPeso(crit: Criterio, index: number) {
    const removido = crit.pesos.splice(index, 1)[0];
    if (removido.id) {
      if (!crit.pesosRemovidos) crit.pesosRemovidos = [];
      crit.pesosRemovidos.push(removido.id);
    }
  }

  carregarCriterios() {
    this.carregando = true;
    forkJoin({
      criterios: this.api.listar('criterio'),
      opcoes: this.api.listar('criterioOpcoes').pipe(catchError(() => of({ sucesso: true, devMsg: [] })))
    }).subscribe({
      next: ({ criterios, opcoes }) => {
        this.carregando = false;
        if (criterios.sucesso && Array.isArray(criterios.devMsg)) {
          const opcoesList = (opcoes.sucesso && Array.isArray(opcoes.devMsg)) ? opcoes.devMsg : [];
          
          this.criteriosSalvos = criterios.devMsg.map((c: any) => {
            const critId = c.UUID || c.id;
            const critOpcoes = opcoesList.filter((o: any) => 
              o['UUID CRITERIO'] === critId || o.criterio_id === critId || o.ID_CRITERIO === critId || o['ID CRITERIO'] === critId
            );
            
            let pesos = [];
            if (critOpcoes.length > 0) {
              pesos = critOpcoes.map((o: any) => ({
                id: o.UUID || o.id,
                peso: (o.PESO !== undefined && o.PESO !== null) ? o.PESO : ((o.peso !== undefined && o.peso !== null) ? o.peso : 0),
                aval: o.AVALIACAO || o.avaliacao || o.TEXTO || o.texto || o.AVAL || o.aval || ''
              }));
            } else {
              try {
                pesos = typeof c.PESOS === 'string' ? JSON.parse(c.PESOS) : (c.PESOS || c.pesos || []);
                if (!Array.isArray(pesos)) pesos = [];
              } catch {
                pesos = [];
              }
            }

            return {
              id: critId,
              nome: c.TEXTO || c.nome || c.NOME || '',
              tipo: c.TIPO || c.tipo || c['UUID TIPO'] || 'cinco',
              pesos: pesos,
              editando: false,
              pesosRemovidos: []
            };
          }).filter((c: any) => c.nome !== '');
        }
      },
      error: () => this.carregando = false
    });
  }

  salvarCriterio() {
    const nomeLimpo = this.novoCriterio.nome.trim();
    if (!nomeLimpo) {
      this.mostrarPopup('Preencha o nome do critério!', false);
      return;
    }

    const pesoInvalido = this.novoCriterio.pesos.some(
      p => String(p.peso).trim() === '' || isNaN(Number(p.peso))
    );
    if (pesoInvalido) {
      this.mostrarPopup('Todos os pesos devem ser números válidos!', false);
      return;
    }

    this.carregando = true;
    this.novoCriterio.nome = nomeLimpo;

    this.api.criar('criterio', {
      NOME: this.novoCriterio.nome,
      TIPO: this.novoCriterio.tipo,
      PESOS: JSON.stringify(this.novoCriterio.pesos)
    }).subscribe({
      next: (res) => {
        if (res.sucesso) {
          const idCriado = res.devMsg?.UUID || res.devMsg?.id;
          
          if (this.novoCriterio.pesos.length > 0 && idCriado) {
            const obsList = this.novoCriterio.pesos.map(p => 
              this.api.criar('criterioOpcoes', { "UUID CRITERIO": idCriado, PESO: p.peso, AVALIACAO: p.aval })
            );
            
            forkJoin(obsList).subscribe({
              next: () => {
                this.mostrarPopup('Critério e opções salvos!', true);
                this.novoCriterio.nome = '';
                this.onTipoChange();
                this.carregarCriterios();
              },
              error: () => {
                this.carregando = false;
                this.mostrarPopup('Critério salvo, erro nas opções.', false);
              }
            });
          } else {
            this.mostrarPopup(res.mensagem || 'Critério salvo com sucesso!', true);
            this.novoCriterio.nome = '';
            this.onTipoChange();
            this.carregarCriterios();
          }
        } else {
          this.carregando = false;
          this.mostrarPopup(res.mensagem || 'Erro ao salvar.', false);
        }
      },
      error: () => {
        this.carregando = false;
        this.mostrarPopup('Erro de conexão com o servidor.', false);
      }
    });
  }

  atualizarCriterio(crit: Criterio) {
    if (!crit.editando) {
      crit.editando = true;
      return;
    }

    const nomeLimpo = crit.nome.trim();
    if (!nomeLimpo) {
      this.mostrarPopup('O nome do critério não pode ficar vazio!', false);
      return;
    }

    const pesoInvalido = crit.pesos.some(
      p => String(p.peso).trim() === '' || isNaN(Number(p.peso))
    );
    if (pesoInvalido) {
      this.mostrarPopup('Todos os pesos devem ser números válidos!', false);
      return;
    }

    crit.nome = nomeLimpo;
    this.carregando = true;
    
    const obsList: any[] = [];
    
    obsList.push(this.api.atualizar('criterio', crit.id!, {
      NOME: crit.nome,
      TIPO: crit.tipo,
      PESOS: JSON.stringify(crit.pesos)
    }));

    crit.pesos.forEach((p: any) => {
      if (p.id) {
        obsList.push(this.api.atualizar('criterioOpcoes', p.id, { PESO: p.peso, AVALIACAO: p.aval }));
      } else {
        obsList.push(this.api.criar('criterioOpcoes', { "UUID CRITERIO": crit.id, PESO: p.peso, AVALIACAO: p.aval }));
      }
    });

    if (crit.pesosRemovidos && crit.pesosRemovidos.length > 0) {
      crit.pesosRemovidos.forEach(id => {
        obsList.push(this.api.deletar('criterioOpcoes', id).pipe(catchError(() => of({}))));
      });
      crit.pesosRemovidos = [];
    }

    forkJoin(obsList).subscribe({
      next: () => {
        this.carregando = false;
        crit.editando = false;
        this.mostrarPopup('Critério atualizado!', true);
        this.carregarCriterios();
      },
      error: () => {
        this.carregando = false;
        this.mostrarPopup('Erro ao atualizar.', false);
      }
    });
  }

  ativarEdicaoCritCampo(crit: Criterio, campo: 'nome' | 'tipo', event?: Event) {
    if (crit.editando || this.carregando) return;
    crit._editField = campo;
    crit._origVal = crit[campo];
    if (event) {
      const el = event.currentTarget as HTMLElement;
      setTimeout(() => {
        const input = el?.querySelector('input, select') as HTMLElement;
        input?.focus();
      }, 20);
    }
  }

  salvarCritCampoIndividual(crit: Criterio, campo: 'nome' | 'tipo') {
    if (crit.editando || crit._editField !== campo) return;
    const orig = crit._origVal || '';
    crit._editField = null;

    if (campo === 'nome') {
      const limpo = crit.nome.trim();
      if (!limpo) {
        crit.nome = orig;
        this.mostrarPopup('O nome do critério não pode ficar vazio!', false);
        return;
      }
      if (limpo === orig) return;
      crit.nome = limpo;
      this.api.atualizar('criterio', crit.id!, {
        NOME: crit.nome,
        TIPO: crit.tipo,
        PESOS: JSON.stringify(crit.pesos)
      }).subscribe(() => {
        this.mostrarPopup('Nome do critério atualizado!', true);
      });
    } else if (campo === 'tipo') {
      if (crit.tipo === orig) return;
      this.onEditTipoChange(crit);
      crit.editando = true;
      this.atualizarCriterio(crit);
    }
  }

  ativarEdicaoPesoAval(crit: Criterio, p: PesoAval, subcampo: 'peso' | 'aval', event?: Event) {
    if (crit.editando || this.carregando) return;
    if (subcampo === 'peso' && crit.tipo !== 'mais') return;
    if (subcampo === 'peso') {
      p._editPeso = true;
      p._origPeso = p.peso;
    } else {
      p._editAval = true;
      p._origAval = p.aval;
    }
    if (event) {
      const el = event.currentTarget as HTMLElement;
      setTimeout(() => {
        const input = el?.querySelector('input') as HTMLElement;
        input?.focus();
      }, 20);
    }
  }

  salvarPesoAvalIndividual(crit: Criterio, p: PesoAval, subcampo: 'peso' | 'aval') {
    if (crit.editando) return;
    if (subcampo === 'peso') {
      if (!p._editPeso) return;
      p._editPeso = false;
      if (String(p.peso).trim() === '' || isNaN(Number(p.peso))) {
        p.peso = p._origPeso ?? 0;
        this.mostrarPopup('O peso deve ser um número válido!', false);
        return;
      }
      if (p.peso === p._origPeso) return;
    } else {
      if (!p._editAval) return;
      p._editAval = false;
      if (p.aval === p._origAval) return;
    }

    const obsList: any[] = [
      this.api.atualizar('criterio', crit.id!, {
        NOME: crit.nome,
        TIPO: crit.tipo,
        PESOS: JSON.stringify(crit.pesos)
      })
    ];
    if (p.id) {
      obsList.push(this.api.atualizar('criterioOpcoes', p.id, { PESO: p.peso, AVALIACAO: p.aval }));
    }
    forkJoin(obsList).subscribe(() => {
      this.mostrarPopup('Opção atualizada!', true);
    });
  }

  deletarCriterio(crit: Criterio) {
    if (!confirm('Deseja excluir este critério?')) return;
    this.carregando = true;

    this.api.deletar('criterio', crit.id!).subscribe({
      next: (res) => {
        if (res.sucesso) {
          this.mostrarPopup('Critério excluído!', true);
          this.carregarCriterios();
        } else {
          this.carregando = false;
          this.mostrarPopup(res.mensagem || 'Erro ao excluir.', false);
        }
      },
      error: () => {
        this.carregando = false;
        this.mostrarPopup('Erro de conexão.', false);
      }
    });
  }

  mostrarPopup(mensagem: string, sucesso: boolean = true) {
    this.mensagemPopup = mensagem;
    this.popupSucesso = sucesso;
    setTimeout(() => {
      this.mensagemPopup = '';
    }, 4000);
  }
}
