export interface LoginResponse {
  sucesso: boolean;
  mensagem: string;
  devMsg?: {
    id: string;
    nome: string;
    email: string;
    idAcesso: string;
  };
}
