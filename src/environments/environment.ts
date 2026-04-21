/**
 * @file environment.ts
 * @description Variables de entorno para desarrollo.
 *
 * firebaseConfig contiene las credenciales del proyecto Firebase.
 * Estos valores son públicos para apps web (se envían al navegador),
 * pero Firebase los protege mediante Security Rules y dominios autorizados.
 *
 * NUNCA subas environment.prod.ts a un repositorio público si contiene
 * claves de servicios de pago. Para este proyecto de prueba está bien.
 */
export const environment = {
  production: false,

  firebaseConfig: {
    apiKey: 'AIzaSyAeak-fm8qt0Se33sESxe9ou5eYYqK-hRc',
    authDomain: 'ionic-todo-cdee1.firebaseapp.com',
    projectId: 'ionic-todo-cdee1',
    storageBucket: 'ionic-todo-cdee1.firebasestorage.app',
    messagingSenderId: '236299290422',
    appId: '1:236299290422:web:4f8bba6b0cb85bb7b35597',
  },
};
