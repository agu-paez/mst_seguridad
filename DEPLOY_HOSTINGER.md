# Despliegue en Hostinger

## 1) Construir la app frontend

Desde la carpeta del proyecto:

```bash
npm install
npm run build
```

Se generará la carpeta `dist/` con el frontend listo.

## 2) Subir al hosting

- Sube todo el contenido de `dist/` a la carpeta pública de tu hosting (por ejemplo, `public_html/`).
- Asegúrate de que exista el archivo `.htaccess` generado en `dist/` para que las rutas del router funcionen.

## 3) Backend

Esta app también tiene un backend en Node/Express y usa SQLite.

- Si tu plan de Hostinger permite Node.js, sube la carpeta `backend/` y el archivo `package.json` del proyecto.
- Ejecuta:

```bash
npm install
node backend/backend.js
```

## 4) Variables de entorno recomendadas

Puedes definir:

- `PORT`
- `JWT_SECRET`
- `CORS_ORIGIN`

## 5) Importante

Si tu plan es solo hosting estático, el frontend sí podrá subirse, pero el backend no funcionará sin un entorno Node compatible.
