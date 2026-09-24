import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgFor, NgIf, NgClass, NgStyle } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Api } from '../../core/services/api';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ApiResponse {
  sucesso: boolean;
  mensagem: string;
  devMsg: any; 
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, NgStyle, LucideAngularModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  @ViewChild('carousel') carousel!: ElementRef;

  pontuacaoTotal: number = 0;
  heatmapData: any[] = [];
  carregando: boolean = true;
  
  totalTarefas: number = 0;
  tarefasConcluidas: number = 0;
  tarefasPendentes: number = 0;
  resumoCategorias: { nome: string; count: number }[] = [];

  constructor(private api: Api) {}

  get pontuacaoFormatada(): string {
    return this.pontuacaoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  ngOnInit() {
    this.carregarDados();
  }

  carregarDados() {
    this.carregando = true;

    forkJoin({
      conclusoes: this.api.listar('conclusao').pipe(catchError(() => of({ sucesso: true, devMsg: [] }))),
      tarefas: this.api.listar('tarefa').pipe(catchError(() => of({ sucesso: true, devMsg: [] }))),
      categorias: this.api.listar('categoria').pipe(catchError(() => of({ sucesso: true, devMsg: [] }))),
      status: this.api.listar('status').pipe(catchError(() => of({ sucesso: true, devMsg: [] })))
    }).subscribe({
      next: (res: any) => {
        this.carregando = false;
        this.processarDados(
          res.conclusoes.devMsg || [],
          res.tarefas.devMsg || [],
          res.categorias.devMsg || [],
          res.status.devMsg || []
        );
      },
      error: () => {
        this.carregando = false;
      }
    });
  }

  processarDados(conclusoes: any[], tarefas: any[], categorias: any[], statusList: any[]) {
    const tarefasAtivas = tarefas.filter(t => t.ATIVO !== false && t.ativo !== false);
    this.totalTarefas = tarefasAtivas.length;

    const completedStatusIds = statusList
       .filter(s => {
          const name = (s.NOME || s.nome || '').toLowerCase();
          return name.includes('concluíd') || name.includes('finalizad') || name.includes('pront') || name.includes('feit');
       })
       .map(s => String(s.UUID || s.id));
       
    const tarefasConcluidasList = tarefasAtivas.filter(t => {
      if (t.CONCLUIDA || t.concluida) return true;
      const sId = String(t['UUID STATUS'] || t.status_id || t.STATUS || '');
      return completedStatusIds.includes(sId) || sId.toLowerCase().includes('concluíd') || sId.toLowerCase().includes('finaliz');
    });

    this.tarefasConcluidas = tarefasConcluidasList.length;
    this.tarefasPendentes = this.totalTarefas - this.tarefasConcluidas;

    // 1. Process Conclusoes and Points
    this.pontuacaoTotal = 0;
    const pontosPorDia: { [data: string]: number } = {};
    const hojeData = new Date().toISOString().split('T')[0];

    const conclusoesAtivas = conclusoes.filter(item => item.ATIVO !== false && item.ativo !== false);

    tarefasConcluidasList.forEach(t => {
      const tId = String(t.UUID || t.id || t.ID || '');
      // Find the latest active conclusion for this task
      const conclusao = conclusoesAtivas.find(c => String(c.idTarefa || c.ID_TAREFA) === tId);
      
      let pontos = 10;
      let dataStr = hojeData;

      if (conclusao) {
        // Fallback for points parsing. If string, it is handled gracefully by Number(). If it fails, fallback to 0.
        const parsedPoints = Number(conclusao.PONTOS !== undefined ? conclusao.PONTOS : conclusao.pontos);
        pontos = !isNaN(parsedPoints) ? parsedPoints : 0;
        
        const h = conclusao.HORARIO || conclusao.horario;
        if (h) {
          dataStr = new Date(h).toISOString().split('T')[0];
        }
      }

      this.pontuacaoTotal += pontos;
      pontosPorDia[dataStr] = (pontosPorDia[dataStr] || 0) + pontos;
    });

    // 2. Generate Heatmap
    this.heatmapData = [];
    const hoje = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);
      const dataFormatada = d.toISOString().split('T')[0];
      const pontosDoDia = pontosPorDia[dataFormatada] || 0;
      
      let valorIntensidade = 0;
      if (pontosDoDia > 0 && pontosDoDia <= 10) valorIntensidade = 1;
      else if (pontosDoDia > 10 && pontosDoDia <= 30) valorIntensidade = 2;
      else if (pontosDoDia > 30 && pontosDoDia <= 60) valorIntensidade = 3;
      else if (pontosDoDia > 60) valorIntensidade = 4;

      this.heatmapData.push({
        data: dataFormatada,
        valor: valorIntensidade,
        pontos: pontosDoDia,
        cor: this.getCorPorValor(valorIntensidade)
      });
    }

    // 3. Process Categories
    const catMap = new Map<string, number>();
    tarefasAtivas.forEach(t => {
      const cId = t['UUID CATEGORIA'] || t.categoria_id || t.CATEGORIA;
      if (cId) {
        catMap.set(cId, (catMap.get(cId) || 0) + 1);
      }
    });

    this.resumoCategorias = [];
    catMap.forEach((count, cId) => {
      const catObj = categorias.find(c => (c.UUID || c.id) === cId || c.NOME === cId);
      const nome = catObj ? (catObj.NOME || catObj.nome) : cId;
      this.resumoCategorias.push({ nome, count });
    });
    this.resumoCategorias.sort((a, b) => b.count - a.count);
  }

  getCorPorValor(valor: number): string {
    switch(valor) {
      case 0: return '#ebedf0'; 
      case 1: return '#c6e48b'; 
      case 2: return '#7bc96f'; 
      case 3: return '#239a3b'; 
      case 4: return '#196127'; 
      default: return '#ebedf0';
    }
  }

  scrollCarousel(direction: number) {
    if (this.carousel) {
      const el = this.carousel.nativeElement;
      const containerWidth = el.clientWidth;
      const scrollWidth = el.scrollWidth;
      const currentScroll = el.scrollLeft;
      const maxScroll = scrollWidth - containerWidth;
      const step = containerWidth + 30;

      if (direction === 1) {
        if (Math.ceil(currentScroll) >= maxScroll - 5) {
          el.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: step, behavior: 'smooth' });
        }
      } else {
        if (currentScroll <= 5) {
          el.scrollTo({ left: maxScroll, behavior: 'smooth' });
        } else {
          el.scrollBy({ left: -step, behavior: 'smooth' });
        }
      }
    }
  }
}
