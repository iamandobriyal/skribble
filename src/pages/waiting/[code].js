import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ref, onValue, get, update, off } from "firebase/database";
import { db } from "../../config/firebase";
import Cookies from "js-cookie";
import DanceText from "../components/textdance";
import Players from "../components/player";
import { handleAnonymousSignIn } from "../components/user";

const Settings = ({ gameCode }) => {
  const router = useRouter();
  const [drawTimer, setDrawTimer] = useState("");
  const [numberOfRounds, setNumberOfRounds] = useState("");

  const startGame = async () => {
    if (drawTimer && numberOfRounds) {
      const settings = {
        timer: drawTimer,
        rounds: numberOfRounds,
        gameStatus: "lobby",
      };
      await update(ref(db, `games/${gameCode}/settings`), settings);
      router.push(`/gameroom/${gameCode}`);
    } else {
      alert("Please enter timer and rounds");
    }
  };
  return (
    <div className="settings">
      <h1>Settings</h1>
      <form>
        <label>
          Draw Timer
          <input
            type="number"
            value={drawTimer}
            onChange={(e) => setDrawTimer(e.target.value)}
          />
        </label>
        <label>
          Rounds
          <input
            type="number"
            value={numberOfRounds}
            onChange={(e) => setNumberOfRounds(e.target.value)}
          />
        </label>
        <button type="button" className="startbtn" onClick={startGame}>
          Start
        </button>
      </form>
      <br />
      <style jsx>{`
        .settings {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .startbtn {
          width: 120px;
          height: 40px;
          background-color: green;
          border: none;
          color: white;
          transition: all 300ms;
        }
        .startbtn:hover {
          transform: scale(0.9);
          box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
        }
        form {
          display: flex;
          gap: 10px;
          margin-top: 5px;
          align-items: flex-end;
        }
        label {
          display: flex;
          flex-direction: column;
          text-align: center;
        }
        input {
          height: 30px;
          width: 80px;
          border: none;
          border-bottom: 1px solid black;
          text-align: center;
          font-size: 18px;
        }
        input:focus {
          outline: none;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
};

function GameLink({ gameLink }) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(gameLink);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  }

  return (
    <div onClick={copyToClipboard} className="gamelink">
      Invite link: {gameLink}
      {copied && (
        <span style={{ marginLeft: "10px" }}>Link copied to clipboard!</span>
      )}
      <style jsx>
        {`
          .gamelink {
            min-height: 40px;
            width: fit-content;
            margin: auto;
            padding: 10px;
            border: 1px dotted green;
            cursor: pointer;
          }
          .gamelink:hover {
            color: blue;
          }
        `}
      </style>
    </div>
  );
}

const WaitingPage = () => {
  const router = useRouter();
  const gameCode = router.query.code;
  const gameLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/${gameCode}`
      : "";
  const [gameStatus, setGameStatus] = useState(null);
  const currentPlayerId = Cookies.get("playerId");

  const [player, setPlayer] = useState(null);


  useEffect(() => {
    handleAnonymousSignIn();
  }, []);

  useEffect(() => {
    const gameSettingsRef = ref(db, `games/${gameCode}/settings`);

    const handleGameStatusChange = (snapshot) => {
      if (snapshot.exists()) {
        const { gameStatus } = snapshot.val();
        setGameStatus(gameStatus);
      }
    };

    // Set up the real-time listener
    onValue(gameSettingsRef, handleGameStatusChange);

    return () => {
      // Clean up the listener when the component is unmounted
      off(gameSettingsRef, "value", handleGameStatusChange);
    };
  }, [gameCode]);

  useEffect(() => {
    if (gameStatus === "lobby" || gameStatus === "started") {
      router.push(`/gameroom/${gameCode}`);
    }
  }, [gameStatus, router, gameCode]);

  useEffect(() => {
    const fetchPlayer = async () => {
      const playerref = ref(db, `games/${gameCode}/players/${currentPlayerId}`);
      const snapshot = await get(playerref);
      if (snapshot.exists()) {
        setPlayer(snapshot.val());
      }
    };

    if (currentPlayerId) {
      fetchPlayer();
    }
  }, [gameCode, currentPlayerId]);

  return (
    <div className="waitingRoom">
      <DanceText text="HASO KHELO" />
      <h1>Waiting for players to join</h1>
      <br />
      <GameLink gameLink={gameLink} />
      <br />
      {player && player.role === "creator" && <Settings gameCode={gameCode} />}
      <Players gameCode={gameCode} currentPlayerId={currentPlayerId}></Players>
      <style jsx>{`
        .waitingRoom {
          min-width: fit-content;
          max-width: 75%;
          margin: auto;
          background: white;
          padding: 20px;
          box-shadow: rgba(50, 50, 93, 0.25) 0px 13px 27px -5px,
            rgba(0, 0, 0, 0.3) 0px 8px 16px -8px;
        }
        .waitingRoom h1 {
          text-align: center;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
};

export default WaitingPage;
