import { type Express } from "express";

/**
 * Configura middleware de seguridad para la aplicación Express
 * 
 * ARQUITECTURA DE SEGURIDAD:
 * - Rate Limiting: Implementado en nginx.conf (API Gateway)
 * - CSP: Implementado en nginx.conf (sirve frontend)
 * - Security Headers: Implementado aquí con configuración básica
 * - CORS: Solo si necesitas servir a clientes en otros dominios
 * 
 * NOTA: Este archivo provee security headers básicos para la API.
 * En producción con nginx, muchos headers ya están configurados en nginx.conf
 */
export function setupSecurity(app: Express) {
  // =====================================================
  // SECURITY HEADERS BÁSICOS
  // =====================================================
  
  // Headers básicos de seguridad para API JSON
  app.use((_req, res, next) => {
    // Prevenir MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Desactivar DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Protección contra XSS (legacy, pero algunos navegadores lo usan)
    res.setHeader('X-XSS-Protection', '0');
    
    next();
  });
}

/**
 * CORS - Solo habilitar si tienes clientes en otros dominios
 * 
 * Ejemplo de uso:
 * 
 * import cors from "cors";
 * 
 * export function setupCORS(app: Express) {
 *   const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
 *   
 *   app.use(cors({
 *     origin: (origin, callback) => {
 *       if (!origin) return callback(null, true); // Apps móviles, Postman
 *       if (allowedOrigins.includes(origin)) {
 *         callback(null, true);
 *       } else {
 *         callback(new Error('No permitido por CORS'));
 *       }
 *     },
 *     credentials: true,
 *     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
 *     allowedHeaders: ['Content-Type', 'Authorization'],
 *   }));
 * }
 * 
 * Luego en app.ts:
 * setupCORS(app); // Solo si necesitas
 */
