# 🔑 Guía: Dónde Conseguir las API Keys de Supabase

## El Error que Estás Viendo

```
Failed to load resource: the server responded with a status of 401
jlykjtgzdtdzrtmkdxrs.supabase.co/auth/v1/token?grant_type=password
```

Este error significa que la **API Key Anónima (anon key)** es inválida o no está configurada correctamente.

---

## 📍 Paso 1: Acceder a tu Proyecto de Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto (o crea uno nuevo si no tienes)

---

## 🔑 Paso 2: Encontrar las API Keys

### Opción A: Desde Settings (Recomendado)

1. En el menú lateral izquierdo, haz clic en **⚙️ Settings** (Configuración)
2. Luego haz clic en **🔑 API** (en el submenú de Settings)
3. Verás una página con todas tus API keys

### Opción B: Desde Project Settings

1. Haz clic en el ícono de **⚙️ Settings** en la parte inferior izquierda
2. Selecciona **Project Settings**
3. Ve a la sección **API**

---

## 📋 Paso 3: Copiar las Keys Necesarias

En la página de API Settings verás varias secciones:

### 1. **Project URL** (URL del Proyecto)
```
https://jlykjtgzdtdzrtmkdxrs.supabase.co
```
Esta es tu `NEXT_PUBLIC_SUPABASE_URL`

### 2. **anon public** key (Clave Pública Anónima)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imps...
```
Esta es tu `NEXT_PUBLIC_SUPABASE_ANON_KEY` ⚠️ **Esta es la que necesitas para el login**

### 3. **service_role** key (Clave de Rol de Servicio)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imps...
```
Esta es tu `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **MANTÉN ESTA SECRETA - Solo para backend**

---

## 📝 Paso 4: Configurar el Archivo .env.local

Crea o edita el archivo `.env.local` en la raíz de tu proyecto con este formato:

```env
# URL de tu proyecto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jlykjtgzdtdzrtmkdxrs.supabase.co

# Clave pública anónima (para el frontend/login)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imps...

# Clave de servicio (SOLO para backend, NUNCA la expongas al frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imps...

# Email del administrador
ADMIN_EMAIL=Maycolljaramillo01@gmail.com

# URL de la aplicación
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### ⚠️ IMPORTANTE:
- **NO** incluyas espacios antes o después del `=`
- **NO** pongas comillas alrededor de los valores
- **NO** compartas el archivo `.env.local` (está en `.gitignore`)

---

## 🔍 Paso 5: Verificar que las Keys Están Correctas

### Verificación Rápida:

1. **Project URL**: Debe empezar con `https://` y terminar con `.supabase.co`
   ```
   ✅ Correcto: https://jlykjtgzdtdzrtmkdxrs.supabase.co
   ❌ Incorrecto: jlykjtgzdtdzrtmkdxrs.supabase.co (falta https://)
   ```

2. **Anon Key**: Debe ser una cadena larga que empiece con `eyJ`
   ```
   ✅ Correcto: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ❌ Incorrecto: (cualquier otra cosa)
   ```

3. **Service Role Key**: También debe empezar con `eyJ` pero es diferente a la anon key
   ```
   ✅ Correcto: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (diferente a anon key)
   ❌ Incorrecto: (igual a anon key o vacío)
   ```

---

## 🔄 Paso 6: Reiniciar el Servidor

**MUY IMPORTANTE**: Después de cambiar las variables de entorno:

1. **Detén el servidor** (Ctrl+C en la terminal)
2. **Reinicia el servidor**:
   ```bash
   npm run dev
   ```

Next.js solo carga las variables de entorno al iniciar, así que **debes reiniciar** después de cualquier cambio en `.env.local`.

---

## 🐛 Solución de Problemas

### Error 401 Persiste

1. **Verifica que copiaste la key completa**:
   - Las keys son MUY largas (cientos de caracteres)
   - Asegúrate de copiar desde el inicio hasta el final
   - No debe haber espacios o saltos de línea

2. **Verifica que reiniciaste el servidor**:
   ```bash
   # Detén el servidor (Ctrl+C)
   # Luego reinicia
   npm run dev
   ```

3. **Verifica que el archivo se llama exactamente `.env.local`**:
   - No `.env`
   - No `.env.local.txt`
   - Exactamente `.env.local`

4. **Verifica que estás usando la key correcta**:
   - Para login: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public)
   - NO uses `service_role` key en el frontend

### Error: "Supabase client is not configured"

Esto significa que las variables no se están cargando:

1. Verifica que el archivo `.env.local` está en la **raíz del proyecto** (mismo nivel que `package.json`)
2. Verifica que no hay errores de sintaxis (espacios extra, comillas, etc.)
3. Reinicia el servidor

### Error: "Invalid API key"

1. Ve a Supabase Dashboard → Settings → API
2. Verifica que estás copiando la key correcta:
   - `anon public` para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` para `SUPABASE_SERVICE_ROLE_KEY`
3. Si rotaste las keys recientemente, usa las nuevas

---

## 📸 Ubicación Visual en Supabase Dashboard

```
Supabase Dashboard
├── ⚙️ Settings (menú lateral)
│   └── 🔑 API
│       ├── Project URL → NEXT_PUBLIC_SUPABASE_URL
│       ├── anon public → NEXT_PUBLIC_SUPABASE_ANON_KEY
│       └── service_role → SUPABASE_SERVICE_ROLE_KEY
```

---

## ✅ Checklist Final

Antes de intentar hacer login de nuevo, verifica:

- [ ] Creé el archivo `.env.local` en la raíz del proyecto
- [ ] Copié `NEXT_PUBLIC_SUPABASE_URL` desde Supabase (con https://)
- [ ] Copié `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
- [ ] Copié `SUPABASE_SERVICE_ROLE_KEY` (service_role key)
- [ ] Agregué `ADMIN_EMAIL=Maycolljaramillo01@gmail.com`
- [ ] No hay espacios extra en el archivo `.env.local`
- [ ] Reinicié el servidor después de crear/editar `.env.local`
- [ ] El archivo se llama exactamente `.env.local` (no `.env`)

---

## 🆘 Si Aún No Funciona

1. **Verifica en la consola del navegador** qué URL está usando:
   - Abre DevTools (F12)
   - Ve a la pestaña Network
   - Intenta hacer login
   - Mira la petición que falla
   - Verifica que la URL sea correcta

2. **Verifica en la terminal del servidor**:
   - Debe mostrar que está cargando `.env.local`
   - No debe haber errores sobre variables faltantes

3. **Crea un usuario de prueba en Supabase**:
   - Ve a Authentication → Users
   - Crea un usuario manualmente
   - Intenta loguearte con ese usuario

---

## 📞 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Configuración de Variables de Entorno en Next.js](https://nextjs.org/docs/basic-features/environment-variables)

