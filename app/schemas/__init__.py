from .escritorio import EscritorioBase, EscritorioCreate, EscritorioResponse
from .usuario import UsuarioBase, UsuarioCreate, UsuarioResponse
from .cliente import ClienteBase, ClienteCreate, ClienteUpdate, ClienteResponse, TipoPessoa
from .prazo import PrazoBase, PrazoCreate, PrazoResponse, PrazoUpdate
from .auth import LoginResponse,LoginRequest,LoginUserResponse
from .registro import RegistroEscritorioRequest, RegistroEscritorioResponse
from .recuperacao import (
    EsqueciSenhaRequest,
    MensagemResponse,
    TokenValidoResponse,
    RedefinirSenhaRequest,
)
from .datajud import MovimentacaoDatajud, ConsultaDatajudResponse
from .documento import DocumentoResponse
from .cep import ConsultaCepResponse
from .processo import ProcessoBase,ProcessoCreate,ProcessoUpdate,ProcessoResponse,AtualizacaoDjenResponse
