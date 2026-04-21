/**
 * @file environment.prod.ts
 * @description Variables de entorno para producción.
 * ng build reemplaza environment.ts con este archivo al compilar con --prod.
 */
export const environment = {
  production: true,

  firebaseConfig: {
    apiKey: 'AIzaSyAeak-fm8qt0Se33sESxe9ou5eYYqK-hRc',
    authDomain: 'ionic-todo-cdee1.firebaseapp.com',
    projectId: 'ionic-todo-cdee1',
    storageBucket: 'ionic-todo-cdee1.firebasestorage.app',
    messagingSenderId: '236299290422',
    appId: '1:236299290422:web:4f8bba6b0cb85bb7b35597',
  },
};
