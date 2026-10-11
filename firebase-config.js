// Firebase Console > Project settings > Your apps > Web app.
// Web configuration is public. Never put service-account keys here.
export const firebaseConfig = {
  apiKey: "AIzaSyCsFSgd6LenOEOMKpZp67NNqA96XvU31L0",
  authDomain: "adoapp-858f7.firebaseapp.com",
  databaseURL: "https://adoapp-858f7-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "adoapp-858f7",
  appId: "1:1001896904948:web:b2fd0c8969f86cfe4ff6a1"
};

// Optional local emulators; disabled on GitHub Pages by default.
export const emulatorConfig = { enabled: false, host: "127.0.0.1", authPort: 9099, databasePort: 9000 };

export function isFirebaseConfigured() {
  return ["apiKey", "authDomain", "databaseURL", "projectId", "appId"]
    .every(key => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim() !== "");
}
