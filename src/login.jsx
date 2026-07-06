import { useForm } from 'react-hook-form';
import axios from 'axios'
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from './config';

function Login({ onLogin }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();
  const alEnviar = async (datos) => {
    try {
      const respuesta = await axios.post(getApiUrl('/api/login'), datos)
      const { cargo, token } = respuesta.data
      localStorage.setItem('token', token)
      localStorage.setItem('cargo', cargo)
      if (onLogin) onLogin(token)
      navigate('/')
    } catch (error) {
      const mensajeError = error.response?.data?.error || "Error en la contraseña o usuario"
      alert(`${mensajeError}`)
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🔐</div>
          <h1>Iniciar Sesión</h1>
          <p>Ingresá tus credenciales para acceder al panel</p>
        </div>
        <form onSubmit={handleSubmit(alEnviar)} className="login-form">
          <div className="login-field">
            <label htmlFor="usuario">Usuario</label>
            <input
              type="text"
              id="usuario"
              placeholder="Ej: JOEL_BENITEZ"
              {...register('usuario', { required: 'El usuario es obligatorio' })}
            />
            {errors.usuario && <span className="login-error">{errors.usuario.message}</span>}
          </div>
          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              placeholder="••••••••"
              {...register('password', { required: 'La contraseña es obligatoria' })}
            />
            {errors.password && <span className="login-error">{errors.password.message}</span>}
          </div>
          <button type="submit" className="login-btn">
            Ingresar al Sistema
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login;
