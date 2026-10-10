// Firebase Console > Project settings > Your apps > Web app.
// Web configuration is public. Never put service-account keys here.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  appId: ""
};

// Optional local emulators; disabled on GitHub Pages by default.
export const emulatorConfig = { enabled: false, host: "127.0.0.1", authPort: 9099, databasePort: 9000 };

export function isFirebaseConfigured() {
  return ["apiKey", "authDomain", "databaseURL", "projectId", "appId"]
    .every(key => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim() !== "");
}
