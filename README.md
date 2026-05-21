# Arequipa Alerta - Sistema de Reporte Ciudadano (GIS)

Este es un proyecto integral para el reporte y visualización de incidencias ciudadanas utilizando tecnologías de información geográfica (GIS). El sistema se compone de tres módulos principales: un **servidor backend (Node.js + PostgreSQL/PostGIS)**, una **aplicación móvil para ciudadanos (Flutter)** y un **panel de control web para autoridades (React + Leaflet)**.

---

## 🛠️ Estructura del Proyecto

El repositorio está estructurado de la siguiente manera:

```
Tesis/
├── backend/          # API REST en Node.js/Express y conexión a PostgreSQL (Neon)
├── app/              # Aplicación móvil en Flutter para el reporte de incidentes
├── Dashboard/        # Panel de administración web interactivo en React/Vite
└── README.md         # Documentación general del proyecto
```

---

## 🚀 Componentes del Sistema

### 1. Servidor Backend (`backend`)
API REST construida con Express.js que gestiona la lógica de negocio, autenticación e interacción geográfica con la base de datos.
* **Base de Datos**: PostgreSQL alojado en Neon con la extensión espacial **PostGIS** para el almacenamiento y consulta de datos espaciales.
* **Autenticación**: Integración con **Firebase Admin SDK** para verificar tokens de identidad y sincronización automática de usuarios en PostgreSQL. También cuenta con endpoints de autenticación local con JWT.
* **Documentación**: Documentación interactiva autogenerada con Swagger y renderizada mediante **Scalar** disponible en el endpoint `/api-docs`.
* **Endpoints Principales**:
  * `GET /`: Información básica de la API y endpoints disponibles.
  * `POST /auth/register`: Registro local de usuarios en la base de datos PostgreSQL.
  * `POST /auth/login`: Autenticación local y generación de JWT.
  * `GET /auth/me`: Obtención de datos del usuario autenticado (vía token de Firebase).
  * `GET /reportes`: Obtiene la lista de reportes con la ubicación geográfica formateada en GeoJSON (`ST_AsGeoJSON`).
  * `POST /reportes`: Creación de un reporte con inserción espacial utilizando `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`.

### 2. Aplicación Móvil (`app`)
Aplicación móvil nativa multiplataforma desarrollada en Flutter para que los ciudadanos reporten incidentes en tiempo real.
* **Localización**: Uso del paquete `geolocator` para obtener automáticamente la ubicación GPS (latitud y longitud) del dispositivo.
* **Seguridad**: Autenticación gestionada con **Firebase Authentication** y almacenamiento seguro de credenciales con `flutter_secure_storage`.
* **Formulario de Incidente**: Interfaz para reportar incidentes seleccionando:
  * **Categoría**: Robo, Asalto, Vandalismo, Extorsión, Alumbrado Deficiente, Infractructura Dañada.
  * **Urgencia**: Bajo, Medio, Alto.
  * **Detalles**: Descripción textual del incidente.
  * **GPS**: Ubicación exacta capturada automáticamente.

### 3. Panel de Control Web (`Dashboard`)
Dashboard interactivo web desarrollado con React y Vite diseñado para la visualización y análisis de los incidentes por parte de las autoridades.
* **Visualización Geográfica**: Mapa interactivo integrado con **Leaflet** y `react-leaflet`.
* **Marcadores Personalizados**: Iconos dinámicos en el mapa coloreados según el nivel de urgencia del incidente (Rojo: Alto, Naranja: Medio, Verde: Bajo) con animaciones de interacción (micro-animations).
* **Actualización en Tiempo Real**: Auto-polling integrado que actualiza la lista de reportes desde la API cada 10 segundos.
* **Búsqueda y Filtros**: Permite realizar búsquedas por texto en la descripción del incidente y filtrar por su nivel de urgencia.
* **Panel de Estadísticas**: Resumen cuantitativo rápido de incidentes totales y clasificados por prioridad.
* **Interactividad**: Al hacer clic en un reporte de la barra lateral, el mapa se desplaza suavemente (`pan/zoom`) hacia las coordenadas del incidente.

---

## 🗄️ Esquema de Base de Datos (PostgreSQL + PostGIS)

El sistema utiliza dos tablas principales en PostgreSQL:

### Tabla `usuarios`
Almacena el registro de los usuarios del sistema (ciudadanos y administradores).
* `id`: Identificador único (UUID o autoincremental).
* `nombre`: Nombre completo del usuario.
* `email`: Correo electrónico (único).
* `password`: Hash de la contraseña (o indicador de gestión por Firebase).
* `rol`: Rol del usuario (`ciudadano`, `operador`, etc.).
* `created_at`: Fecha de registro.

### Tabla `reportes`
Almacena los incidentes reportados, integrando datos espaciales.
* `id`: Identificador único del reporte.
* `usuario_id`: Relación con la tabla `usuarios`.
* `ubicacion`: Punto geográfico de tipo `GEOMETRY(Point, 4326)` (PostGIS).
* `direccion_aprox`: Dirección aproximada del lugar del incidente.
* `categoria`: Tipo de incidente (robo, asalto, vandalismo, etc.).
* `urgencia`: Nivel de urgencia (bajo, medio, alto).
* `descripcion`: Detalles del incidente.
* `estado`: Estado del reporte (por defecto `pendiente`).
* `created_at` / `updated_at`: Marcas de tiempo de creación y modificación.

---

## ⚙️ Configuración y Requisitos

### Requisitos Previos
* **Node.js** (v18 o superior recomendado)
* **Flutter SDK**
* **PostgreSQL** con la extensión **PostGIS** activa (ej. base de datos Neon)
* Proyecto configurado en **Firebase**

### Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
```env
DATABASE_URL=tu_conexion_postgresql_neon
JWT_SECRET=tu_secreto_para_firmar_jwt
PORT=3000
```

### Configuración de Firebase
1. **Backend**: Descarga el archivo de credenciales de tu cuenta de servicio de Firebase (`service-account-file.json`), renombralo como `serviceAccountKey.json` y colócalo en la carpeta `backend/`.
2. **Dashboard**: Asegúrate de que las credenciales de Firebase en `Dashboard/src/firebase.js` estén correctamente configuradas con los datos de tu proyecto web.
3. **App**: Añade los archivos de configuración correspondientes de Firebase (`google-services.json` para Android / `GoogleService-Info.plist` para iOS) en los directorios respectivos del proyecto Flutter.

---

## 🚀 Instrucciones de Ejecución

### 1. Iniciar el Backend
```bash
cd backend
npm install
npm start
```
*La API estará disponible en `http://localhost:3000`. Accede a la documentación interactiva en `http://localhost:3000/api-docs`.*

### 2. Iniciar el Dashboard Web
```bash
cd Dashboard
npm install
npm run dev
```
*El panel web se abrirá en `http://localhost:5173`.*

### 3. Ejecutar la Aplicación Móvil
```bash
cd app
flutter pub get
flutter run
```

---

## 🤝 Directrices de Contribución

Seguimos la especificación de **Conventional Commits** para mantener un historial limpio y legible:
* `feat`: Nueva funcionalidad.
* `fix`: Corrección de errores.
* `docs`: Cambios en la documentación.
* `chore`: Tareas de mantenimiento, configuración o actualización de dependencias.
* `refactor`: Cambios en el código que no añaden funcionalidades ni corrigen errores.

