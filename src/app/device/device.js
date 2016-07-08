angular.module('scloader.device', [])

// Sets up the socket connection and scope config
.factory('socket', function ($rootScope) {
  var host = '192.168.1.168';
  var port = '4000';
  var namespace = '/users';
  var socket = io.connect(host+':'+port+namespace);
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {  
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };

});
