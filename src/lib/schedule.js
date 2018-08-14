// let games =
// {
//   "2018-10-07": [{home: "DET", away:"GB"}, {home:"NYG", away:"PHI"}],
//   "2018-10-03": [{home: "SF", "away":"SEA"}, {home: "AZ", away: "LAR"}]
// }

import moment from 'moment-timezone';
import {games as gamesJSON} from "./2018-schedule-raw.json";

let games = {};

function getGamesForDate(gameDate) {
  return games[gameDate];
}

function getGames(startDate, endDate) {
  if (startDate === undefined) {
    //TODO: return today's
    const defaultDate = "2018-09-09"
    return getGamesForDate(moment(defaultDate).tz("America/New_York").format("YYYY-MM-DD"));
  }
  if (endDate === undefined) {
    return getGamesForDate(startDate);
  }
  //TODO, loop through all the dates in the range
  return getGamesForDate(startDate);
}

function init() {
  gamesJSON.map(game => {
    let awayTeamCode = game.schedule.awayTeam.abbreviation;
    let homeTeamCode = game.schedule.homeTeam.abbreviation;
    let startTime = game.schedule.startTime;
    startTime = moment(startTime).tz("America/New_York").format("YYYY-MM-DD"); // CONVERT TO EST
    games[startTime] = games[startTime] || [];
    const data = {
      awayTeamCode,
      homeTeamCode,
      gameDate: startTime
    }
    return games[startTime].push(data);
  })

  return {
    getGames,
    getGamesForDate
  }
}

export default init()