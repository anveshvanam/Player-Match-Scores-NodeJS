const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertDbObjectPlayer = (objectItem) => {
  return {
    playerId: objectItem.player_id,
    playerName: objectItem.player_name,
  };
};
app.get("/players/", async (request, response) => {
  const getAllPlayersQuery = `select * from player_details;`;
  const getAllPlayersQueryResponse = await db.all(getAllPlayersQuery);
  response.send(
    getAllPlayersQueryResponse.map((eachPlayer) =>
      convertDbObjectPlayer(eachPlayer)
    )
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `select * from player_details where player_id = ${playerId};`;
  const getPlayerQueryResponse = await db.get(getPlayerQuery);
  response.send(convertDbObjectPlayer(getPlayerQueryResponse));
});

module.exports = app;

app.put("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `update player_details set player_name = '${playerName}' where player_id = ${playerId};`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

const convertMatchDB = (eachMatch) => {
  return {
    matchId: eachMatch.match_id,
    match: eachMatch.match,
    year: eachMatch.year,
  };
};

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `select * from match_details where match_id = ${matchId};`;
  const getMatchQueryResponse = await db.get(getMatchQuery);
  response.send(convertMatchDB(getMatchQueryResponse));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerQuery = `select match_id from player_match_score where 
  player_id = ${playerId};`;
  const getMatchesOfPlayer = await db.all(getMatchesOfPlayerQuery);
  const matchIdsArray = getMatchesOfPlayer.map((eachMatch) => {
    return eachMatch.match_id;
  });
  const getMatchDetailsQuery = `select * from match_details where match_id in (${matchIdsArray});`;
  const getMatchDetails = await db.all(getMatchDetailsQuery);
  response.send(getMatchDetails.map((eachMach) => convertMatchDB(eachMach)));
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
    SELECT
      *
    FROM player_match_score
      NATURAL JOIN player_details
    WHERE
      match_id = ${matchId};`;
  const playersArray = await db.all(getMatchPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) => convertDbObjectPlayer(eachPlayer))
  );
});

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScoresQuery = `select player_id as playerId, 
    player_name AS playerName,
    SUM(score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes
    FROM player_match_score
    NATURAL JOIN player_details
    WHERE
        player_id = ${playerId};`;
  const getPlayerScoresQueryResponse = await db.get(getPlayerScoresQuery);
  response.send(getPlayerScoresQueryResponse);
});

/*{
  playerId: 1,
  playerName: "Ram"
  totalScore: 3453,
  totalFours: 342,
  totalSixes: 98
}

*/

module.exports = app;
