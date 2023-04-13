import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA7WOfVOw3Suce9GCEIXNfdx4WUKKWwWS4",
  authDomain: "skribble-d4156.firebaseapp.com",
  databaseURL: "https://skribble-d4156-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "skribble-d4156",
  storageBucket: "skribble-d4156.appspot.com",
  messagingSenderId: "348388261672",
  appId: "1:348388261672:web:0b8f004b8da9c75f0b5a1d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

export { db,auth };