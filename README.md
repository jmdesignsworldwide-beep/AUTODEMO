# 🚗 JM AUTO

Plataforma de **expediente de vehículo** con giros activables para el mercado automotriz dominicano.
No es un POS con módulos — la columna vertebral es el **vehículo**.

> Un vehículo entra. Algo le pasa. Sale. Alguien paga.

## Estado

**Tanda 0 — Cimientos.** Arranque de cero errores + prueba de vida (CRUD real contra Supabase).

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Framer Motion** (micro-interacciones)
- **Supabase** (Postgres + Storage privado)
- **Vercel** (despliegue)

## Fort Knox — desde la línea uno

- RLS + FORCE con **deny-all** en toda tabla desde su creación.
- `service_role` **solo en el servidor**, nunca con prefijo `NEXT_PUBLIC_`, marcada Sensitive en Vercel.
- Validación con **zod** en todo endpoint/acción del servidor.
- Headers de seguridad (CSP-ready, HSTS, X-Frame-Options, etc.).
- **Soft-delete** en toda tabla de negocio. Cero secretos en el repo.
- **Cero vulnerabilidades** en dependencias (`npm audit` limpio).

## Variables de entorno

Ver `.env.example`. Copiar a `.env.local` (nunca se sube al repo).

| Variable | Ámbito |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública (protegida por RLS) |
| `SUPABASE_SERVICE_ROLE` | **Secreta — solo servidor** |

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # chequeo de tipos
npm run build      # build de producción
```

## Migraciones

Se ejecutan vía Supabase Management API con un PAT temporal (protocolo PAT).
El SQL vive en `supabase/migrations/`. Nunca se corre SQL a mano en producción.

---

*Documento interno de demostración. No válido como comprobante fiscal.*
