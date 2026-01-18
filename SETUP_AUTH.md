# 🔐 Configuración del Sistema de Autenticación

## Requisitos Previos

1. **Supabase Project**: Necesitas tener un proyecto de Supabase configurado
2. **Base de Datos**: Necesitas crear las tablas necesarias en Supabase

## Paso 1: Configurar Variables de Entorno

### 🔑 Dónde Conseguir las API Keys

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Haz clic en **⚙️ Settings** → **🔑 API**
3. Copia las siguientes keys:

   - **Project URL**: `https://tu-proyecto.supabase.co` → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public**: La key larga que empieza con `eyJ...` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: La key larga que empieza con `eyJ...` → `SUPABASE_SERVICE_ROLE_KEY`

   ⚠️ **IMPORTANTE**: 
   - Usa la key **anon public** para `NEXT_PUBLIC_SUPABASE_ANON_KEY` (NO uses service_role en el frontend)
   - La key **service_role** es SECRETA, solo para backend

### 📝 Crear el Archivo .env.local

Crea un archivo `.env.local` en la raíz del proyecto (mismo nivel que `package.json`) con el siguiente contenido:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_EMAIL=Maycolljaramillo01@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ IMPORTANTE**:
- Reemplaza los valores con tus keys reales de Supabase
- NO incluyas espacios antes o después del `=`
- NO pongas comillas alrededor de los valores
- Las keys son MUY largas, asegúrate de copiarlas completas

📖 **Ver guía detallada**: `GUIA_API_KEYS_SUPABASE.md`

## Paso 2: Crear Tabla de Usuarios en Supabase

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);

-- Habilitar Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver su propia información
CREATE POLICY "Users can view own data" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Solo admins pueden ver todos los usuarios
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Solo admins pueden insertar usuarios
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Solo admins pueden actualizar usuarios
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Paso 3: Crear Usuario Admin Inicial

Después de crear la tabla, necesitas crear el usuario admin inicial. Tienes dos opciones:

### Opción A: Desde Supabase Dashboard

1. Ve a Authentication > Users en tu dashboard de Supabase
2. Crea un nuevo usuario con el email: `Maycolljaramillo01@gmail.com`
3. Establece una contraseña temporal
4. Ejecuta este SQL para crear el registro en la tabla `users`:

```sql
-- Reemplaza 'USER_ID_FROM_AUTH' con el ID del usuario que acabas de crear
INSERT INTO users (id, email, role, approved)
VALUES (
  'USER_ID_FROM_AUTH',
  'Maycolljaramillo01@gmail.com',
  'admin',
  true  
);
```

### Opción B: Desde la Aplicación (Primera vez)

1. Inicia la aplicación
2. Ve a `/login`
3. Usa el email admin para iniciar sesión
4. El sistema creará automáticamente el registro en la tabla `users` con rol admin

## Paso 4: Configurar Notificaciones (Opcional)

### Opción 1: Email Notifications (Recomendado para empezar)

Para enviar notificaciones por email cuando alguien intente loguearse, puedes usar:

**Con Resend:**
```bash
npm install resend
```

Luego actualiza `lib/auth-notifications.ts` para usar Resend.

**Con SendGrid:**
```bash
npm install @sendgrid/mail
```

### Opción 2: Microsoft Graph API (Para Microsoft Authenticator)

Para usar notificaciones push a Microsoft Authenticator, necesitas:

1. Registrar una aplicación en Azure AD
2. Obtener un token de Microsoft Graph API
3. Configurar `MICROSOFT_GRAPH_TOKEN` en `.env.local`

## Paso 5: Probar el Sistema

1. Inicia el servidor de desarrollo: `npm run dev`
2. Ve a `http://localhost:3000/login`
3. Inicia sesión con el email admin
4. Ve a `/admin` para gestionar usuarios
5. Crea un nuevo usuario desde el panel de admin
6. Intenta iniciar sesión con el nuevo usuario (deberías ver la solicitud pendiente)

## Funcionalidades Implementadas

✅ Sistema de autenticación con Supabase
✅ Middleware de protección de rutas
✅ Página de login
✅ Página de aprobación pendiente
✅ Panel de administración
✅ Creación de usuarios (admin only)
✅ Aprobación de usuarios
✅ Notificaciones de solicitudes de login
✅ Sistema de roles (admin/user)

## Notas Importantes

- El email del admin está configurado en la variable de entorno `ADMIN_EMAIL`
- Los usuarios nuevos requieren aprobación del admin antes de poder acceder
- El admin puede crear usuarios directamente desde el panel
- Las notificaciones de login se envían al email del admin
- El sistema usa Row Level Security (RLS) en Supabase para seguridad adicional

## Troubleshooting

### Error: "Supabase client is not configured"
- Verifica que todas las variables de entorno estén configuradas en `.env.local`
- Reinicia el servidor de desarrollo después de agregar variables de entorno

### Error: "Unauthorized" al acceder a `/admin`
- Verifica que tu usuario tenga el rol `admin` en la tabla `users`
- Verifica que el email coincida exactamente con `ADMIN_EMAIL`

### Los usuarios no aparecen en la tabla
- Verifica que la tabla `users` esté creada correctamente
- Verifica que RLS esté configurado correctamente
- Verifica que el usuario tenga permisos de admin

