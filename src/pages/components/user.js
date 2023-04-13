import styles from "../../styles/Home.module.css";
import DanceText from "./textdance";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { db, auth } from "../../config/firebase";
import { ref, get, set, update } from "firebase/database";
import { signInAnonymously } from "firebase/auth";
import { useRouter } from "next/router";

export const handleAnonymousSignIn = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    return user;
  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.error("Error signing in anonymously:", errorCode, errorMessage);
  }
};

const ProfilePictureSelector = ({ imageUrl, setImageUrl }) => {
  const [loading, setLoading] = useState(false);

  const handleLeftClick = () => {
    setLoading(true);
    const newImageUrl = `https://api.dicebear.com/6.x/lorelei/svg?seed=${Math.random()}`;
    setImageUrl(newImageUrl);
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  const handleRightClick = () => {
    setLoading(true);
    const newImageUrl = `https://api.dicebear.com/6.x/lorelei/svg?seed=${Math.random()}`;
    setImageUrl(newImageUrl);
    setTimeout(() => {
      setLoading(false);
    }, 200);
  };

  return (
    <div className={styles.pfpContainer}>
      <button
        onClick={handleLeftClick}
        type="button"
        className={styles.changebtn}
      >
        {"<"}
      </button>
      {loading ? (
        <img src="/loader.svg" alt="loader" height="150px" />
      ) : (
        <img src={imageUrl} alt="Profile picture" height="150px" />
      )}
      <button
        onClick={handleRightClick}
        type="button"
        className={styles.changebtn}
      >
        {">"}
      </button>
    </div>
  );
};

const User = ({ codeFound }) => {
  const [name, setName] = useState(Cookies.get("name") || "");
  const [imageUrl, setImageUrl] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (Cookies.get("imageUrl")) {
      setImageUrl(Cookies.get("imageUrl").toString());
    } else {
      setImageUrl(
        `https://api.dicebear.com/6.x/lorelei/svg?seed=${Math.random()}`
      );
    }
  }, []);

  const generateRandomCode = (length) => {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log("Copied to clipboard:", text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleCreateGame = async () => {
    if (name) {
      Cookies.set("name", name);
      Cookies.set("imageUrl", imageUrl);
      const code = generateRandomCode(8);
      const playerId = generateRandomCode(8);
      Cookies.set("gameCode", code);
      Cookies.set("playerId", playerId);
      const gameLink = `${window.location.origin}/${code}`;
      copyToClipboard(gameLink);
      const status = true;
      const user = await handleAnonymousSignIn();
      const role = 'creator';
      const gameStatus = 'waiting';
      const gameData = {
        players: {
          [playerId]: {
            name,
            imageUrl,
            status,
            role,
            messages:[]
          },
        },
        ['settings']: {
          gameStatus
        }
      };

      await set(ref(db, `games/${code}`), gameData);
      router.push(`/waiting/${code}`);
    } else {
      alert("Please enter your name");
    }
  };

  const handleJoinGame = async () => {
    if (name) {
      Cookies.set("name", name);
      Cookies.set("imageUrl", imageUrl);
      const user = await handleAnonymousSignIn();

      // Get the game code from the cookie
      const code = Cookies.get("gameCode");
      const status = true;
      

      // Fetch the game data from Realtime Database
      const gameRef = ref(db, `games/${code}`);
      const snapshot = await get(gameRef);

      let playerId = Cookies.get("playerId");
      const role = 'player';
      if (snapshot.exists()) {
        const gameData = snapshot.val();

        // Save the player's information to Realtime Database
        const newPlayer = { name, imageUrl, status, role, messages:[] };

        if (!playerId) {
          // If playerId doesn't exist, create a new one
          playerId = generateRandomCode(8);
          Cookies.set("playerId", playerId);
        }

        await update(ref(db, `games/${code}/players`), {
          [playerId]: newPlayer,
        });

        // Redirect the player to the waiting room
        router.push(`/waiting/${code}`);
      } else {
        alert("Invalid game code. Please try again.");
      }
    } else {
      alert("Please enter your name");
    }
  };

  return (
    <div className={styles.login}>
      <DanceText text="HASO KHELO" />
      <div className={styles.form}>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.input}
        />
        <br />
        <label>Select Profile</label>
        <ProfilePictureSelector imageUrl={imageUrl} setImageUrl={setImageUrl} />
        <br />
        {codeFound && (
          <button
            onClick={handleJoinGame}
            className={`${styles.btn} ${styles.join}`}
          >
            Join game
          </button>
        )}
        <br />
        <button
          onClick={handleCreateGame}
          className={`${styles.btn} ${styles.create}`}
        >
          Create Game
        </button>
      </div>
      <div></div>
    </div>
  );
};

export default User;
