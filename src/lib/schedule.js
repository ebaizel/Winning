let gamesByDate =
{
  "2018-10-02": [{home: "DET", away:"GB"}, {home:"NYG", away:"PHI"}],
  "2018-10-03": [{home: "SF", "away":"SEA"}, {home: "AZ", away: "LAR"}]
}

function getGamesForDate(gameDate) {
  return gamesByDate[gameDate];
}

function getGames(startDate, endDate) {
  if (startDate === undefined) {
    //TODO: return today's
    return getGamesForDate("2018-10-02");
  }
  if (endDate === undefined) {
    return getGamesForDate(startDate);
  }
  //TODO, loop through all the dates in the range
  return getGamesForDate(startDate);
}

function init() {
  // Add the eventDate to the game
  Object.entries(gamesByDate).map(function(gameDate) {
    const eventDate = gameDate[0];
    return gameDate[1].map(game => {
      return Object.assign(game, {gameDate: eventDate});
    });
  });

  return {
    getGames,
    getGamesForDate
  }
}

export default init()