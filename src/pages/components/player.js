import { useState, useEffect } from "react";
import {
  query,
  ref,
  orderByChild,
  equalTo,
  onValue,
  child,
  get,
  set,
} from "firebase/database";
import { db } from "../../config/firebase";
const Player = ({ player }) => {
  return (
    <div className="player">
      <img className="playerimage" src={player.imageUrl} alt="Profile" />
      <div className="col">
        <span>{player.name}</span>
        {player.score && (
          <span>
            <b>Score: </b>
            {player.score}
          </span>
        )}
      </div>
      <style jsx>
        {`
          .player {
            display: flex;
            align-items: center;
            background: white;
            width: 250px;
            min-height: 100px;
            padding: 10px;
            box-shadow: rgba(50, 50, 93, 0.25) 0px 2px 5px -1px,
              rgba(0, 0, 0, 0.3) 0px 1px 3px -1px;
            cursor: pointer;
            transition: all 500ms;
          }
          .col {
            display: flex;
            flex-direction: column;
          }
          .player:hover {
            box-shadow: rgba(0, 0, 0, 0.19) 0px 10px 20px,
              rgba(0, 0, 0, 0.23) 0px 6px 6px;
          }
          .playerimage {
            height: 100px;
          }
        `}
      </style>
    </div>
  );
};

const Players = ({ gameCode, currentPlayerId }) => {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    // Create a listener for changes to the players node
    const playersRef = query(
      ref(db, `games/${gameCode}/players`),
      orderByChild("status"),
      equalTo(true)
    );

    const updatePlayerStatus = async (status) => {
      if (currentPlayerId) {
        await set(
          child(ref(db), `games/${gameCode}/players/${currentPlayerId}/status`),
          status
        );
      }
    };

    const checkAndSetActivePlayer = async () => {
      if (currentPlayerId) {
        const playerRef = child(
          ref(db),
          `games/${gameCode}/players/${currentPlayerId}`
        );
        const playerSnapshot = await get(playerRef);
        if (playerSnapshot.exists()) {
          updatePlayerStatus(true);
        }
      }
    };

    checkAndSetActivePlayer();

    // Add event listener for visibilitychange event
    document.addEventListener("visibilitychange", () =>
      updatePlayerStatus(document.hidden ? false : true)
    );

    const unsubscribe = onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert the players object to an array
        const playersArray = Object.keys(data).map((key) => {
          return {
            ...data[key], // Spread the player properties
            id: key,
          };
        });
        setPlayers(playersArray);
      }
    });

    // Clean up the Firebase listener
    return () => {
      document.removeEventListener("visibilitychange", () =>
        updatePlayerStatus(document.hidden ? false : true)
      );
      unsubscribe();
    };
  }, [gameCode]);

  return (
    <div className="playersDiv">
      {players
        .sort((a, b) => {
          if (a.score && b.score) {
            return b.score - a.score;
          } else if (a.score || b.score) {
            return a.score ? -1 : 1;
          } else {
            return a.name.localeCompare(b.name);
          }
        })
        .map((player) => (
          <Player key={player.id} player={player} />
        ))}

      <style jsx>
        {`
          .playersDiv {
            display: flex;
            align-items: center;
            justify-content: center;
            row-gap: 10px;
            column-gap: 10px;
            flex-wrap: wrap;
            overflow-y: auto;
            padding: 10px;
          }
        `}
      </style>
    </div>
  );
};
export default Players;
