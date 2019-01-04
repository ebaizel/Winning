// let games =
// {
//   "2018-10-07": [{home: "DET", away:"GB"}, {home:"NYG", away:"PHI"}],
//   "2018-10-03": [{home: "SF", "away":"SEA"}, {home: "AZ", away: "LAR"}]
// }

import moment from 'moment-timezone';
import {games as gamesJSON} from "./2018-schedule-raw.json";

let games = {};
let gamesByWeek = {};

function getGamesForDate(gameDate) {
  return games[gameDate];
}

function getGamesByWeek(weekNumber) {
  if (weekNumber === undefined) {
    return gamesByWeek;
  }
  return gamesByWeek[weekNumber];
}

function getGames(startDate, endDate) {
  if (startDate === undefined) {
    // return today's games
    const defaultDate = moment();
    return getGamesForDate(moment(defaultDate).tz("America/New_York").format("YYYY-MM-DD"));
  }
  if (endDate === undefined) {
    return getGamesForDate(startDate);
  }
  //TODO, loop through all the dates in the range
  return getGamesForDate(startDate);
}

function init() {
  const today = moment().tz("America/New_York");
  gamesJSON.map(game => {
    let startTime = game.schedule.startTime;
    if (today.isAfter(startTime)) {
      // COMMENTED OUT SO WE CAN SEE THE FULL SET OF 2018 GAMES
      // return null;
    }
    let week = game.schedule.week;
    let awayTeamCode = game.schedule.awayTeam.abbreviation;
    let homeTeamCode = game.schedule.homeTeam.abbreviation;
    startTime = moment(startTime).tz("America/New_York").format("YYYY-MM-DD"); // CONVERT TO EST
    games[startTime] = games[startTime] || [];
    gamesByWeek[week] = gamesByWeek[week] || {firstGameDate: startTime, games: []};
    const data = {
      awayTeamCode,
      homeTeamCode,
      gameDate: startTime
    }
    gamesByWeek[week].games.push(data);
    return games[startTime].push(data);
  })

  return {
    getGames,
    getGamesByWeek,
    getGamesForDate
  }
}

export default init()