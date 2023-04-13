import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { get, set, push, ref, onValue, off, update } from "firebase/database";
import { db } from "../../config/firebase";
import Cookies from "js-cookie";
import Messages from "../components/message";
import DanceText from "../components/textdance";
import Players from "../components/player";
import { handleAnonymousSignIn } from "../components/user";
import axios from "axios";
import Canvas from "../components/canvas";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

const GameRoom = () => {
  const router = useRouter();
  const axios = require("axios");
  const playerId = Cookies.get("playerId");
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);

  const gameCode = router.query.code;
  const [player, setPlayerData] = useState(null);
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState("");
  const [players, setPlayers] = useState({});
  const [timer, setTimer] = useState(0);
  const [gameData, setGameData] = useState({});

  const [timerAnimation, setTimerAnimation] = useState("");
  const [audio, setAudio] = useState(null);

  //sign in
  useEffect(() => {
    handleAnonymousSignIn();
  }, []);

  useEffect(() => {
    setAudio(new Audio("/tick.mp3"));
  }, []);

  //get game details
  const getGameDetails = (gameCode, callback) => {
    const gameRef = ref(db, `games/${gameCode}`);

    const unsubscribe = onValue(gameRef, (snapshot) => {
      const gameData = snapshot.val();
      if (gameData) {
        callback(gameData);
      }
    });

    return () => {
      off(gameRef);
    };
  };

  useEffect(() => {
    if (!gameCode) return;

    const unsubscribe = getGameDetails(gameCode, (data) => {
      setGameData(data);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  //api to get randowm words
  async function getWordsFromAPI(count) {
    try {
      const response = await fetch(`/api/${count}`);
      if (!response.ok) {
        throw new Error("Failed to fetch words");
      }
      const data = await response.json();
      const words = data.map((word) => word); // Directly use the 'data' variable as it's already an array of words
      return words;
    } catch (error) {
      console.error("Error fetching words:", error);
      return [];
    }
  }

  useEffect(() => {
    const playerRef = ref(db, `games/${gameCode}/players/${playerId}`);
    const listener = onValue(playerRef, (snapshot) => {
      setPlayerData(snapshot.val());
    });

    // cleanup function to detach listener when component unmounts
    return () => {
      off(playerRef, listener);
    };
  }, [gameCode, playerId]);

  const fetchPlayersData = async () => {
    const playersRef = ref(db, `games/${gameCode}/players`);
    const snapshot = await get(playersRef);
    setPlayers(snapshot.val());
  };

  useEffect(() => {
    if (!gameCode) return;
    fetchPlayersData();
  }, [gameCode]);

  const startRound = async () => {
    const settingsRef = ref(db, `games/${gameCode}/settings`);
    const settingsSnapshot = await get(settingsRef);
    const settings = settingsSnapshot.val();
    settings.roundNumber = settings.roundNumber + 1;
    if (settings.roundNumber <= settings.rounds) {
      settings.currentTimer = settings.timer;
      settings.phase = "selecting";
      selectRandomPlayer(players);
    } else {
      settings.phase = "over";
      settings.gameStatus = "ended";
    }
    await update(settingsRef, settings);
  };

  const startTimer = () => {
    // Other startTimer logic here

    const intervalId = setInterval(() => {
      setTimer((timer) => {
        const newTimer = timer - 1;
        if (newTimer === 0) {
          clearInterval(intervalId);
          const settingsRef = ref(db, `games/${gameCode}/settings`);
          update(settingsRef, { phase: "end" });
        } else {
          const currentTimerRef = ref(
            db,
            `games/${gameCode}/settings/currentTimer`
          );
          set(currentTimerRef, newTimer);
        }
        return newTimer;
      });
    }, 1000);
    return intervalId;
  };

  useEffect(() => {
    if (
      gameData &&
      gameData.settings &&
      gameData.settings.phase === "round" &&
      gameData.settings.currentTimer &&
      gameData.settings.currentTimer <= 10 &&
      gameData.settings.currentTimer > 0 &&
      audio
    ) {
      audio.play();
      setTimerAnimation("scaleUpDown");
    } else {
      setTimerAnimation("");
    }
  }, [gameData, audio]);

  useEffect(() => {
    if (gameData && gameData.settings && gameData.settings.phase === "end") {
      setAnsweredCorrectly(false);
    }
  }, [gameData]);

  const fetchWords = async (player) => {
    if (player && player.role === "drawer") {
      const data = await getWordsFromAPI(5);
      setWords(data);
    }
  };
  useEffect(() => {
    fetchWords(player);
  }, [player]);

  const handleWordSelection = (word) => {
    (async () => {
      await setSelectedWord(word);
      // Your next lines of code
    })();
    setCurrentWord(word);
  };

  const setSelectedWord = async (word) => {
    const currentWordRef = ref(db, `games/${gameCode}/settings/current_word`);
    const settingsRef = ref(db, `games/${gameCode}/settings`);
    const settingsSnapshot = await get(settingsRef);
    const settings = settingsSnapshot.val();
    settings.phase = "round";
    await update(settingsRef, settings);
    await set(currentWordRef, word);
    setTimer(settings.timer);
    startTimer();
  };

  const selectRandomPlayer = async () => {
    const playersRef = ref(db, `games/${gameCode}/players`);
    const snapshot = await get(playersRef);
    const players = snapshot.val();

    const creatorId = Object.keys(players).find(
      (id) => players[id].role === "creator"
    );

    const validPlayerIds = Object.keys(players).filter(
      (id) => id !== creatorId
    );

    let selectedPlayerId;
    do {
      const randomIndex = Math.floor(Math.random() * validPlayerIds.length);
      selectedPlayerId = validPlayerIds[randomIndex];
    } while (
      !players[selectedPlayerId]?.status ||
      players[selectedPlayerId]?.selectedPrevious
    );

    const selectedPlayerName = players[selectedPlayerId]?.name;

    // Update the role of the selected player to "drawer"
    const playerRef = ref(db, `games/${gameCode}/players/${selectedPlayerId}`);
    await update(playerRef, { role: "drawer", selectedPrevious: true });

    // Update the drawer field in the settings object with the name of the selected player
    const settingsRef = ref(db, `games/${gameCode}/settings`);
    const settingsSnapshot = await get(settingsRef);
    const settings = settingsSnapshot.val();
    settings.drawer = selectedPlayerName; // set the drawer field to the name of the selected player
    await update(settingsRef, settings);
  };

  const handleStartGame = async () => {
    const gameRef = ref(db, `games/${gameCode}`);
    const gameSnapshot = await get(gameRef);
    const game = gameSnapshot.val();
    for (const playerId in game.players) {
      if (game.players[playerId].role === "drawer") {
        game.players[playerId].role = "player";
      }
      game.players[playerId].score = 0;
    }
    game.settings.roundNumber = 0;
    game.settings.gameStatus = "started";
    await update(gameRef, game);
    startRound();
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const messageInput = e.target.elements.message;
    let messageText = messageInput.value.toLowerCase();
    if (messageText) {
      const currentWord = gameData?.settings?.current_word?.toLowerCase();
      const isCorrectAnswer = messageText === currentWord;
      let score = 0;

      if (isCorrectAnswer && gameData?.settings?.phase === "round") {
        score = gameData?.settings?.currentTimer;
        const playerRef = ref(db, `games/${gameCode}/players/${playerId}`);

        // Get the current player's score from the database
        const playerSnapshot = await get(playerRef);
        const playerData = playerSnapshot.val();

        // Update the player's score with the current timer value
        const updatedScore = playerData.score + score;
        await update(playerRef, { score: updatedScore });

        setAnsweredCorrectly(true);
        messageText = "Answered correctly!";
      }

      const timestamp = Date.now();
      let playerName = player.name;
      // Send the message to the server using Socket.IO
      const message = {
        name: playerName,
        text: messageText,
        time: timestamp,
      };
      socket.emit("sendMessage", message);

      // Clear the input field
      messageInput.value = "";
    }
  };

  const checkPhase = () => {
    if (
      gameData &&
      gameData.settings &&
      gameData.settings.phase === "end" &&
      gameData.players[playerId].role === "creator"
    ) {
      setTimeout(() => {
        startRound();
      }, 5000);
    }
  };

  useEffect(() => {
    checkPhase();
  }, [gameData]);

  return (
    <div className="game-room">
      <div className="players">
        <DanceText text={"PLAYERS"}></DanceText>
        <Players gameCode={gameCode} currentPlayerId={playerId}></Players>
      </div>
      <div className="drawing-canvas">
        <div className="confs">
          <div className="timer">
            <img src="/clock.png" height={50}></img>
            {gameData &&
              gameData.settings &&
              gameData.settings.currentTimer && (
                <span className={timerAnimation}>
                  {gameData.settings.currentTimer}
                </span>
              )}
          </div>
          {gameData && gameData.settings && gameData.settings.current_word && (
            <div className="current_word">
              {player.role === "drawer" ? (
                <>
                  <strong>Word:</strong> {currentWord}
                  <sup>({currentWord.length})</sup>
                </>
              ) : (
                <>
                  {gameData.settings.current_word
                    .split("")
                    .map((c) => (c === " " ? " " : "_"))
                    .join(" ")}
                  <sup>
                    ({gameData.settings.current_word.replace(/ /g, "").length})
                  </sup>
                </>
              )}
            </div>
          )}

          {player && player.role == "creator" && (
            <button className="btn btn-success" onClick={handleStartGame}>
              Start
            </button>
          )}
        </div>
        <div className="draw-area">
          {gameData &&
            gameData.settings &&
            (!gameData.settings.phase ||
              gameData.settings.phase !== "round") && (
              <div className="overlay">
                {gameData.settings.phase === "end" && (
                  <div className="end-round-overlay">
                    <div className="end-round-content">
                      <h2>Round ended!</h2>
                      <div className="scores-list">
                        {gameData?.settings?.current_word && (
                          <div>
                            <h1>
                              The word was{" "}
                              <span className="green">
                                {gameData.settings.current_word}
                              </span>
                            </h1>
                          </div>
                        )}

                        <table>
                          <tbody>
                            {Object.entries(gameData.players)
                              .sort(
                                ([, playerA], [, playerB]) =>
                                  parseInt(playerB.score, 10) -
                                  parseInt(playerA.score, 10)
                              )
                              .map(([id, { name, score }]) => (
                                <tr key={id}>
                                  <td>{name}</td>
                                  <td className={score > 0 ? "green" : "red"}>
                                    {score}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {gameData.settings.gameStatus === "ended" && (
                  <div className="end-round-overlay">
                    <div className="end-round-content">
                      <h2>Game over!</h2>
                      <div className="scores-list">
                        <table>
                          <tbody>
                            {Object.entries(gameData.players)
                              .sort(
                                ([, playerA], [, playerB]) =>
                                  parseInt(playerB.score, 10) -
                                  parseInt(playerA.score, 10)
                              )
                              .slice(0, 3) // only show the top 3 players
                              .map(([id, { name, score }]) => (
                                <tr key={id}>
                                  <td>{name}</td>
                                  <td>{score}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {gameData &&
                  gameData.settings &&
                  gameData.settings.gameStatus == "lobby" && (
                    <h3>Waiting for game to start</h3>
                  )}
                {player &&
                player.role == "drawer" &&
                gameData.settings.phase == "selecting" &&
                words &&
                words.length > 0 ? (
                  <div className="word-selection">
                    <h3>Select a word to draw:</h3>
                    <div className="buttons">
                      {words.map((word, index) => (
                        <button
                          key={index}
                          onClick={() => handleWordSelection(word)}
                          className="btn btn-outline-secondary"
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : gameData.settings &&
                  gameData.settings.phase == "selecting" ? (
                  <h3>{gameData.settings.drawer} is selecting a word</h3>
                ) : null}
              </div>
            )}
          <Canvas player={player} gameData={gameData}></Canvas>
        </div>
      </div>
      <div className="chat">
        <DanceText text={"CHAT"}></DanceText>
        <Messages></Messages>
        <form onSubmit={sendMessage} autoComplete="off">
          <input
            type="text"
            name="message"
            placeholder="Type your answer...."
            disabled={answeredCorrectly}
          />
        </form>
      </div>
      <style jsx>
        {`
          .game-room {
            display: flex;
            align-items: flex-start;
            justify-content: center;
            column-gap: 20px;
            width: 100vw;
            flex-wrap: wrap;
          }
          .draw-area {
            position: relative;
            z-index: 999;
          }
          .overlay {
            display: flex;
            height: 100%;
            width: 100%;
            align-items: center;
            justify-content: center;
            position: absolute;
            z-index: 1;
            background-color: rgba(0, 0, 0, 0.8);
            color: white;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 20px;
          }

          th,
          td {
            text-align: left;
            padding: 8px;
          }

          .score {
            font-weight: bold;
          }

          .name {
            margin-left: 10px;
          }

          .word-selection {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
          }
          .buttons {
            display: flex;
            align-items: center;
            width: fit-content;
            padding: 10px;
            justify-content: space-between;
            column-gap: 30px;
            z-index: 2;
          }
          button {
            color: white;
          }
          .timer {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .timer span {
            font-size: 12px;
            position: absolute;
            margin-top: 4px;
          }
          .timer span.scaleUpDown {
            animation: scaleUpDown 1s infinite;
          }
          @keyframes scaleUpDown {
            0%,
            100% {
              transform: scale(1);
            }
            50% {
              transform: scale(2);
            }
          }
          .confs {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 5px;
            margin-bottom: 10px;
            background-color: white;
            padding: 5px;
            box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
          }
          .players {
            max-height: 60vh;
            width: 250px;
            background-color: white;
            box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
          }
          .drawing-canvas {
            width: fit-content;
          }
          .green {
            color: green !important;
          }
          .red {
            color: red;
          }
          input {
            width: 250px;
            padding: 3px;
          }
          input:focus {
            outline: none;
            box-shadow: rgba(240, 46, 170, 0.4) 0px 5px,
              rgba(240, 46, 170, 0.3) 0px 10px, rgba(240, 46, 170, 0.2) 0px 15px,
              rgba(240, 46, 170, 0.1) 0px 20px,
              rgba(240, 46, 170, 0.05) 0px 25px;
          }
        `}
      </style>
    </div>
  );
};

export default GameRoom;
