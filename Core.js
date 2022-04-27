var exports = {
  Log: function (color, type, msg) {
    console.log(color('[' + type + '] ') + msg);
  },
}

module.exports = exports;