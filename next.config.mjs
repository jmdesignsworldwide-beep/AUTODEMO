/** @type {import('next').NextConfig} */

// Fort Knox — Pilar 5: Headers de seguridad (CSP, HSTS, X-Frame-Options, etc.)
// Desde la línea uno, no al final.
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // Cámara y micrófono se abrirán por giro (IA de recepción / voz) en tandas posteriores;
    // por ahora se permiten a 'self' para no bloquear esas capacidades más adelante.
    value: 'camera=(self), microphone=(self), geolocation=(self), payment=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
