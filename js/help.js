import { shell, bindShell } from './admin.js';
import { $, $$ } from './lib.js';

const SECTIONS = [
['conceptos', 'Palabras que vas a ver (glosario)', `
<dl class="gl">
<dt>Galería</dt><dd>Una carpeta con las fotos de una sesión, por ejemplo «Boda Juan y Pepa». Creas una galería por cada sesión.</dd>
<dt>Acceso</dt><dd>Una «puerta» para entrar a una galería. Cada acceso tiene su propio enlace, su propio PIN (opcional) y su propio límite de fotos. Una galería puede tener todos los accesos que quieras: los novios, los padres de él, los padres de ella… Todos ven las mismas fotos, pero cada uno elige las suyas.</dd>
<dt>Enlace</dt><dd>La dirección web que le mandas al cliente. Es larga y no se puede adivinar. Quien la tenga, puede entrar (y si hay PIN, necesita también el PIN).</dd>
<dt>PIN</dt><dd>Un número de 4 cifras (puedes cambiarlo al crearlo) que el cliente escribe al abrir el enlace. Es una segunda protección por si el enlace se reenvía a quien no debe.</dd>
<dt>Límite</dt><dd>Cuántas fotos puede elegir ese acceso sin pagar nada extra. Por ejemplo, 15.</dd>
<dt>Foto extra</dt><dd>Una foto elegida por encima del límite. Cada una cuesta lo que tú hayas puesto en la galería (por ejemplo, 8 €). Solo existe si lo permites.</dd>
<dt>Selección</dt><dd>El conjunto de fotos que ha elegido un cliente.</dd>
<dt>Enviar la selección</dt><dd>El botón final del cliente. Al pulsarlo, su selección queda cerrada (ya no puede cambiarla) y a ti te llega un aviso.</dd>
<dt>Marca de agua</dt><dd>El texto «RLC233» que se graba sobre cada foto al subirla, para que no se pueda usar sin tu permiso.</dd>
<dt>Previsualizar</dt><dd>Ver la galería exactamente como la ve un cliente, pero sin poder cambiar nada.</dd>
</dl>`],

['entrar', 'Entrar y salir del panel', `
<ol>
<li>Abre <b>rlc233.github.io</b> en tu navegador.</li>
<li>Escribe tu email y tu contraseña de administradora y pulsa <b>Entrar</b>.</li>
<li>Para salir, pulsa <b>Cerrar sesión</b> (arriba a la derecha). Hazlo siempre si usas un ordenador que no es tuyo.</li>
</ol>
<p>Si te equivocas con los datos, saldrá «Email o contraseña incorrectos». Si entras con una cuenta que no es de administradora, la web te lo dirá y te dejará fuera.</p>
<p class="tip">Los clientes <b>no</b> entran por aquí. Ellos usan siempre el enlace que tú les mandas.</p>`],

['principal', 'La pantalla principal (lista de galerías)', `
<p>Al entrar ves todas tus galerías en tarjetas. Cada tarjeta muestra:</p>
<ul>
<li>La <b>primera foto</b> como portada.</li>
<li>El <b>nombre</b>, cuántas <b>fotos</b> y <b>accesos</b> tiene, y si admite extras («Extra 8 €» o «Sin extras»).</li>
<li>Una <b>etiqueta de estado</b>: «Crea los accesos» (aún no hay ninguno), «Esperando selección» (hay accesos pero nadie ha enviado) o «1 de 3 selecciones enviadas».</li>
</ul>
<p>Arriba tienes el <b>buscador</b> (escribe parte del nombre) y el botón <b>+ Nueva galería</b>. Para entrar en una galería, haz clic en su tarjeta.</p>
<p>Abajo está la caja de <b>avisos</b> (te lo explico en su apartado).</p>`],

['crear', 'Crear una galería y subir las fotos', `
<ol>
<li>En la pantalla principal pulsa <b>+ Nueva galería</b>.</li>
<li><b>Nombre</b>: el que quieras, por ejemplo «Boda Juan y Pepa». Solo lo ves tú y lo ve el cliente en la parte de arriba de su galería.</li>
<li><b>Precio foto extra (€)</b>: lo que cuesta cada foto que el cliente elija por encima de su límite. Escribe solo números (admite coma o punto, y hasta 2 decimales: 8 o 8,50). <b>Si lo dejas vacío, esa galería no admite extras</b> y el cliente nunca podrá pasarse de su límite.</li>
<li><b>Fotos</b>: arrastra las fotos a la zona punteada o pulsa para elegirlas. Máximo <b>500 por galería</b>. Solo se aceptan imágenes (JPG, PNG…).</li>
<li>Pulsa <b>Crear galería</b> y espera. Verás una barra de progreso («Subiendo 184 de 312 fotos…»). <b>No cierres la pestaña</b> hasta que termine.</li>
</ol>
<h3>Qué hace la web con tus fotos</h3>
<ul>
<li>Las <b>reduce</b> (el lado más largo pasa a 1000 píxeles) y les graba la <b>marca de agua RLC233</b> antes de subirlas. Por eso tus originales nunca llegan a la web.</li>
<li>Las ordena <b>por el nombre del archivo</b> (IMG_1, IMG_2, IMG_10…). Si quieres un orden concreto, renombra los archivos antes de subirlos.</li>
<li>Se suben de 3 en 3 para ir rápido sin saturar tu conexión.</li>
</ul>
<h3>Si algo sale mal</h3>
<ul>
<li>Si alguna foto no se sube, te saldrá un aviso con los nombres. Puedes añadirlas después con <b>+ Añadir fotos</b>.</li>
<li>Puedes crear la galería <b>vacía</b> (sin fotos) y subirlas más tarde.</li>
</ul>`],

['galeria', 'Dentro de una galería (mapa de la pantalla)', `
<p>Al hacer clic en una galería ves, de arriba abajo:</p>
<ul>
<li><b>← Galerías</b>: vuelve a la lista.</li>
<li><b>El nombre</b>, cuántas fotos tiene y el precio del extra. A su derecha, dos botones: <b>Cambiar precio extra</b> y <b>Eliminar galería</b>.</li>
<li><b>Accesos</b> (a la izquierda): la lista de accesos ya creados.</li>
<li><b>Nuevo acceso</b> (a la derecha): el formulario para crear otro.</li>
<li><b>Fotos</b> (abajo): todas las fotos de la galería.</li>
</ul>
<h3>Cambiar el precio extra</h3>
<p>Pulsa <b>Cambiar precio extra</b>, escribe el nuevo precio y guarda. Si lo dejas <b>vacío</b>, la galería pasa a «Sin extras» y todos sus accesos dejan de permitirlos.</p>`],

['fotos', 'Ver, añadir y eliminar fotos', `
<ul>
<li><b>Ver una foto en grande</b>: haz clic en ella. Con las flechas (o las del teclado) pasas a la anterior o la siguiente; con la × o la tecla Esc la cierras.</li>
<li><b>Añadir fotos</b>: pulsa <b>+ Añadir fotos</b> y elige más. Se suman al final. El máximo sigue siendo 500 en total.</li>
<li><b>Eliminar varias fotos</b>: pulsa el botón de la papelera (<b>Eliminar fotos</b>). Se activa el modo selección: toca las fotos que quieras quitar (se marcan con ✓), o pulsa <b>Seleccionar todas</b>. Después pulsa <b>Eliminar</b> y confirma. Para salir sin borrar nada, pulsa <b>Cancelar</b>.</li>
</ul>
<p class="warn">Eliminar fotos no se puede deshacer. Además, si un cliente ya las había elegido, desaparecen también de su selección.</p>
<p class="tip">Las fotos de la galería ya llevan la marca de agua que tenían al subirse. Si cambias el estilo de la marca de agua, solo afecta a las fotos nuevas.</p>`],

['accesos', 'Crear un acceso', `
<p>Un acceso es lo que le das a cada persona. <b>No puedes crear accesos hasta que la galería tenga al menos una foto.</b></p>
<ol>
<li>En <b>Nuevo acceso</b>, escribe un <b>nombre</b> que te sirva para reconocerlo («Novios», «Padres de Juan»). El cliente también lo ve bajo el título de su galería.</li>
<li><b>Fotos a elegir</b>: pulsa uno de los números rápidos (7, 10, 15, 20, 30) o escribe el que quieras en <b>Otro número</b>. Debe estar entre 1 y el total de fotos de la galería. Solo se aceptan números.</li>
<li><b>PIN</b>: la web propone uno al azar. Puedes pulsar <b>Otro PIN</b> para cambiarlo o escribir el tuyo (solo cifras). <b>Si lo dejas vacío, el acceso no pide PIN</b>: entra cualquiera que tenga el enlace.</li>
<li><b>Permitir fotos extra</b> (solo aparece si la galería tiene precio de extra): márcalo si quieres que ese acceso pueda pasarse del límite pagando. Si lo marcas, puedes poner un <b>máximo de extras</b>; vacío significa sin tope.</li>
<li>Pulsa <b>Crear acceso</b>. Aparece en la lista de la izquierda.</li>
</ol>
<h3>Ejemplo</h3>
<p>Galería «Boda Juan y Pepa» con 312 fotos: acceso «Novios» con límite 30 y extras permitidos; acceso «Padres de Juan» con límite 15 y sin extras; acceso «Padres de Pepa» con límite 10. Las fotos se suben una sola vez.</p>
<p class="warn">Por ahora, un acceso ya creado <b>no se puede editar</b> (ni su límite ni su PIN). Si necesitas cambiarlos, elimina el acceso y crea otro. Ten en cuenta que al eliminar un acceso se pierde su selección.</p>`],

['mensaje', 'Mandarle el acceso al cliente', `
<p>En cada acceso de la lista pulsa <b>Copiar mensaje</b>. Se copia un texto ya preparado, con el nombre de la galería, el enlace, el PIN, cuántas fotos puede elegir y (si procede) el precio de los extras. Solo tienes que <b>pegarlo</b> en WhatsApp, email o donde quieras (clic derecho → Pegar, o Ctrl + V).</p>
<p>Si el navegador no deja copiar automáticamente, se abre una ventana con el texto para que lo copies a mano.</p>
<p class="tip">Cada acceso tiene su propio mensaje. No mandes el enlace de uno a otra persona, o tendrá sus mismas fotos elegidas y su mismo límite.</p>`],

['cliente', 'Qué ve y qué hace el cliente', `
<ol>
<li>Abre el enlace. Si hay PIN, lo escribe. (Con <b>5 PIN erróneos</b> seguidos, ese acceso se bloquea <b>15 minutos</b>.)</li>
<li>Ve las fotos en páginas de 24, con el contador arriba («7 de 15 elegidas»).</li>
<li>Pulsa una foto para verla en grande, con flechas para pasar a las demás.</li>
<li>Pulsa el círculo <b>+</b> de la foto (o «Elegir esta foto» en la vista grande) para elegirla. Pulsa otra vez para quitarla.</li>
<li>En <b>Mis fotos</b> (a la derecha, o más abajo en el móvil) ve las que lleva, puede abrirlas en grande y quitarlas con la ×.</li>
<li>Al llegar a su límite, <b>no puede elegir más</b> (tendrá que quitar alguna) salvo que tenga extras permitidos.</li>
<li>Cuando termina pulsa <b>Enviar mi selección</b>, confirma, y la selección queda cerrada.</li>
</ol>
<p>El límite lo controla el servidor: aunque alguien intente saltárselo con trucos, no se admite ni una foto más.</p>
<p class="tip">Si quieres ver todo esto con tus propios ojos, usa <b>Previsualizar</b>.</p>`],

['extras', 'Cómo funcionan las fotos extra', `
<ul>
<li>El extra es <b>por galería</b>: pones un precio (por ejemplo, 8 €) y se aplica a todos sus accesos que lo tengan activado.</li>
<li>Cuando un cliente con extras llega a su límite e intenta elegir otra foto, la web le pregunta: «Esta foto será un extra (+8 €). ¿Quieres añadirla?».</li>
<li>En «Mis fotos» ve el desglose: «Incluidas 15 / 15» y «Extras 2 × 8 € = 16 €».</li>
<li>Tú ves el total de cada acceso en su fila («18 elegidas (3 extra · 24 €)»).</li>
</ul>
<p class="warn">La web <b>no cobra nada</b>. Solo calcula cuánto es. El cobro lo haces tú por tu cuenta (Bizum, transferencia…).</p>`],

['selecciones', 'Recibir y revisar las selecciones', `
<ol>
<li>Cuando un cliente envía, te llega un <b>aviso</b> («Nueva selección · Boda Juan y Pepa · Padres de Juan») si tienes los avisos activados.</li>
<li>Entra en la galería. El acceso aparece con la etiqueta verde <b>Enviada</b>.</li>
<li>Pulsa <b>Ver selección</b>. Se abre una ventana con las miniaturas, el número de fotos, los extras a cobrar y los <b>nombres de archivo</b>.</li>
<li>Pulsa <b>Copiar lista de nombres</b> y pégala donde necesites (por ejemplo, para buscar esas fotos en tu programa de edición).</li>
</ol>
<h3>Si el cliente se equivoca o quiere cambiar algo</h3>
<p>En la fila del acceso pulsa <b>Reabrir</b> (solo aparece si ya envió). Podrá volver a modificar su selección y tendrá que pulsar de nuevo «Enviar mi selección».</p>`],

['preview', 'Previsualizar un acceso', `
<p>En la fila de cualquier acceso pulsa <b>Previsualizar</b>. Se abre una pestaña nueva con la galería tal como la ve ese cliente: sus fotos elegidas, su contador y sus extras, <b>sin pedir PIN</b>.</p>
<ul>
<li>Es de <b>solo lectura</b>: no puedes cambiar ni enviar nada, así que no hay riesgo de tocar su selección real.</li>
<li>Arriba hay un aviso con un enlace para <b>volver al panel</b>.</li>
<li>Necesitas tener tu sesión de administradora abierta; si no, verás un error 401.</li>
</ul>`],

['avisos', 'Avisos al móvil y al ordenador', `
<p>Sirven para enterarte al momento de que un cliente ha enviado su selección. En la pantalla principal, en la caja <b>Avisos de nuevas selecciones</b>:</p>
<ul>
<li><b>Activar avisos en este dispositivo</b>: el navegador te pedirá permiso. Pulsa <b>Permitir</b>. La etiqueta pasará a «Activados en este dispositivo».</li>
<li><b>Desactivar avisos</b>: aparece en lugar del anterior cuando están activos, y deja de avisarte en ese dispositivo.</li>
<li><b>Enviar aviso de prueba</b>: manda una notificación a todos tus dispositivos activados. Si te llega, todo está bien.</li>
</ul>
<p>Cada dispositivo (tu móvil, tu ordenador…) se activa por separado, desde ese mismo dispositivo.</p>
<h3>En iPhone</h3>
<p>Primero abre la web en Safari, pulsa el botón de compartir y elige <b>Añadir a pantalla de inicio</b>. Después abre la web desde ese icono y activa los avisos desde ahí. Hace falta iOS 16.4 o superior.</p>
<h3>Si no te llegan</h3>
<ul>
<li>Pulsa «Enviar aviso de prueba»: el mensaje que sale indica qué falla.</li>
<li>Comprueba que el navegador tenga las notificaciones en «Permitir» para la web (icono del candado, junto a la dirección).</li>
<li>Comprueba que tu móvil u ordenador no esté en «No molestar».</li>
</ul>`],

['eliminar', 'Eliminar cosas (y qué pasa con los enlaces)', `
<ul>
<li><b>Una foto o varias</b>: con la papelera de la sección Fotos. Se borran de la web y del almacenamiento.</li>
<li><b>Un acceso</b>: botón <b>Eliminar</b> de su fila. Se borran su enlace y su selección. Las fotos de la galería no se tocan.</li>
<li><b>Una galería entera</b>: botón <b>Eliminar galería</b>. Se borran todas sus fotos, accesos y selecciones.</li>
</ul>
<p class="warn">Nada de esto se puede deshacer, y la web siempre te pide confirmación antes.</p>
<h3>Qué ve alguien con un enlace que ya no existe</h3>
<p>Si un cliente abre el enlace de un acceso o una galería que has eliminado (desde un mensaje antiguo o el historial del navegador), verá una página <b>404</b> que dice que el enlace ya no está disponible. No ve nada de la galería.</p>`],

['seguridad', 'Seguridad y privacidad (buenas costumbres)', `
<ul>
<li><b>Tu contraseña</b> es la llave de todo. No la compartas y no la guardes en un ordenador que no sea tuyo. Cierra siempre la sesión en equipos ajenos.</li>
<li>El <b>enlace + PIN</b> son lo que protege cada galería. Manda cada uno solo a su destinatario.</li>
<li>Las galerías <b>no aparecen en buscadores</b>: solo se entra con el enlace.</li>
<li>Los clientes solo ven fotos reducidas y con marca de agua. Los <b>originales no están en la web</b>.</li>
<li>La web dificulta descargar o copiar las fotos (bloquea el clic derecho y el arrastrar), pero ninguna web puede impedir del todo una captura de pantalla. Por eso lo importante es la marca de agua y el tamaño reducido.</li>
<li>Si crees que un enlace se ha filtrado, <b>elimina ese acceso y crea otro</b>: el enlace anterior deja de funcionar al instante.</li>
</ul>`],

['limites', 'Límites, costes y mantenimiento', `
<ul>
<li>Máximo <b>500 fotos por galería</b>.</li>
<li>Cada foto reducida pesa unos 200-300 KB, así que una galería de 500 ocupa unos 100-150 MB. El almacenamiento (Cloudflare R2) tiene un uso gratuito mensual (10 GB según el plan actual), que da para decenas de galerías a la vez. Borra las galerías antiguas que ya no necesites para ir sobrada.</li>
<li>La base de datos (Supabase) y la web (GitHub Pages) también tienen planes gratuitos. Si tu proyecto de Supabase está en el plan gratuito y pasa mucho tiempo sin actividad, puede <b>pausarse</b>. Si un día la web carga pero no muestra datos, entra en supabase.com y reactívalo.</li>
<li>Revisa de vez en cuando tus paneles de Cloudflare y Supabase por si te avisan de algún cambio de condiciones.</li>
</ul>`],

['problemas', 'Problemas frecuentes y soluciones', `
<dl class="gl">
<dt>La página sale en blanco</dt><dd>Recarga forzando con <b>Ctrl + Shift + R</b>. Si sigue igual, es que se ha subido un archivo de la web a medias; avísame con lo que ponga la consola del navegador (F12).</dd>
<dt>No veo las fotos que he subido</dt><dd>Recarga con Ctrl + Shift + R. Si no aparecen, puede ser un problema de la configuración del almacenamiento de fotos; avísame.</dd>
<dt>No me deja crear un acceso</dt><dd>La galería tiene que tener al menos una foto, el límite debe estar entre 1 y el total de fotos, y no puedes activar extras si la galería no tiene precio de extra.</dd>
<dt>El cliente dice que el PIN no funciona</dt><dd>Mira el PIN en la fila de su acceso y comprueba que le mandaste el correcto. Si lo intentó 5 veces mal, espera 15 minutos o envíale otra vez el mensaje con «Copiar mensaje».</dd>
<dt>El cliente dice que el enlace no es válido</dt><dd>Puede que el enlace se cortara al copiarlo, o que el acceso se haya eliminado. Vuelve a pulsar «Copiar mensaje» y mándalo de nuevo.</dd>
<dt>El cliente ya envió pero quiere cambiar</dt><dd>Pulsa <b>Reabrir</b> en su acceso.</dd>
<dt>Un cliente no puede elegir más fotos</dt><dd>Ha llegado a su límite. Si quieres que pueda pagar extras, el acceso debe tener extras activados (y la galería, precio de extra). Como los accesos no se editan, tendrás que eliminarlo y crear otro con extras (o ponerle un límite mayor).</dd>
<dt>No me llegan los avisos</dt><dd>Mira el apartado «Avisos» de esta guía y usa el botón «Enviar aviso de prueba».</dd>
<dt>Me he equivocado al eliminar algo</dt><dd>No se puede recuperar. Tendrás que volver a subir las fotos o a crear el acceso.</dd>
</dl>`],

['nohace', 'Lo que esta web no hace (todavía)', `
<ul>
<li>No cobra: tú gestionas los pagos fuera de la web.</li>
<li>No entrega las fotos finales: tú las envías por tu cuenta.</li>
<li>No guarda los originales ni permite que el cliente descargue fotos.</li>
<li>No permite editar el límite ni el PIN de un acceso ya creado (hay que eliminarlo y crear otro).</li>
<li>No envía correos ni mensajes por sí sola: tú pegas el mensaje donde quieras.</li>
<li>Los clientes no tienen cuenta: entran siempre con enlace (y PIN si lo hay).</li>
</ul>`],
];

export function renderHelp(app) {
  const toc = SECTIONS.map(([id, title]) => `<button class="chip" data-t="${id}">${title}</button>`).join('');
  const secs = SECTIONS.map(([id, title, body], i) => `<details class="hsec" id="h-${id}"><summary>${i + 1}. ${title}</summary><div class="hbody">${body}</div></details>`).join('');
  app.innerHTML = shell(`
    <a class="btn ghost" href="#/">← Galerías</a>
    <h1 class="serif" style="margin:20px 0 8px">Ayuda</h1>
    <p class="muted" style="max-width:720px">Aquí se explica todo el panel desde cero, paso a paso y sin dar nada por sabido. Abre el apartado que necesites.</p>
    <section class="cd pad hquick"><h2 class="upper">Resumen en 6 pasos</h2>
      <ol>
        <li><b>Crea la galería</b> con su nombre, el precio del extra (o vacío si no hay) y las fotos.</li>
        <li><b>Espera</b> a que termine de subir las fotos, sin cerrar la pestaña.</li>
        <li><b>Entra en la galería y crea un acceso</b> para cada persona que vaya a elegir (nombre, número de fotos y PIN).</li>
        <li>Pulsa <b>Copiar mensaje</b> y pégalo en WhatsApp o en un email.</li>
        <li>Cuando el cliente pulse «Enviar mi selección», te llega un <b>aviso</b>.</li>
        <li>Entra en <b>Ver selección</b>, copia la lista de nombres y úsala para buscar las fotos. El cobro de los extras y la entrega de las fotos finales los haces tú.</li>
      </ol></section>
    <div class="hbar"><button class="btn ghost sm" id="hopen">Abrir todo</button><button class="btn ghost sm" id="hclose">Cerrar todo</button></div>
    <div class="chips htoc" style="margin:0 0 20px">${toc}</div>
    ${secs}`);
  bindShell();
  $('#hopen').onclick = () => $$('.hsec').forEach((d) => { d.open = true; });
  $('#hclose').onclick = () => $$('.hsec').forEach((d) => { d.open = false; });
  $$('.htoc .chip').forEach((b) => {
    b.onclick = () => {
      const d = $('#h-' + b.dataset.t);
      d.open = true;
      d.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });
}
