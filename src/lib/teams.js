import teamsJSON from "./team-raw.json";

let teams = {};

function init() {
  return teamsJSON.map(team => {
    return teams[team.abr] = {
      fullName: team.city + " " + team.name,
      city: team.city,
      name: team.name,
      teamCode: team.abr,
      conf: team.conf,
      div: team.div
    }
  })
}

init()

export default teams