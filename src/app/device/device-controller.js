'use strict';

angular
  .module('scloader.device')
  .controller('DeviceCtrl', function ($scope, $window, socket) {
    var ds = $scope;
    ds.devices = [];
    ds.server = 0;

    socket.on("connect", function() {
      ds.server = 1;
      ds.getDevices();
    });
    socket.on("disconnect", function() {
      ds.server = 0;
    });
    socket.on('message',function(data){
      console.log(data);
    });
    // Receive Device List
    socket.on('devices', function(data){
      ds.devices = data;
      console.log(data);
    });
    socket.on('buffer', function(data){
      ds.devices[data.id].buffer += data.buffer;
    });
    socket.on('status', function(data){
      ds.devices[data.id].status = data.status;
    });
    ds.getDevices = function(){
      console.log('Calling Get Devices');
      socket.emit('getDevices');
    };

    ds.deviceCount = function(){
      return Object.keys(ds.devices).length;
    };

    ds.beginLoad = function(id){
      console.log('Telling server to begin load on '+id);
      socket.emit('beginLoad',{ id: id });
    };
    ds.shutdown = function(id){
      socket.emit('shutdown',{ id: id });
    };

  });
