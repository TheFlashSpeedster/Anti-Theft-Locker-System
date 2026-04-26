// ================================================================
//  FIREBASE CONFIGURATION
//  1. Go to https://console.firebase.google.com
//  2. Create a project → Add a web app → Copy the config below
//  3. Enable Realtime Database (Build → Realtime Database → Create)
//  4. Set rules to allow read/write (for dev):
//     { "rules": { ".read": true, ".write": true } }
//  5. Replace the placeholder values below with your actual config
// ================================================================

import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            "AIzaSyBAGL46OgK__ttTUscpszE6nwQLXsoN2Hc",
  authDomain:        "locker-system-02.firebaseapp.com",
  databaseURL:       "https://locker-system-02-default-rtdb.firebaseio.com",
  projectId:         "locker-system-02",
  storageBucket:     "locker-system-02.firebasestorage.app",
  messagingSenderId: "609051407775",
  appId:             "1:609051407775:web:18ba919be39061cce9f9aa"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
