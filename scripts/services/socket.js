(function() {
  angular.module('services').factory('socket', function(socketFactory, Host, $window) {
    var myIoSocket, mySocket;
    myIoSocket = io.connect("" + (Host.getAPIHost()) + ":" + (Host.getAPIPort()) + "/hiin", {
      query: "token=" + $window.localStorage.getItem("auth_token"),
      'reconnection delay': 1000,
      'reconnection limit': 1000,
      'max reconnection attempts': 'Infinity'
    });
    mySocket = socketFactory({
      ioSocket: myIoSocket
    });
    return mySocket;
  });

}).call(this);
