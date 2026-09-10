# KIA · Revisión de Entrega de Autos

App móvil-first para el checklist de entrega de vehículos en agencia (React + Vite + Tailwind CSS + Lucide Icons).

## Desarrollo local / Codespaces

```bash
npm install
npm run dev
```

Abre la URL que indique la terminal (en Codespaces, la pestaña **Ports** mostrará el puerto 5173 reenviado automáticamente).

## Compilar para producción

```bash
npm run build
npm run preview
```

## Estructura

```
src/
  App.jsx      -> toda la lógica y UI del checklist
  main.jsx     -> punto de entrada de React
  index.css    -> Tailwind + estilos base
```

## Siguiente paso (integración)

En `handleSubmit` dentro de `App.jsx` hay un `console.log(payload)` con la
estructura completa (responsable, fecha, fotos, checklist). Ese es el punto
donde conectar tu API/backend real (fetch/axios) para guardar la revisión.
