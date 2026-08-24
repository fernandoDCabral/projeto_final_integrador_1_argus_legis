from .escritorio import EscritorioBase, EscritorioCreate, EscritorioResponse
from .usuario import UsuarioBase, UsuarioCreate, UsuarioResponse
from .cliente import ClienteBase, ClienteCreate, ClienteResponse
from .prazo import PrazoBase, PrazoCreate, PrazoResponse, PrazoUpdate
from .auth import LoginResponse,LoginRequest,LoginUserResponse
from .registro import RegistroEscritorioRequest, RegistroEscritorioResponse
from .processo import ProcessoBase,ProcessoCreate,ProcessoUpdate,ProcessoResponse,ProcessoPrazoMovimentacaoResponse
