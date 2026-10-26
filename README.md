# RLC233 · Galerías para clientes

Web privada de **RLC233**, fotógrafa, para compartir las fotos de cada sesión con sus clientes y que ellos elijan las que quieren recibir.

> Este repositorio contiene solo el código de la web. Las galerías, las fotos y los datos de los clientes no forman parte de él.

## Qué hace

- **Una galería por sesión**, con hasta 500 fotos.
- **Accesos por enlace privado.** Cada galería puede tener varios accesos (por ejemplo, los novios o sus familias), cada uno con su propio enlace, su propio límite de fotos y, si se quiere, un PIN.
- **Selección guiada.** El cliente recorre las fotos por páginas, las amplía, elige las que quiere y puede quitarlas desde el apartado "Mis fotos". El límite lo impone la base de datos, no solo la pantalla.
- **Fotos extra opcionales**, a un precio fijo por foto definido en cada galería. Las galerías sin precio no admiten extras.
- **Envío de la selección.** Al enviarla queda cerrada y RLC233 recibe un aviso en el móvil.
- **Panel de administración** privado para crear galerías, subir fotos, generar accesos y consultar las selecciones.

## Cómo está hecho

| Parte | Tecnología |
|---|---|
| Web | HTML, CSS y JavaScript sin frameworks ni paso de compilación, publicada con GitHub Pages |
| Base de datos y usuarios | Supabase (PostgreSQL con reglas de seguridad por fila, autenticación y Edge Functions) |
| Almacenamiento de fotos | Cloudflare R2 |
| Avisos al móvil | Web Push |

## Privacidad y seguridad

- Las galerías no son públicas ni aparecen en buscadores. Solo se entra con un enlace privado que no se puede adivinar, y opcionalmente con un PIN.
- Las fotos que se muestran son versiones reducidas con una marca de agua incrustada en la propia imagen. Los originales no se suben a la web.
- Los clientes no tienen acceso directo a la base de datos. Solo pueden hacer las operaciones permitidas sobre su propio acceso, y todas se validan en el servidor.
- Las claves privadas no están en este repositorio. Se guardan como secretos en el servicio de backend. La clave pública de Supabase que aparece en la configuración está diseñada para ser pública.

## Estructura

```
index.html            Página única de la web
css/                  Estilos
js/                   Panel de administración, vista del cliente y utilidades
icons/                Iconos de la aplicación
sw.js                 Recepción de avisos
supabase/functions/   Funciones del servidor (subida y borrado de fotos, envío de selección)
```

## Estado y licencia

Proyecto personal en uso, que no acepta contribuciones.

© RLC233. Todos los derechos reservados.