# ✅ Script de Verificación de API Keys

Este documento te ayuda a verificar que tus API keys están configuradas correctamente.

## 🔍 Verificación Manual

### 1. Verifica que el archivo existe

En la raíz de tu proyecto, debe existir el archivo `.env.local`:

```bash
# En la terminal, desde la raíz del proyecto:
ls -la .env.local

# O en Windows PowerShell:
Test-Path .env.local
```

### 2. Verifica el contenido (sin exponer las keys)

Abre `.env.local` y verifica que tiene este formato:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_EMAIL=Maycolljaramillo01@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Verifica que las keys no están vacías

Cada línea debe tener un valor después del `=`:

```env
✅ CORRECTO:
NEXT_PUBLIC_SUPABASE_URL=https://jlykjtgzdtdzrtmkdxrs.supabase.co

❌ INCORRECTO:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL= 
NEXT_PUBLIC_SUPABASE_URL=https://
```

### 4. Verifica la longitud de las keys

- **Anon Key**: Debe tener aproximadamente 200-300 caracteres
- **Service Role Key**: Debe tener aproximadamente 200-300 caracteres
- **URL**: Debe tener aproximadamente 40-50 caracteres

### 5. Verifica que no hay espacios

```env
✅ CORRECTO:
NEXT_PUBLIC_SUPABASE_URL=https://proyecto.supabase.co

❌ INCORRECTO:
NEXT_PUBLIC_SUPABASE_URL = https://proyecto.supabase.co  (espacios alrededor del =)
NEXT_PUBLIC_SUPABASE_URL=https://proyecto.supabase.co   (espacios al final)
```

---

## 🧪 Test Rápido

Crea un archivo temporal `test-keys.js` en la raíz del proyecto:

```javascript
// test-keys.js
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Verificando API Keys...\n');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;

console.log('URL:', url ? `✅ ${url.substring(0, 30)}...` : '❌ No configurada');
console.log('Anon Key:', anonKey ? `✅ ${anonKey.substring(0, 20)}...` : '❌ No configurada');
console.log('Service Key:', serviceKey ? `✅ ${serviceKey.substring(0, 20)}...` : '❌ No configurada');
console.log('Admin Email:', adminEmail ? `✅ ${adminEmail}` : '❌ No configurada');

if (url && !url.startsWith('https://')) {
  console.log('\n⚠️  ADVERTENCIA: URL debe empezar con https://');
}

if (anonKey && !anonKey.startsWith('eyJ')) {
  console.log('\n⚠️  ADVERTENCIA: Anon Key no parece válida (debe empezar con eyJ)');
}

if (serviceKey && !serviceKey.startsWith('eyJ')) {
  console.log('\n⚠️  ADVERTENCIA: Service Key no parece válida (debe empezar con eyJ)');
}

if (url && anonKey && serviceKey && adminEmail) {
  console.log('\n✅ Todas las variables están configuradas');
} else {
  console.log('\n❌ Faltan algunas variables');
}
```

Ejecuta:
```bash
node test-keys.js
```

**Nota**: Necesitas instalar `dotenv` primero:
```bash
npm install dotenv
```

---

## 🔄 Después de Verificar

1. **Elimina el archivo de test**:
   ```bash
   rm test-keys.js
   ```

2. **Reinicia el servidor**:
   ```bash
   # Detén con Ctrl+C
   npm run dev
   ```

3. **Intenta hacer login de nuevo**

---

## 📋 Formato Correcto del .env.local

```env
# Sin espacios, sin comillas, sin comentarios en la misma línea
NEXT_PUBLIC_SUPABASE_URL=https://jlykjtgzdtdzrtmkdxrs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imps...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imps...
ADMIN_EMAIL=Maycolljaramillo01@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

