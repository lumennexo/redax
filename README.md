# REDAX · PWA

Frente estático (instalable) del generador de documentos del
Colegio Bertha Von Glumer «Arcoíris». Llama a la API de Apps Script (REDAX).

## Archivos
- index.html — la app (login + generador + envío)
- app.js — lógica; arriba está `API_URL` (tu /exec de Apps Script)
- manifest.webmanifest — datos de la app instalable
- sw.js — service worker (instalable + abre rápido)
- icons/ — íconos de la app

## Publicar en GitHub Pages
1. Sube estos archivos a la raíz de un repositorio público.
2. Settings → Pages → Deploy from a branch → main / (root) → Save.
3. Espera 1–2 min y abre la URL que te da GitHub.

## Notas
- Si cambias index.html o app.js, sube el número de `CACHE` en sw.js
  (redax-v1 → redax-v2) para que a todos les llegue la versión nueva.
- La seguridad es por llave (token). Crea una llave por coordinador en la
  hoja ROLES y activa CONFIG → exigir_rol_activo = sí.
