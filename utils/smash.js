const request = require("request");

const SmashApi = {
  callApi: function (call, id, expands = [], method = "get") {
    var self = this;
    return new Promise(function (fulfill, reject) {
      url =
        "https://api.smash.gg/" +
        call +
        "/" +
        id +
        (expands.length > 0 ? "?expand[]=" + expands.join("&expand[]=") : "");
      request({ url: url, method: method, encoding: "utf8" }, function (
        error,
        response,
        body
      ) {
        if (!error && response.statusCode == 200) {
          body = JSON.parse(body);
          if ("success" in body && !body.success) {
            console.log(body.message);
            reject(body.message);
          } else {
            fulfill(body);
          }
        } else {
          reject({ code: response.statusCode, error: error });
        }
      });
    });
  },
  tournament: function (slug, expands = ["phase", "groups"]) {
    var self = this;
    return new Promise(function (fulfill, reject) {
      self.callApi("tournament", slug, expands).then(fulfill, reject);
    });
  },
  phase: function (phaseId, expands = ["groups"]) {
    var self = this;
    return new Promise(function (fulfill, reject) {
      self.callApi("phase", phaseId, expands).then(fulfill, reject);
    });
  },
  phase_group: function (groupId, expands = ["sets", "entrants"]) {
    var self = this;
    return new Promise(function (fulfill, reject) {
      self.callApi("phase_group", groupId, expands).then(fulfill, reject);
    });
  },
  top_bracket: function (phaseId, expands = ["sets", "entrants"]) {
    var self = this;
    return new Promise(function (fulfill, reject) {
      self
        .callApi("phase", phaseId, ["groups"])
        .then((phase) => {
          let groupId = phase.entities.groups[0].id;
          self.callApi("phase_group", groupId, expands).then(fulfill, reject);
        })
        .catch(reject);
    });
  },
  search: function (options) {
    var self = this;
    return new Promise(function (fulfill, reject) {
      self
        .callApi(
          "public/tournaments",
          `schedule?filter=${JSON.stringify(options)}`
        )
        .then(fulfill, reject);
    });
  },
};

module.exports = SmashApi;
